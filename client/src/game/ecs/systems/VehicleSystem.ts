import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';
import { Vector3, Quaternion, Mesh, Scene, MeshBuilder, StandardMaterial, Color3, MultiMaterial, Color4, ParticleSystem, Texture, Matrix } from 'babylonjs';
import { CollisionGroups } from '@shared/physics/CollisionGroups';

/**
 * Creates a system that handles vehicle creation and management
 */
export function createVehicleSystem(scene: Scene) {
    const vehicles = ecsWorld.with("drone", "plane", "position", "rotation", "mesh");
    const particleSystems = new Map<string, {
        frontLeft: ParticleSystem;
        frontRight: ParticleSystem;
        backLeft: ParticleSystem;
        backRight: ParticleSystem;
    }>();

    return {
        createVehicle: (id: string, type: 'drone' | 'plane', team: number) => {
            const entity: GameEntity = {
                id,
                type,
                [type]: true,
                team,
                health: type === 'drone' ? 150 : 200,
                maxHealth: type === 'drone' ? 150 : 200,
                position: new Vector3(0, type === 'drone' ? 10 : 50, 0),
                rotation: new Quaternion(0, 0, 0, 1),
                velocity: new Vector3(0, 0, 0),
                angularVelocity: new Vector3(0, 0, 0),
                maxSpeed: type === 'drone' ? 5 : 8,
                thrust: type === 'drone' ? 10 : 15,
                lift: type === 'drone' ? 5 : 10,
                torque: type === 'drone' ? 1 : 2,
                strafeForce: type === 'drone' ? 5 : 3,
                minHeight: type === 'drone' ? 0 : 20,
                collisionGroup: type === 'drone' ? CollisionGroups.Drones : CollisionGroups.Planes,
                collisionMask: CollisionGroups.Drones | CollisionGroups.Planes | CollisionGroups.Environment | CollisionGroups.Projectiles | CollisionGroups.Flags
            };

            // Create mesh
            if (type === 'drone') {
                createDroneMesh(entity, scene);
            } else {
                createPlaneMesh(entity, scene);
            }

            ecsWorld.add(entity);
            return entity;
        },

        update: (dt: number) => {
            for (const entity of vehicles) {
                if (!entity.mesh) continue;

                // Update mesh position and rotation
                entity.mesh.position = entity.position!;
                entity.mesh.rotationQuaternion = entity.rotation!;

                // Update control surfaces for planes
                if (entity.plane && entity.mesh.getChildMeshes) {
                    const controlSurfaces = entity.mesh.getChildMeshes();
                    const input = entity.input;

                    if (input && controlSurfaces.length > 0) {
                        // Update wing angles for roll
                        const leftWing = controlSurfaces.find(m => m.name === 'leftWing');
                        const rightWing = controlSurfaces.find(m => m.name === 'rightWing');
                        const tail = controlSurfaces.find(m => m.name === 'tail');

                        if (leftWing && rightWing) {
                            const rollAmount = (input.rollLeft ? 1 : 0) - (input.rollRight ? 1 : 0);
                            leftWing.rotation.z = rollAmount * 0.5;
                            rightWing.rotation.z = -rollAmount * 0.5;
                        }

                        if (tail) {
                            const pitchAmount = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0);
                            const yawAmount = (input.yawLeft ? 1 : 0) - (input.yawRight ? 1 : 0);
                            tail.rotation.x = pitchAmount * 0.5;
                            tail.rotation.y = yawAmount * 0.5;
                        }
                    }
                }

                // Update particle effects for drones
                if (entity.drone && entity.mesh.getChildMeshes) {
                    const thrusters = entity.mesh.getChildMeshes().filter(m => m.name.startsWith('thruster'));
                    const input = entity.input;

                    if (input && thrusters.length > 0) {
                        const thrust = (input.forward ? 1 : 0) + (input.up ? 1 : 0);
                        thrusters.forEach(thruster => {
                            const particleSystem = thruster.getChildMeshes().find(m => m.name.startsWith('particles'));
                            if (particleSystem) {
                                (particleSystem as any).emitRate = 250 + (thrust * 250);
                            }
                        });
                    }
                }
            }
        },

        cleanup: (entity: GameEntity) => {
            if (entity.mesh) {
                entity.mesh.dispose();
            }

            // Clean up particle systems
            const particleSystem = particleSystems.get(entity.id);
            if (particleSystem) {
                Object.values(particleSystem).forEach(system => {
                    system.dispose();
                });
                particleSystems.delete(entity.id);
            }
        }
    };
}

/**
 * Creates a drone mesh with propellers and particle effects
 */
function createDroneMesh(entity: GameEntity, scene: Scene) {
    // Create main body
    const mesh = MeshBuilder.CreateBox("droneBody", {
        width: 1,
        height: 0.3,
        depth: 1,
        faceColors: [
            new Color4(0, 1, 1, 1),    // Right face (Cyan)
            new Color4(1, 0, 1, 1),    // Left face (Magenta)
            new Color4(0, 1, 0, 1),    // Top face (Green)
            new Color4(1, 1, 0, 1),    // Bottom face (Yellow)
            new Color4(1, 0, 0, 1),    // Front face (Red)
            new Color4(0, 0, 1, 1)     // Back face (Blue)
        ]
    }, scene);

    // Create materials
    const materials = {
        front: new StandardMaterial("frontMaterial", scene),
        back: new StandardMaterial("backMaterial", scene),
        top: new StandardMaterial("topMaterial", scene),
        bottom: new StandardMaterial("bottomMaterial", scene),
        left: new StandardMaterial("leftMaterial", scene),
        right: new StandardMaterial("rightMaterial", scene)
    };

    // Set material colors
    materials.front.diffuseColor = new Color3(1, 0, 0);
    materials.back.diffuseColor = new Color3(0, 0, 1);
    materials.top.diffuseColor = new Color3(0, 1, 0);
    materials.bottom.diffuseColor = new Color3(1, 1, 0);
    materials.left.diffuseColor = new Color3(1, 0, 1);
    materials.right.diffuseColor = new Color3(0, 1, 1);

    // Create multi-material
    const multiMaterial = new MultiMaterial("droneMultiMaterial", scene);
    multiMaterial.subMaterials = [
        materials.right,
        materials.left,
        materials.top,
        materials.bottom,
        materials.front,
        materials.back
    ];

    mesh.material = multiMaterial;

    // Create propellers
    const propPositions = [
        new Vector3(-0.5, 0, 0.5),   // Front left
        new Vector3(0.5, 0, 0.5),    // Front right
        new Vector3(-0.5, 0, -0.5),  // Back left
        new Vector3(0.5, 0, -0.5)    // Back right
    ];

    const propMaterial = new StandardMaterial("propMaterial", scene);
    propMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
    propMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);

    propPositions.forEach((pos, i) => {
        const prop = MeshBuilder.CreateCylinder(`propeller${i}`, {
            height: 0.05,
            diameter: 0.2,
            tessellation: 8
        }, scene);
        prop.position = pos;
        prop.material = propMaterial;
        prop.parent = mesh;

        // Create thruster particle system
        const thruster = MeshBuilder.CreateBox(`thruster${i}`, {
            size: 0.01
        }, scene);
        thruster.position = pos;
        thruster.parent = mesh;
        thruster.isVisible = false;

        const particles = new ParticleSystem(`particles${i}`, 5000, scene);
        particles.particleTexture = new Texture("/assets/textures/flare.png", scene);
        particles.minEmitBox = new Vector3(-0.05, -0.05, -0.05);
        particles.maxEmitBox = new Vector3(0.05, 0.05, 0.05);
        particles.color1 = new Color4(1, 1, 1, 1);
        particles.color2 = new Color4(1, 1, 1, 1);
        particles.colorDead = new Color4(1, 1, 1, 0);
        particles.minSize = 0.025;
        particles.maxSize = 0.1;
        particles.minLifeTime = 0.033;
        particles.maxLifeTime = 0.083;
        particles.emitRate = 250;
        particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        particles.gravity = new Vector3(0, -1, 0);
        particles.direction1 = new Vector3(0, -1, 0);
        particles.direction2 = new Vector3(0, -1, 0);
        particles.minEmitPower = 3;
        particles.maxEmitPower = 5;
        particles.updateSpeed = 0.01;
        particles.emitter = thruster;
        particles.start();
    });

    // Add front indicator
    const arrow = MeshBuilder.CreateCylinder("frontArrow", {
        height: 0.3,
        diameter: 0.05,
        tessellation: 8
    }, scene);
    arrow.position = new Vector3(0, 0.2, 0.5);
    arrow.rotation.x = Math.PI / 2;
    arrow.material = materials.front;
    arrow.parent = mesh;

    // Set initial position and make visible
    mesh.position = new Vector3(0, 10, 0);
    mesh.isVisible = true;
    mesh.checkCollisions = true;
    mesh.receiveShadows = true;

    entity.mesh = mesh;
}

/**
 * Creates a plane mesh with control surfaces
 */
function createPlaneMesh(entity: GameEntity, scene: Scene) {
    // Create main fuselage
    const mesh = MeshBuilder.CreateBox('plane', { 
        width: 0.3, 
        height: 0.3, 
        depth: 1,
        faceColors: [
            new Color4(0.5, 0.5, 0.5, 1),    // Right face
            new Color4(0.5, 0.5, 0.5, 1),    // Left face
            new Color4(0.5, 0.5, 0.5, 1),    // Top face
            new Color4(0.5, 0.5, 0.5, 1),    // Bottom face
            new Color4(1, 0, 0, 1),          // Front face (Red)
            new Color4(0, 0, 1, 1)           // Back face (Blue)
        ]
    }, scene);

    // Create materials
    const frontMaterial = new StandardMaterial("frontMaterial", scene);
    frontMaterial.diffuseColor = new Color3(1, 0, 0);
    frontMaterial.backFaceCulling = false;

    const backMaterial = new StandardMaterial("backMaterial", scene);
    backMaterial.diffuseColor = new Color3(0, 0, 1);
    backMaterial.backFaceCulling = false;

    const bodyMaterial = new StandardMaterial("bodyMaterial", scene);
    bodyMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
    bodyMaterial.backFaceCulling = false;

    // Create multi-material
    const multiMaterial = new MultiMaterial("planeMultiMaterial", scene);
    multiMaterial.subMaterials = [
        bodyMaterial, // Right
        bodyMaterial, // Left
        bodyMaterial, // Top
        bodyMaterial, // Bottom
        frontMaterial, // Front
        backMaterial  // Back
    ];

    mesh.material = multiMaterial;

    // Create wings
    const wingMaterial = new StandardMaterial("wingMaterial", scene);
    wingMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
    wingMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);

    // Left wing
    const leftWing = MeshBuilder.CreateBox("leftWing", {
        width: 0.3,
        height: 0.1,
        depth: 1.5
    }, scene);
    leftWing.position = new Vector3(-0.90, 0, 0);
    leftWing.rotation.y = Math.PI / 2;
    leftWing.material = wingMaterial;
    leftWing.parent = mesh;

    // Right wing
    const rightWing = MeshBuilder.CreateBox("rightWing", {
        width: 0.3,
        height: 0.1,
        depth: 1.5
    }, scene);
    rightWing.position = new Vector3(0.90, 0, 0);
    rightWing.rotation.y = Math.PI / 2;
    rightWing.material = wingMaterial;
    rightWing.parent = mesh;

    // Tail
    const tail = MeshBuilder.CreateBox("tail", {
        width: 0.1,
        height: 0.1,
        depth: 0.5
    }, scene);
    tail.position = new Vector3(0, 0, -1);
    tail.material = wingMaterial;
    tail.parent = mesh;

    // Add front indicator
    const arrow = MeshBuilder.CreateCylinder("frontArrow", {
        height: 0.3,
        diameter: 0.05,
        tessellation: 8
    }, scene);
    arrow.position = new Vector3(0, 0.2, 0.5);
    arrow.rotation.x = Math.PI / 2;
    arrow.material = frontMaterial;
    arrow.parent = mesh;

    // Set initial position and make visible
    mesh.position = new Vector3(0, 50, 0);
    mesh.isVisible = true;
    mesh.checkCollisions = true;

    entity.mesh = mesh;
} 