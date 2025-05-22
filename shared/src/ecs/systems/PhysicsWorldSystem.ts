// import * as CANNON from 'cannon-es';
import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import { world as ecsWorld } from '../world';
import { GameEntity, VehicleType, DroneSettings, PlaneSettings, CollisionGroups, collisionMasks, EntityType, PhysicsComponent, WeaponComponent, ProjectileType, CollisionType, CollisionSeverity, TransformBuffer, TransformComponent } from '../types';
import { Vector3, Quaternion, Mesh } from '@babylonjs/core';
/**
 * Creates a system that manages the physics world for both client and server using Rapier
 */
export function createPhysicsWorldSystem(
    isServer: boolean
) {
    const world = new RAPIER.World({ x: 0, y: -9.82, z: 0 });
    world.timestep = 1 / 60;
    const eventQueue = new RAPIER.EventQueue(true);

    // Rapier doesn't use materials like Cannon, so we skip material setup

    // Map to track which bodies belong to which entities
    const entityBodies = new Map<string, RAPIER.RigidBody>();
    const entityColliders = new Map<string, RAPIER.Collider[]>();

    let currentTick = 0;

    // Helper to apply Rapier body transform to ECS entity
    const applyBodyTransform = (entity: GameEntity) => {
            const body = entity.physics?.body;
            if (!body) return;
        const translation = body.translation();
        const rotation = body.rotation();
        const linvel = body.linvel();
        const angvel = body.angvel();
        entity.transform!.position.x = translation.x;
        entity.transform!.position.y = translation.y;
        entity.transform!.position.z = translation.z;
        entity.transform!.rotation.x = rotation.x;
        entity.transform!.rotation.y = rotation.y;
        entity.transform!.rotation.z = rotation.z;
        entity.transform!.rotation.w = rotation.w;
        entity.transform!.velocity.x = linvel.x;
        entity.transform!.velocity.y = linvel.y;
        entity.transform!.velocity.z = linvel.z;
        entity.transform!.angularVelocity.x = angvel.x;
        entity.transform!.angularVelocity.y = angvel.y;
        entity.transform!.angularVelocity.z = angvel.z;
    };

    // --- Collision event handling ---
    function determineCollisionType(
        entityA?: GameEntity,
        entityB?: GameEntity
    ): CollisionType {
        // If either is a projectile
        if (entityA?.type === EntityType.Projectile) {
            if (entityB?.type === EntityType.Vehicle) return CollisionType.ProjectileVehicle;
            if (entityB?.type === EntityType.Environment) return CollisionType.ProjectileEnvironment;
            if (entityB?.type === EntityType.Flag) return CollisionType.ProjectileFlag;
            return CollisionType.ProjectileOther;
        }
        if (entityB?.type === EntityType.Projectile) {
            if (entityA?.type === EntityType.Vehicle) return CollisionType.ProjectileVehicle;
            if (entityA?.type === EntityType.Environment) return CollisionType.ProjectileEnvironment;
            if (entityA?.type === EntityType.Flag) return CollisionType.ProjectileFlag;
            return CollisionType.ProjectileOther;
        }
        // Fallbacks for other types
        if (entityA?.type === EntityType.Vehicle && entityB?.type === EntityType.Vehicle) return CollisionType.VehicleVehicle;
        if (entityA?.type === EntityType.Flag || entityB?.type === EntityType.Flag) return CollisionType.VehicleFlag;
        if (entityA?.type === EntityType.Environment || entityB?.type === EntityType.Environment) return CollisionType.VehicleEnvironment;
        return CollisionType.Unknown;
    }

    function determineCollisionSeverity(impactVelocity: number): CollisionSeverity {
        const absVelocity = Math.abs(impactVelocity);
        if (absVelocity >= 15) return CollisionSeverity.Heavy;
        if (absVelocity >= 10) return CollisionSeverity.Medium;
        return CollisionSeverity.Light;
    }

    function handleCollisionEvent(entityA: GameEntity, entityB: GameEntity, event: {
        type: CollisionType,
        severity: CollisionSeverity,
        bodyA: RAPIER.RigidBody | undefined,
        bodyB: RAPIER.RigidBody | undefined,
        impactVelocity: number,
        contactPoint?: Vector3,
        normal?: Vector3,
        timestamp: number
    }) {
        // Handle vehicle collisions
        if (entityA.type === EntityType.Vehicle) {
            handleVehicleCollision(entityA, entityB, event);
        }
        if (entityB.type === EntityType.Vehicle) {
            handleVehicleCollision(entityB, entityA, event);
        }
        // Handle projectile collisions
        if (entityA.type === EntityType.Projectile) {
            handleProjectileCollision(entityA, entityB, event);
        }
        if (entityB.type === EntityType.Projectile) {
            handleProjectileCollision(entityB, entityA, event);
        }
        // Handle flag collisions
        if (entityA.gameState?.hasFlag) {
            handleFlagCollision(entityA, entityB, event);
        }
        if (entityB.gameState?.hasFlag) {
            handleFlagCollision(entityB, entityA, event);
        }
    }

    // --- ECS collision handlers (ported from old CollisionSystems) ---
    function handleVehicleCollision(vehicle: GameEntity, other: GameEntity, event: any) {
        if (!vehicle.gameState?.health) return;
        let damage = 0;
        switch (event.severity) {
            case CollisionSeverity.Light:
                damage = event.impactVelocity * 0.05;
                break;
            case CollisionSeverity.Medium:
                damage = event.impactVelocity * 0.1;
                break;
            case CollisionSeverity.Heavy:
                damage = event.impactVelocity * 0.2;
                break;
        }
        const isEnvironmentCollision = !other.gameState || other.type === EntityType.Environment;
        if (isEnvironmentCollision) {
            damage *= 1.5;
        }
        vehicle.gameState.health = Math.max(0, vehicle.gameState.health - damage);
        if (vehicle.gameState.health <= 0) {
            vehicle.gameState.health = 0;
            // Destruction effects could be triggered here
        }
    }
    function handleProjectileCollision(projectile: GameEntity, other: GameEntity, event: any) {
        if (!projectile.gameState || !projectile.projectile) {
            console.warn('Projectile missing required components:', projectile.id);
            return;
        }
        // Restore impact logic if contact info is available
        if (event.contactPoint && event.normal && other.id && isServer) {
            projectile.projectile.impact = {
                position: event.contactPoint,
                normal: event.normal,
                impactVelocity: event.impactVelocity,
                targetId: other.id,
                targetType: other.type || ""
            };
        }
    }
    function handleFlagCollision(flag: GameEntity, other: GameEntity, event: any) {
        if (other.vehicle && !flag.gameState!.carriedBy) {
            flag.gameState!.carriedBy = other.id;
            other.gameState!.hasFlag = true;
        }
    }

    // --- Physics hooks for custom contact filtering ---
    const physicsHooks = {
        filterContactPair: (collider1: number, collider2: number, body1: number, body2: number) => {
            const colliderA = world.getCollider(collider1);
            const colliderB = world.getCollider(collider2);
            // Find ECS entities by collider
            const entityA = ecsWorld.entities.find(e => e.physics?.colliders?.includes(colliderA));
            const entityB = ecsWorld.entities.find(e => e.physics?.colliders?.includes(colliderB));
            // Ignore collision if one is a projectile and the other's id matches sourceId
            if (
                entityA?.type === EntityType.Projectile && entityA.projectile?.sourceId === entityB?.id ||
                entityB?.type === EntityType.Projectile && entityB.projectile?.sourceId === entityA?.id
            ) {
                return null; // Ignore this contact pair
            }
            // Otherwise, allow normal contact computation
            return RAPIER.SolverFlags.COMPUTE_IMPULSE;
        },
        filterIntersectionPair: () => true // Dummy, required by PhysicsHooks interface
    };

    return {
        getWorld: () => world,
        getCurrentTick: () => currentTick,
        setCurrentTick: (tick: number) => {
            currentTick = tick;
        },
        
        addBody: (entity: GameEntity) => {
            if (!entity.physics?.body || !entity.physics?.colliders) {
                console.warn(`Entity ${entity.id} has no physics body/colliders to add`);
                return;
            }
            // Add body/colliders to world if not already added
            if (!entityBodies.has(entity.id)) {
                entityBodies.set(entity.id, entity.physics.body);
                entityColliders.set(entity.id, entity.physics.colliders);
            }
        },

        removeBody: (entityId: string) => {
            const body = entityBodies.get(entityId);
            const colliders = entityColliders.get(entityId);
            if (colliders) {
                for (const collider of colliders) {
                    world.removeCollider(collider, true);
                }
                entityColliders.delete(entityId);
            }
            if (body) {
                world.removeRigidBody(body);
                entityBodies.delete(entityId);
            }
        },
        
        update: (deltaTime: number) => {
            const physicsEntities = ecsWorld.with("physics", "transform");
            world.step(eventQueue, physicsHooks);
            currentTick++;
            // Handle collision events
            eventQueue.drainCollisionEvents((handle1: number, handle2: number, started: boolean) => {
                if (!started) return;
                const colliderA = world.getCollider(handle1);
                const colliderB = world.getCollider(handle2);
                if (!colliderA || !colliderB) return;
                world.contactPair(colliderA, colliderB, (manifold: any, flipped: boolean) => {
                    if (!manifold || (manifold.numContacts && manifold.numContacts() === 0)) return;
                    // Find the entities by collider
                    const entityA = ecsWorld.entities.find(e => e.physics?.colliders?.includes(colliderA));
                    const entityB = ecsWorld.entities.find(e => e.physics?.colliders?.includes(colliderB));
                    if (!entityA || !entityB) return;
                    // Get collision type
                    const collisionType = determineCollisionType(entityA, entityB);
                    // Get impact velocity (approximate as difference in linvel)
                    const bodyA = entityA.physics?.body;
                    const bodyB = entityB.physics?.body;
                    let impactVelocity = 0;
                    if (bodyA && bodyB) {
                        const linvelA = bodyA.linvel();
                        const linvelB = bodyB.linvel();
                        impactVelocity = Math.sqrt(
                            Math.pow(linvelA.x - linvelB.x, 2) +
                            Math.pow(linvelA.y - linvelB.y, 2) +
                            Math.pow(linvelA.z - linvelB.z, 2)
                        );
                    }
                    const severity = determineCollisionSeverity(impactVelocity);
                    // Extract contact point and normal from the first contact using Rapier's TempContactManifold API
                    let contactPoint = undefined;
                    let normal = undefined;
                    if (manifold.numContacts && manifold.numContacts() > 0) {
                        // Get the world-space normal
                        normal = manifold.normal ? manifold.normal() : undefined;
                        if (normal) {
                            normal = new Vector3(normal.x, normal.y, normal.z);
                        }
                        // Get the world-space contact point for the first contact
                        // Use solverContactPoint if available, else localContactPoint1/2
                        let point = undefined;
                        if (manifold.solverContactPoint) {
                            point = manifold.solverContactPoint(0);
                        } else if (manifold.localContactPoint1) {
                            point = manifold.localContactPoint1(0);
                        }
                        if (point) {
                            contactPoint = new Vector3(point.x, point.y, point.z);
                        }
                        // If 'flipped', swap normal direction
                        if (flipped && normal) {
                            normal = normal.scale(-1);
                        }
                    } else {
                        console.warn('[PhysicsWorldSystem] No contacts in manifold', manifold);
                    }
                    handleCollisionEvent(entityA, entityB, {
                        type: collisionType,
                        severity: severity,
                        bodyA: bodyA,
                        bodyB: bodyB,
                        impactVelocity: impactVelocity,
                        contactPoint,
                        normal,
                        timestamp: Date.now()
                    });
                });
            });
            for (const entity of physicsEntities) {
                if (!entity.physics?.body || !entity.transform) continue;
                applyBodyTransform(entity);
            }
        },

        dispose: () => {
            // Remove all bodies and colliders from world
            for (const [entityId, colliders] of entityColliders.entries()) {
                for (const collider of colliders) {
                    world.removeCollider(collider, true);
                }
            }
            for (const [entityId, body] of entityBodies.entries()) {
                world.removeRigidBody(body);
            }
            entityBodies.clear();
            entityColliders.clear();
        },
        getVehiclePhysicsConfig(vehicleType: VehicleType) {
            return vehicleType === VehicleType.Drone ? DroneSettings : PlaneSettings;
        },
        createMeshPhysics(entity: GameEntity) {
            // Determine collision group and mask based on entity type
            let physicsComponent = {
                mass: 0,
                drag: 0.0,
                angularDrag: 0.0,
                maxSpeed: 0.0,
                maxAngularSpeed: 0.0,
                maxAngularAcceleration: 0.0,
                angularDamping: 0.0,
                forceMultiplier: 1.0,
                thrust: 0.0,
                lift: 0.0,
                torque: 0.0
            };
            let collisionGroup = CollisionGroups.Environment;
            let collisionMask = collisionMasks.Environment;
            let mass = 0;
            if (entity.type === EntityType.Vehicle) {
                physicsComponent = this.getVehiclePhysicsConfig(entity.vehicle!.vehicleType);
                collisionGroup = entity.vehicle!.vehicleType === VehicleType.Drone ? CollisionGroups.Drones : CollisionGroups.Planes;
                collisionMask = entity.vehicle!.vehicleType === VehicleType.Drone ? collisionMasks.Drone : collisionMasks.Plane;
                mass = physicsComponent.mass;
            } else if (entity.type === EntityType.Projectile) {
                collisionGroup = CollisionGroups.Projectiles;
                collisionMask = collisionMasks.Projectile;
                mass = 0.1;
            } else if (entity.type === EntityType.Flag) {
                collisionGroup = CollisionGroups.Flags;
                collisionMask = collisionMasks.Flag;
                mass = 0;
            }

            // Create RigidBodyDesc
            const rbDesc = mass > 0 ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed();
            rbDesc.setTranslation(
                entity.transform!.position.x,
                entity.transform!.position.y,
                entity.transform!.position.z
            );
            rbDesc.setRotation({
                x: entity.transform!.rotation.x,
                y: entity.transform!.rotation.y,
                z: entity.transform!.rotation.z,
                w: entity.transform!.rotation.w
            });
            // Set Rapier built-in damping for dynamic bodies
            if (mass > 0) {
                if (entity.type === EntityType.Vehicle) {
                    rbDesc.setLinearDamping(0.2);
                    rbDesc.setAngularDamping(0.95);
                    rbDesc.lockRotations();
                } 
            }
            const body = world.createRigidBody(rbDesc);

            // Create colliders (multiple if needed)
            const colliders: RAPIER.Collider[] = [];
            if (entity.asset?.collisionMeshes && entity.asset.collisionMeshes.length > 0) {
                entity.asset.collisionMeshes.forEach(mesh => {
                    // Get world matrix and bake transformations
                    const worldMatrix = mesh.computeWorldMatrix(true);
                    // Get the scale from the world matrix
                    const scale = new Vector3();
                    worldMatrix.decompose(scale, undefined, undefined);
                    // Get absolute position and rotation
                    const absolutePosition = mesh.absolutePosition.clone();
                    const absoluteRotation = mesh.absoluteRotationQuaternion;
                    // Get the size in local space and apply world scale
                    const boundingBox = mesh.getBoundingInfo().boundingBox;
                    const size = boundingBox.extendSize.clone();
                    size.scaleInPlace(2); // Convert from half-size to full size
                    size.x *= scale.x;
                    size.y *= scale.y;
                    size.z *= scale.z;
                    // Create a shape based on the mesh metadata
                    let colliderDesc: RAPIER.ColliderDesc;
                    if (mesh.metadata?.gltf?.extras?.shape === "sphere") {
                        // For spheres, use the largest dimension as radius
                        const radius = Math.max(size.x, size.y, size.z) / 2;
                        colliderDesc = RAPIER.ColliderDesc.ball(radius);
                    } else if (mesh.metadata?.gltf?.extras?.shape === "plane") {
                        // For planes, we need to create a box shape with very small height
                        // to approximate a plane while maintaining proper scaling
                        colliderDesc = RAPIER.ColliderDesc.cuboid(Math.abs(size.x / 2), 0.01, Math.abs(size.z / 2));
                    } else if (mesh.metadata?.gltf?.extras?.shape === "trimesh") {
                        // Trimesh support
                        // Extract vertices and indices from mesh geometry
                        const geometry = mesh.geometry || mesh._geometry;
                        if (geometry && geometry.getVerticesData && geometry.getIndices) {
                            const positions = geometry.getVerticesData("position");
                            const indices = geometry.getIndices();
                            if (positions && indices) {
                                // Rapier expects Float32Array for vertices, Uint32Array for indices
                                const vertices = new Float32Array(positions);
                                let indexArray: Uint32Array;
                                if (indices instanceof Uint32Array) {
                                    indexArray = indices;
                                } else {
                                    indexArray = new Uint32Array(indices);
                                }
                                colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indexArray);
                            } else {
                                // fallback to box if no geometry
                                colliderDesc = RAPIER.ColliderDesc.cuboid(Math.abs(size.x / 2), Math.abs(size.y / 2), Math.abs(size.z / 2));
                            }
                        } else {
                            // fallback to box if no geometry
                            colliderDesc = RAPIER.ColliderDesc.cuboid(Math.abs(size.x / 2), Math.abs(size.y / 2), Math.abs(size.z / 2));
                        }
                    } else {
                        // For boxes, use the actual size with world scale applied
                        colliderDesc = RAPIER.ColliderDesc.cuboid(Math.abs(size.x / 2), Math.abs(size.y / 2), Math.abs(size.z / 2));
                    }
                    colliderDesc.setCollisionGroups((collisionGroup << 16) | collisionMask);
                    // Enable physics hooks for vehicles and projectiles
                    if (entity.type === EntityType.Vehicle || entity.type === EntityType.Projectile) {
                        colliderDesc.setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS);
                    }
                    // Set translation and rotation relative to the body if needed
                    colliderDesc.setTranslation(absolutePosition.x, absolutePosition.y, absolutePosition.z);
                    if (absoluteRotation) {
                        colliderDesc.setRotation({
                            x: absoluteRotation.x,
                            y: absoluteRotation.y,
                            z: absoluteRotation.z,
                            w: absoluteRotation.w
                        });
                    }
                    const collider = world.createCollider(colliderDesc, body);
                    colliders.push(collider);
                });
            } else {
                // Fallback to using the entity's bounding box
                const mesh = entity.render?.mesh;
                if (mesh) {
                    const size = mesh.getBoundingInfo().boundingBox.extendSize;
                    const colliderDesc = RAPIER.ColliderDesc.cuboid(Math.abs(size.x), Math.abs(size.y), Math.abs(size.z));
                    colliderDesc.setCollisionGroups((collisionGroup << 16) | collisionMask);
                    // Enable physics hooks for vehicles and projectiles
                    if (entity.type === EntityType.Vehicle || entity.type === EntityType.Projectile) {
                        colliderDesc.setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS);
                    }
                    const collider = world.createCollider(colliderDesc, body);
                    colliders.push(collider);
                }
            }
            if (colliders.length === 0) {
                // fallback: create a small box
                const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
                colliderDesc.setCollisionGroups((collisionGroup << 16) | collisionMask);
                // Enable physics hooks for vehicles and projectiles
                if (entity.type === EntityType.Vehicle || entity.type === EntityType.Projectile) {
                    colliderDesc.setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS);
                }
                const collider = world.createCollider(colliderDesc, body);
                colliders.push(collider);
            }
            entity.physics = {
                body: body,
                colliders: colliders,
                ...physicsComponent
            };
            this.addBody(entity);
        },
        createFlagBody(position: Vector3): RAPIER.RigidBody {
            const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
            const body = world.createRigidBody(rbDesc);
            const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
            colliderDesc.setCollisionGroups((CollisionGroups.Flags << 16) | collisionMasks.Flag);
            colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
            world.createCollider(colliderDesc, body);
            return body;
        },
        // Create collider bodies from a collection of meshes
        createColliderBodies(meshes: Mesh[]): RAPIER.RigidBody[] {
            const bodies: RAPIER.RigidBody[] = [];
            for (const mesh of meshes) {
                const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(mesh.position.x, mesh.position.y, mesh.position.z);
                const body = world.createRigidBody(rbDesc);
                let colliderDesc: RAPIER.ColliderDesc;
                if (mesh.getClassName() === "BoxMesh") {
                    const size = mesh.getBoundingInfo().boundingBox.extendSize;
                    colliderDesc = RAPIER.ColliderDesc.cuboid(size.x, size.y, size.z);
                } else if (mesh.getClassName() === "SphereMesh") {
                    const radius = mesh.getBoundingInfo().boundingSphere.radius;
                    colliderDesc = RAPIER.ColliderDesc.ball(radius);
                } else {
                    const size = mesh.getBoundingInfo().boundingBox.extendSize;
                    colliderDesc = RAPIER.ColliderDesc.cuboid(size.x, size.y, size.z);
                }
                colliderDesc.setCollisionGroups((CollisionGroups.Environment << 16) | collisionMasks.Environment);
                colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
                world.createCollider(colliderDesc, body);
                bodies.push(body);
            }
            return bodies;
        },
        /**
         * Creates a projectile entity based on the shooter and weapon
         */
        createProjectile(
            shooter: GameEntity, 
            weapon: WeaponComponent,
            projectileId: string,
            aimPoint: Vector3,
            timeDelta: number = 0,
            transformBuffer?: TransformBuffer
        ): GameEntity {
            // Get all weapon triggers
            const weaponTriggers = shooter?.asset?.triggerMeshes?.filter(mesh => 
                ['missile', 'bullet_0', 'bullet_1'].includes(mesh.metadata?.gltf?.extras?.type)
            ) || [];

            // Determine which trigger to use based on projectile type and ID
            let weaponTrigger;
            if (weapon.projectileType === ProjectileType.Missile) {
                weaponTrigger = weaponTriggers.find(mesh => mesh.metadata?.gltf?.extras?.type === 'missile');
            } else {
                // For bullets, alternate between bullet_0 and bullet_1 based on projectile ID
                const bulletIndex = parseInt(projectileId.split('_').pop() || '0') % 2;
                weaponTrigger = weaponTriggers.find(mesh => mesh.metadata?.gltf?.extras?.type === `bullet_${bulletIndex}`);
            }

            // Use transform buffer if available, otherwise use current transform
            const shooterTransform = transformBuffer?.transform || shooter.transform!;
            
            let spawnPointPosition: Vector3;
            let spawnPointRotation: Quaternion;
            if (weaponTrigger) {
                // Get the local position and rotation of the trigger mesh
                const localPosition = weaponTrigger.position.clone();
                const localRotation = weaponTrigger.rotationQuaternion?.clone() || new Quaternion();
                
                // Transform the local position by the vehicle's world transform
                spawnPointPosition = localPosition.clone();
                spawnPointPosition.rotateByQuaternionAroundPointToRef(
                    shooterTransform.rotation,
                    Vector3.Zero(),
                    spawnPointPosition
                );
                spawnPointPosition.addInPlace(shooterTransform.position);
                
                // Combine rotations
                spawnPointRotation = shooterTransform.rotation.multiply(localRotation);
            } else {
                // Fallback to vehicle position/rotation if no trigger mesh found
                spawnPointPosition = shooterTransform.position.clone();
                spawnPointRotation = shooterTransform.rotation.clone();
            }

            if (timeDelta > 0) {
                // Project position forward using velocity
                spawnPointPosition.addInPlace(shooterTransform.velocity.scale(timeDelta));
            }

            // Calculate direction from spawn point to aim point
            const direction = aimPoint.subtract(spawnPointPosition).normalize();

            // Calculate projectile velocity by combining shooter velocity and projectile speed
            const projectileVelocity = direction.scale(weapon.projectileSpeed);

            
            // For missiles, only inherit 75% of the vehicle's velocity
            if (weapon.projectileType === ProjectileType.Missile) {
                projectileVelocity.addInPlace(shooterTransform.velocity.scale(0.75));
            } else {
                projectileVelocity.addInPlace(shooterTransform.velocity);
            }
            // // If we have a time delta, project forward
            // if (timeDelta > 0) {
            //     // Project position forward using velocity
            //     spawnPointPosition.addInPlace(projectileVelocity.scale(timeDelta));
            // }

            // Create projectile body
            const rbDesc = RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(spawnPointPosition.x, spawnPointPosition.y, spawnPointPosition.z)
                .setLinvel(projectileVelocity.x, projectileVelocity.y, projectileVelocity.z)
                .setGravityScale(0.0)
                .setCcdEnabled(true);
            const body = world.createRigidBody(rbDesc);

            // Add collision shape based on projectile type
            let colliderDesc: RAPIER.ColliderDesc;
            if (weapon.projectileType === ProjectileType.Bullet) {
                colliderDesc = RAPIER.ColliderDesc.ball(0.2);
            } else if (weapon.projectileType === ProjectileType.Missile) {
                colliderDesc = RAPIER.ColliderDesc.ball(0.3);
            } else {
                colliderDesc = RAPIER.ColliderDesc.ball(0.1);
            }
            colliderDesc.setCollisionGroups((CollisionGroups.Projectiles << 16) | collisionMasks.Projectile);
            colliderDesc.setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS);
            colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
            colliderDesc.setSensor(!isServer);
            const collider = world.createCollider(colliderDesc, body);
            entityBodies.set(projectileId, body);
            entityColliders.set(projectileId, [collider]);

            // Create and return projectile entity
            return {
                id: projectileId,
                type: EntityType.Projectile,
                transform: {
                    position: spawnPointPosition.clone(),
                    rotation: spawnPointRotation.clone(),
                    velocity: projectileVelocity,
                    angularVelocity: Vector3.Zero()
                },
                physics: {
                    body,
                    colliders: [collider],
                    mass: 0.1,
                    drag: 0.1,
                    angularDrag: 0.1,
                    maxSpeed: weapon.projectileSpeed,
                    maxAngularSpeed: 0,
                    maxAngularAcceleration: 0,
                    angularDamping: 1,
                    forceMultiplier: 1,
                    thrust: 0,
                    lift: 0,
                    torque: 0,
                },
                projectile: {
                    projectileType: weapon.projectileType as ProjectileType,
                    damage: weapon.damage,
                    range: weapon.range,
                    distanceTraveled: 0,
                    sourceId: shooter.id,
                    speed: weapon.projectileSpeed,
                },
                gameState: {
                    health: 1,
                    maxHealth: 1,
                    team: shooter.gameState!.team,
                    hasFlag: false,
                    carryingFlag: false,
                    atBase: false,
                },
                owner: {
                    id: shooter.owner!.id,
                    isLocal: shooter.owner!.isLocal
                },
                tick: {
                    tick: 0,
                    timestamp: Date.now()
                }
            };
        },
        applyBodyTransform,
        applyMissileImpact(entity: GameEntity) {
            if (!entity.projectile?.impact) return;

            const impactPosition = entity.projectile.impact.position;
            const explosionRadius = 4; // meters
            const maxVelocity = 20; // maximum velocity change
            const minVelocity = 5; // minimum velocity change

            // Get projectile velocity direction if available
            let projectileDir = undefined;
            if (entity.transform?.velocity && entity.transform.velocity.length() > 0) {
                projectileDir = entity.transform.velocity.normalize();
            }
            const blendFactor = 0.5; // Blend between radial and projectile direction

            // Find all vehicle entities
            const vehicles = ecsWorld.with("vehicle", "physics", "transform");
            
            for (const vehicle of vehicles) {
                if (!vehicle.physics?.body || !vehicle.transform) continue;

                // Calculate distance to impact point
                const distance = Vector3.Distance(vehicle.transform.position, impactPosition);
                
                // Skip if outside explosion radius
                if (distance > explosionRadius) continue;

                // Calculate direction from impact to vehicle
                let radialDir = vehicle.transform.position.subtract(impactPosition).normalize();
                // Blend with projectile direction if available
                let finalDir = radialDir;
                if (projectileDir) {
                    finalDir = radialDir.scale(1 - blendFactor).add(projectileDir.scale(blendFactor)).normalize();
                }
                // Calculate velocity change based on distance (inverse square falloff)
                const distanceRatio = 1 - (distance / explosionRadius);
                const velocityChange = minVelocity + (maxVelocity - minVelocity) * (distanceRatio * distanceRatio);

                // Apply velocity change directly
                const linvel = vehicle.physics.body.linvel();
                vehicle.physics.body.setLinvel({
                    x: linvel.x + finalDir.x * velocityChange,
                    y: linvel.y + finalDir.y * velocityChange,
                    z: linvel.z + finalDir.z * velocityChange
                }, true);

                // Dampen angular velocity to prevent spinning
                const angvel = vehicle.physics.body.angvel();
                vehicle.physics.body.setAngvel({
                    x: angvel.x * 0.5,
                    y: angvel.y * 0.5,
                    z: angvel.z * 0.5
                }, true);
            }
        }
    };  
}