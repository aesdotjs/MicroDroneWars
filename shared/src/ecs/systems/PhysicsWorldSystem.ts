import * as CANNON from 'cannon-es';
import { world as ecsWorld } from '../world';
import { GameEntity, VehicleType, DroneSettings, PlaneSettings, CollisionGroups, collisionMasks, EntityType, PhysicsComponent } from '../types';
import { Vector3, Quaternion, Mesh, VertexBuffer } from '@babylonjs/core';
/**
 * Creates a system that manages the physics world for both client and server
 */
export function createPhysicsWorldSystem() {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.defaultContactMaterial.friction = 0.3;
    world.defaultContactMaterial.restitution = 0.3;

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
            friction: 0.0,
            restitution: 0.0,
            contactEquationStiffness: 1e9,
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
                world.removeBody(body);
                entityBodies.delete(entityId);
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
                    const position = mesh.getAbsolutePosition();
                    const rotation = mesh.rotationQuaternion || new Quaternion();

                    // Create a shape based on the mesh type
                    let shape: CANNON.Shape;
                    if (mesh.getClassName() === "SphereMesh") {
                        const radius = mesh.getBoundingInfo().boundingSphere.radius;
                        shape = new CANNON.Sphere(radius);
                    } else {
                        // Default to box for all other mesh types
                        const size = mesh.getBoundingInfo().boundingBox.extendSize;
                        shape = new CANNON.Box(new CANNON.Vec3(size.x, size.y, size.z));
                    }

                    // Add the shape to the body with the mesh's transform
                    body.addShape(shape, new CANNON.Vec3(position.x, position.y, position.z), 
                        new CANNON.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
                });
            } else {
                // Fallback to using the entity's bounding box
                const mesh = entity.render?.mesh;
                if (mesh) {
                    const size = mesh.getBoundingInfo().boundingBox.extendSize;
                    const shape = new CANNON.Box(new CANNON.Vec3(size.x, size.y, size.z));
                    body.addShape(shape);
                }
            }
            entity.physics = {
                body: body,
                ...physicsComponent
            };
            this.addBody(entity);
        },        
        createVehicleBody(
            vehicleType: VehicleType,
            position: Vector3,
            rotation: Quaternion,
        ): CANNON.Body {
            const body = new CANNON.Body({
                mass: vehicleType === VehicleType.Drone ? DroneSettings.mass : PlaneSettings.mass,
                material: vehicleMaterial,
                collisionFilterGroup: vehicleType === VehicleType.Drone ? CollisionGroups.Drones : CollisionGroups.Planes,
                collisionFilterMask: CollisionGroups.Environment | CollisionGroups.Drones | CollisionGroups.Planes,
                position: new CANNON.Vec3(position.x, position.y, position.z),
                quaternion: new CANNON.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
            });
        
            // Add collision shape based on vehicle type
            if (vehicleType === VehicleType.Drone) {
                const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.25, 0.5));
                body.addShape(shape);
            } else {
                const shape = new CANNON.Box(new CANNON.Vec3(1.5, 0.3, 0.5));
                body.addShape(shape);
            }
        
            return body;
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
        createProjectileBody(
            position: Vector3,
            direction: Vector3,
            speed: number
        ): CANNON.Body {
            const body = new CANNON.Body({
                mass: 0,
                material: projectileMaterial,
                position: new CANNON.Vec3(position.x, position.y, position.z),
                quaternion: new CANNON.Quaternion(0, 0, 0, 1)
            });
            const shape = new CANNON.Sphere(0.1);
            body.addShape(shape);
            return body;
        },
        // Create collider bodies from a collection of meshes
        createColliderBodies(meshes: Mesh[]): CANNON.Body[] {
            const bodies: CANNON.Body[] = [];
            console.log(meshes.length);
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
                    ),
                    collisionFilterGroup: CollisionGroups.Environment,
                    collisionFilterMask: collisionMasks.Environment
                });


                // Get vertices and indices from the mesh
                const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
                const indices = mesh.getIndices();
                
                if (positions && indices) {
                    // Convert Float32Array to number array for Trimesh
                    const vertices = Array.from(positions);
                    const indicesArray = Array.from(indices);
                    const shape = new CANNON.Trimesh(vertices, indicesArray);
                    body.addShape(shape);
                } else {
                    // For other meshes, use appropriate primitive shapes
                    if (mesh.getClassName() === "BoxMesh") {
                        const size = mesh.getBoundingInfo().boundingBox.extendSize;
                        const shape = new CANNON.Box(new CANNON.Vec3(size.x, size.y, size.z));
                        body.addShape(shape);
                    } else if (mesh.getClassName() === "SphereMesh") {
                        const radius = mesh.getBoundingInfo().boundingSphere.radius;
                        const shape = new CANNON.Sphere(radius);
                        body.addShape(shape);
                    } else if (mesh.getClassName() === "CylinderMesh") {
                        const size = mesh.getBoundingInfo().boundingBox.extendSize;
                        const shape = new CANNON.Cylinder(size.y, size.y, size.x * 2, 8);
                        body.addShape(shape);
                    } else {
                        // For other mesh types, use a box approximation but with more accurate size
                        const size = mesh.getBoundingInfo().boundingBox.extendSize;
                        const shape = new CANNON.Box(new CANNON.Vec3(size.x, size.y, size.z));
                        body.addShape(shape);
                    }
                }

                bodies.push(body);
                world.addBody(body);
            });

            return bodies;
        }
    };  
}