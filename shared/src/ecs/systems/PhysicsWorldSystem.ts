import * as CANNON from 'cannon-es';
import { world as ecsWorld } from '../world';
import { GameEntity, VehicleType, DroneSettings, PlaneSettings, CollisionGroups, collisionMasks, EntityType, PhysicsComponent, WeaponComponent, ProjectileType } from '../types';
import { Vector3, Quaternion, Mesh } from '@babylonjs/core';
/**
 * Creates a system that manages the physics world for both client and server
 */
export function createPhysicsWorldSystem() {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.defaultContactMaterial.friction = 0.3;
    world.defaultContactMaterial.restitution = 0.3;

    // Add postStep event listener for projectile raycasting
    world.addEventListener('postStep', () => {
        // Find all projectiles
        const projectiles = ecsWorld.with("projectile", "transform", "physics");
        for (const projectile of projectiles) {
            if (!projectile.physics?.body || !projectile.transform) continue;

            // Get current position and velocity
            const position = projectile.physics.body.position;
            const velocity = projectile.physics.body.velocity.scale(1/60);
            
            // Skip if velocity is too small
            if (velocity.lengthSquared() < 0.01) continue;

            // Calculate end position by adding velocity to current position
            const toPosition = new CANNON.Vec3();
            toPosition.copy(position);
            toPosition.vadd(velocity, toPosition);

            // Create ray from current position to end position
            const ray = new CANNON.Ray(
                position,
                toPosition
            );
            
            // Set ray properties
            ray.mode = CANNON.Ray.CLOSEST;
            ray.skipBackfaces = true;
            ray.checkCollisionResponse = true;

            // Cast ray
            const result = new CANNON.RaycastResult();
            ray.intersectWorld(world, {
                result: result,
                collisionFilterMask: collisionMasks.Projectile
            });

            // If we hit something, set the impact component
            if (result.hasHit) {
                const hitPoint = new Vector3(
                    result.hitPointWorld.x,
                    result.hitPointWorld.y,
                    result.hitPointWorld.z
                );
                const hitNormal = new Vector3(
                    -result.hitNormalWorld.x,
                    -result.hitNormalWorld.y,
                    -result.hitNormalWorld.z
                );
                // Find the hit entity
                const hitBody = result.body;
                const hitEntity = ecsWorld.entities.find(e => e.physics?.body?.id === hitBody?.id);
                if (hitEntity) {
                    projectile.projectile!.impact = {
                        position: hitPoint,
                        normal: hitNormal,
                        impactVelocity: velocity.length(),
                        targetId: hitEntity.id,
                        targetType: hitEntity.type || ""
                    };
                }
            }
        }
    });

    const environmentMaterial = new CANNON.Material('environmentMaterial');
    const vehicleMaterial = new CANNON.Material('vehicleMaterial');
    const projectileMaterial = new CANNON.Material('projectileMaterial');
    const flagMaterial = new CANNON.Material('flagMaterial');
    const meshMaterial = new CANNON.Material('meshMaterial');

    // Configure vehicle vehicle contact material
    const vehicleVehicleContactMaterial = new CANNON.ContactMaterial(
        vehicleMaterial,
        vehicleMaterial,
        { 
            friction: 0.5, 
            restitution: 0.3,
            contactEquationStiffness: 1e6,
            contactEquationRelaxation: 3
        }
    );
    world.addContactMaterial(vehicleVehicleContactMaterial);

    // Configure projectile-vehicle contact material
    const projectileVehicleContactMaterial = new CANNON.ContactMaterial(
        projectileMaterial,
        vehicleMaterial,
        {
            friction: 0.5,
            restitution: 0.3,
            contactEquationStiffness: 1e6,
            contactEquationRelaxation: 4
        }
    );
    world.addContactMaterial(projectileVehicleContactMaterial);

    // Configure mesh-vehicle contact material
    const meshVehicleContactMaterial = new CANNON.ContactMaterial(
        meshMaterial,
        vehicleMaterial,
        {
            friction: 0.5,
            restitution: 0.3,
            contactEquationStiffness: 1e6,
            contactEquationRelaxation: 3
        }
    );
    world.addContactMaterial(meshVehicleContactMaterial);

    // Configure mesh-projectile contact material
    const meshProjectileContactMaterial = new CANNON.ContactMaterial(
        meshMaterial,
        projectileMaterial,
        {
            friction: 0.0,
            restitution: 0.0,
            contactEquationStiffness: 1e9,
            contactEquationRelaxation: 4
        }
    );
    world.addContactMaterial(meshProjectileContactMaterial); 

    // Configure environment-vehicle contact material
    const environmentVehicleContactMaterial = new CANNON.ContactMaterial(
        environmentMaterial,
        vehicleMaterial,
        {
            friction: 0.5,
            restitution: 0.3,
            contactEquationStiffness: 1e6,
            contactEquationRelaxation: 3
        }
    );
    world.addContactMaterial(environmentVehicleContactMaterial);
    
    // Configure environment-projectile contact material
    const environmentProjectileContactMaterial = new CANNON.ContactMaterial(
        environmentMaterial,
        projectileMaterial,
        {
            friction: 0.0,
            restitution: 0.0,
            contactEquationStiffness: 1e9,
            contactEquationRelaxation: 4
        }
    );
    world.addContactMaterial(environmentProjectileContactMaterial);
    
    // Configure environment-mesh contact material
    const environmentMeshContactMaterial = new CANNON.ContactMaterial(
        environmentMaterial,
        meshMaterial,
        {
            friction: 0.5,
            restitution: 0.3,
            contactEquationStiffness: 1e6,
            contactEquationRelaxation: 3
        }
    );
    world.addContactMaterial(environmentMeshContactMaterial);
    
    // Configure vehicle-flag contact material
    const vehicleFlagContactMaterial = new CANNON.ContactMaterial(
        vehicleMaterial,
        flagMaterial,
        {
            friction: 0.5,
            restitution: 0.3,
            contactEquationStiffness: 1e6,
            contactEquationRelaxation: 3
        }
    );
    world.addContactMaterial(vehicleFlagContactMaterial);
    

    let currentTick = 0;
    const TICK_RATE = 60;
    const TIME_STEP = 1 / TICK_RATE;
    const MAX_SUB_STEPS = 1;

    // Map to track which bodies belong to which entities
    const entityBodies = new Map<string, CANNON.Body>();

    return {
        getWorld: () => world,
        getCurrentTick: () => currentTick,
        setCurrentTick: (tick: number) => {
            currentTick = tick;
        },
        
        addBody: (entity: GameEntity) => {
            if (!entity.physics?.body) {
                console.warn(`Entity ${entity.id} has no physics body to add`);
                return;
            }

            // Add body to world if not already added
            if (!world.bodies.includes(entity.physics.body)) {
                world.addBody(entity.physics.body);
                entityBodies.set(entity.id, entity.physics.body);
            }
        },

        removeBody: (entityId: string) => {
            const body = entityBodies.get(entityId);
            if (body) {
                // wait for the next frame to remove the body
                setTimeout(() => {
                    world.removeBody(body);
                    // console.log('removing body for', entityId, world.bodies.length);
                }, 0);
            }
        },
        
        update: (deltaTime: number) => {
            world.step(TIME_STEP, deltaTime, MAX_SUB_STEPS);
            currentTick++;
        },

        dispose: () => {
            // Remove all bodies from world
            world.bodies.forEach(body => {
                world.removeBody(body);
            });
            entityBodies.clear();
        },
        getVehiclePhysicsConfig(vehicleType: VehicleType) {
            return vehicleType === VehicleType.Drone ? DroneSettings : PlaneSettings;
        },
        createMeshPhysics(entity: GameEntity) {
            // Determine material based on entity type
            let material = meshMaterial;
            if (entity.type === EntityType.Vehicle) {
                material = vehicleMaterial;
            } else if (entity.type === EntityType.Projectile) {
                material = projectileMaterial;
            } else if (entity.type === EntityType.Flag) {
                material = flagMaterial;
            } else if (entity.type === EntityType.Environment) {
                material = environmentMaterial;
            }

            // determine mass based on entity type
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
            }

            //determine collision group and mask based on entity type
            let collisionGroup = CollisionGroups.Environment;
            let collisionMask = collisionMasks.Environment;
            if (entity.type === EntityType.Vehicle) {
                physicsComponent = this.getVehiclePhysicsConfig(entity.vehicle!.vehicleType);
                collisionGroup = entity.vehicle!.vehicleType === VehicleType.Drone ? CollisionGroups.Drones : CollisionGroups.Planes;
                collisionMask = entity.vehicle!.vehicleType === VehicleType.Drone ? collisionMasks.Drone : collisionMasks.Plane;
            } else if (entity.type === EntityType.Projectile) {
                collisionGroup = CollisionGroups.Projectiles;
                collisionMask = collisionMasks.Projectile;
            } else if (entity.type === EntityType.Flag) {
                collisionGroup = CollisionGroups.Flags;
                collisionMask = collisionMasks.Flag;
            }

            const body = new CANNON.Body({
                mass: physicsComponent.mass,
                material: material,
                collisionFilterGroup: collisionGroup,
                collisionFilterMask: collisionMask,
                position: new CANNON.Vec3(entity.transform!.position.x, entity.transform!.position.y, entity.transform!.position.z),
                quaternion: new CANNON.Quaternion(entity.transform!.rotation.x, entity.transform!.rotation.y, entity.transform!.rotation.z, entity.transform!.rotation.w)
            });

            // If entity has collider meshes, use them
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
                    let shape: CANNON.Shape;
                    if (mesh.metadata?.gltf?.extras?.shape === "sphere") {
                        // For spheres, use the largest dimension as radius
                        const radius = Math.max(size.x, size.y, size.z) / 2;
                        shape = new CANNON.Sphere(radius);
                    } else if (mesh.metadata?.gltf?.extras?.shape === "plane") {
                        // For planes, we need to create a box shape with very small height
                        // to approximate a plane while maintaining proper scaling
                        shape = new CANNON.Box(new CANNON.Vec3(
                            Math.abs(size.x / 2),
                            0.01, // Very small height to approximate a plane
                            Math.abs(size.z / 2)
                        ));
                        
                        // Set the body quaternion to match the plane's normal
                        const normal = new Vector3(0, 1, 0);
                        normal.rotateByQuaternionAroundPointToRef(absoluteRotation, Vector3.Zero(), normal);
                        const quat = new CANNON.Quaternion();
                        quat.setFromVectors(new CANNON.Vec3(0, 1, 0), new CANNON.Vec3(normal.x, normal.y, normal.z));
                        body.quaternion.mult(quat, body.quaternion);
                    } else {
                        // For boxes, use the actual size with world scale applied
                        shape = new CANNON.Box(new CANNON.Vec3(
                            Math.abs(size.x / 2),
                            Math.abs(size.y / 2),
                            Math.abs(size.z / 2)
                        ));
                    }

                    // Add the shape to the body with the correct position and orientation
                    const offset = new CANNON.Vec3(
                        absolutePosition.x,
                        absolutePosition.y,
                        absolutePosition.z
                    );
                    const orientation = new CANNON.Quaternion(
                        absoluteRotation.x,
                        absoluteRotation.y,
                        absoluteRotation.z,
                        absoluteRotation.w
                    );
                    body.addShape(shape, offset, orientation);
                });
            } else {
                // Fallback to using the entity's bounding box
                const mesh = entity.render?.mesh;
                if (mesh) {
                    const size = mesh.getBoundingInfo().boundingBox.extendSize;
                    const shape = new CANNON.Box(new CANNON.Vec3(
                        Math.abs(size.x),
                        Math.abs(size.y),
                        Math.abs(size.z)
                    ));
                    body.addShape(shape);
                }
            }
            entity.physics = {
                body: body,
                ...physicsComponent
            };
            this.addBody(entity);
        },
        createFlagBody(position: Vector3): CANNON.Body {
            const body = new CANNON.Body({
                mass: 0, // Static body
                material: flagMaterial,
                collisionFilterGroup: CollisionGroups.Flags,
                collisionFilterMask: collisionMasks.Flag,
                position: new CANNON.Vec3(position.x, position.y, position.z),
                quaternion: new CANNON.Quaternion(0, 0, 0, 1)
            });
            const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
            body.addShape(shape);
            return body;
        },
        // Create collider bodies from a collection of meshes
        createColliderBodies(meshes: Mesh[]): CANNON.Body[] {
            const bodies: CANNON.Body[] = [];
            
            meshes.forEach(mesh => {
                // Create a body for each mesh
                const body = new CANNON.Body({
                    mass: 0, // Static body
                    material: meshMaterial,
                    position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
                    quaternion: new CANNON.Quaternion(
                        mesh.rotationQuaternion?.x || 0,
                        mesh.rotationQuaternion?.y || 0,
                        mesh.rotationQuaternion?.z || 0,
                        mesh.rotationQuaternion?.w || 1
                    )
                });
                // Add collision shape based on mesh type
                if (mesh.getClassName() === "BoxMesh") {
                    const size = mesh.getBoundingInfo().boundingBox.extendSize;
                    const shape = new CANNON.Box(new CANNON.Vec3(size.x, size.y, size.z));
                    body.addShape(shape);
                } else if (mesh.getClassName() === "SphereMesh") {
                    const radius = mesh.getBoundingInfo().boundingSphere.radius;
                    const shape = new CANNON.Sphere(radius);
                    body.addShape(shape);
                } else {
                    // For other mesh types, use a box approximation
                    const size = mesh.getBoundingInfo().boundingBox.extendSize;
                    const shape = new CANNON.Box(new CANNON.Vec3(size.x, size.y, size.z));
                    body.addShape(shape);
                }

                bodies.push(body);
                world.addBody(body);
            });

            return bodies;
        },
        /**
         * Creates a projectile entity based on the shooter and weapon
         */
        createProjectile(
            shooter: GameEntity, 
            weapon: WeaponComponent,
            projectileId: string
        ): GameEntity {
            const weaponTrigger = shooter?.asset?.triggerMeshes?.find(mesh => 'missile' === mesh.metadata?.gltf?.extras?.type);
            let spawnPointPosition: Vector3;
            let spawnPointRotation: Quaternion;
            
            if (weaponTrigger) {
                // Get the local position and rotation of the trigger mesh
                const localPosition = weaponTrigger.position.clone();
                const localRotation = weaponTrigger.rotationQuaternion?.clone() || new Quaternion();
                
                // Transform the local position by the vehicle's world transform
                spawnPointPosition = localPosition.clone();
                spawnPointPosition.rotateByQuaternionAroundPointToRef(
                    shooter.transform!.rotation,
                    Vector3.Zero(),
                    spawnPointPosition
                );
                spawnPointPosition.addInPlace(shooter.transform!.position);
                
                // Combine rotations
                spawnPointRotation = shooter.transform!.rotation.multiply(localRotation);
            } else {
                // Fallback to vehicle position/rotation if no trigger mesh found
                spawnPointPosition = shooter.transform!.position;
                spawnPointRotation = shooter.transform!.rotation;
            }

            const forward = new Vector3(0, 0, 1);
            forward.rotateByQuaternionAroundPointToRef(
                spawnPointRotation,
                Vector3.Zero(),
                forward
            );

            // Calculate projectile velocity by combining shooter velocity and projectile speed
            const projectileVelocity = forward.scale(weapon.projectileSpeed);
            projectileVelocity.addInPlace(shooter.transform!.velocity);

            // Create projectile body
            const body = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(
                    spawnPointPosition.x,
                    spawnPointPosition.y,
                    spawnPointPosition.z
                ),
                velocity: new CANNON.Vec3(
                    projectileVelocity.x,
                    projectileVelocity.y,
                    projectileVelocity.z
                ),
                fixedRotation: true,
                collisionResponse: false,
                collisionFilterGroup: CollisionGroups.Projectiles,
                collisionFilterMask: collisionMasks.Projectile,
                type: CANNON.Body.DYNAMIC
            });
            

            // Add collision shape based on projectile type
            if (weapon.projectileType === ProjectileType.Bullet) {
                body.addShape(new CANNON.Sphere(0.1));
            } else if (weapon.projectileType === ProjectileType.Missile) {
                body.addShape(new CANNON.Sphere(0.1));
            }
            
            // Add body to CANNON world
            world.addBody(body);
            entityBodies.set(projectileId, body);

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
                    mass: 0,
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
        applyBodyTransform(entity: GameEntity, body: CANNON.Body) {
            entity.transform!.position.x = body.position.x;
            entity.transform!.position.y = body.position.y;
            entity.transform!.position.z = body.position.z;
            entity.transform!.rotation.x = body.quaternion.x;
            entity.transform!.rotation.y = body.quaternion.y;
            entity.transform!.rotation.z = body.quaternion.z;
            entity.transform!.rotation.w = body.quaternion.w;
            entity.transform!.velocity.x = body.velocity.x;
            entity.transform!.velocity.y = body.velocity.y;
            entity.transform!.velocity.z = body.velocity.z;
            entity.transform!.angularVelocity.x = body.angularVelocity.x;
            entity.transform!.angularVelocity.y = body.angularVelocity.y;
            entity.transform!.angularVelocity.z = body.angularVelocity.z;
        },
        applyMissileImpact(entity: GameEntity) {
            if (!entity.projectile?.impact) return;

            const impactPosition = entity.projectile.impact.position;
            const explosionRadius = 4; // meters
            const maxVelocity = 20; // maximum velocity change
            const minVelocity = 5; // minimum velocity change

            // Find all vehicle entities
            const vehicles = ecsWorld.with("vehicle", "physics", "transform");
            
            for (const vehicle of vehicles) {
                if (!vehicle.physics?.body || !vehicle.transform) continue;

                // Calculate distance to impact point
                const distance = Vector3.Distance(vehicle.transform.position, impactPosition);
                
                // Skip if outside explosion radius
                if (distance > explosionRadius) continue;

                // Calculate direction from impact to vehicle
                const direction = vehicle.transform.position.subtract(impactPosition).normalize();
                
                // Calculate velocity change based on distance (inverse square falloff)
                const distanceRatio = 1 - (distance / explosionRadius);
                const velocityChange = minVelocity + (maxVelocity - minVelocity) * (distanceRatio * distanceRatio);

                // Apply velocity change directly
                vehicle.physics.body.velocity.x += direction.x * velocityChange;
                vehicle.physics.body.velocity.y += direction.y * velocityChange;
                vehicle.physics.body.velocity.z += direction.z * velocityChange;

                // Add some upward velocity for a more dramatic effect
                // vehicle.physics.body.velocity.y += velocityChange * 0.5;

                // Dampen angular velocity to prevent spinning
                vehicle.physics.body.angularVelocity.x *= 0.5;
                vehicle.physics.body.angularVelocity.y *= 0.5;
                vehicle.physics.body.angularVelocity.z *= 0.5;
            }
        }
    };  
}