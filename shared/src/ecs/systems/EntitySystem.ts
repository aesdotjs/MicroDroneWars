import { GameEntity, EntityType } from '../types';
import { Vector3, Quaternion, MeshBuilder, Scene, Color4, StandardMaterial, Color3, MultiMaterial, ParticleSystem, Texture } from '@babylonjs/core';
import { DefaultWeapons } from '../types';
import { VehicleType, ProjectileType } from '../types';
export function createEntitySystem() {
    return {
        createVehicleEntity: (
            id: string,
            vehicleType: VehicleType,
            position: Vector3,
            rotation: Quaternion,
            team: number
        ): GameEntity => {
            
            // Create entity
            return {
                id,
                type: EntityType.Vehicle,
                transform: {
                    position: position.clone(),
                    rotation: rotation.clone(),
                    velocity: new Vector3(0, 0, 0),
                    angularVelocity: new Vector3(0, 0, 0)
                },
                vehicle: {
                    vehicleType,
                    weapons: Object.values(DefaultWeapons).map((w, i) => ({...w, id: `${id}-weapon-${i}`})),
                    activeWeaponIndex: 0
                },
                gameState: {
                    health: 100,
                    maxHealth: vehicleType === VehicleType.Drone ? 150 : 100,
                    team,
                    hasFlag: false,
                    carryingFlag: false,
                    carriedBy: "",
                    atBase: true
                },
                tick: {
                    tick: 0,
                    timestamp: Date.now(),
                    lastProcessedInputTimestamp: 0,
                    lastProcessedInputTick: 0
                }
            };
        },
        createProjectileEntity: (
            id: string,
            sourceId: string,
            position: Vector3,
            direction: Vector3,
            speed: number,
            damage: number,
            range: number,
            type: ProjectileType
        ): GameEntity => {
            return {
                id,
                type: EntityType.Projectile,
                transform: {
                    position: position.clone(),
                    rotation: new Quaternion(0, 0, 0, 1),
                    velocity: direction.scale(speed),
                    angularVelocity: new Vector3(0, 0, 0)
                },
                projectile: {
                    projectileType: type,
                    damage,
                    range,
                    distanceTraveled: 0,
                    sourceId,
                },
                tick: {
                    tick: 0,
                    timestamp: Date.now(),
                    lastProcessedInputTimestamp: 0,
                    lastProcessedInputTick: 0
                }
            };
        },
        createFlagEntity: (
            id: string,
            team: number,
            position: Vector3
        ): GameEntity => {
            return {
                id,
                type: EntityType.Flag,
                transform: {
                    position: position.clone(),
                    rotation: new Quaternion(0, 0, 0, 1),
                    velocity: new Vector3(0, 0, 0),
                    angularVelocity: new Vector3(0, 0, 0)
                },
                gameState: {
                    health: 100,
                    maxHealth: 100,
                    team,
                    hasFlag: false,
                    carryingFlag: false,
                    carriedBy: "",
                    atBase: true
                },
                tick: {
                    tick: 0,
                    timestamp: Date.now(),
                    lastProcessedInputTimestamp: 0,
                    lastProcessedInputTick: 0
                }
            };
        },
        createEnvironmentEntity: (
            id: string,
            position: Vector3
        ): GameEntity => {
            return {
                id,
                type: EntityType.Environment,
                transform: {
                    position: position.clone(),
                    rotation: new Quaternion(0, 0, 0, 1),
                    velocity: new Vector3(0, 0, 0),
                    angularVelocity: new Vector3(0, 0, 0)
                },
            };
        }
    };
}


/**
 * Creates a drone mesh with propellers and particle effects
 */
export function createDroneMesh(entity: GameEntity, scene: Scene) {
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
    mesh.position = new Vector3(entity.transform!.position.x, entity.transform!.position.y, entity.transform!.position.z);
    mesh.rotationQuaternion = new Quaternion(entity.transform!.rotation.x, entity.transform!.rotation.y, entity.transform!.rotation.z, entity.transform!.rotation.w);
    mesh.isVisible = true;
    mesh.checkCollisions = true;
    mesh.receiveShadows = true;

    entity.render = { mesh };
}

/**
 * Creates a plane mesh with control surfaces
 */
export function createPlaneMesh(entity: GameEntity, scene: Scene) {
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
    mesh.position = new Vector3(entity.transform!.position.x, entity.transform!.position.y, entity.transform!.position.z);
    mesh.rotationQuaternion = new Quaternion(entity.transform!.rotation.x, entity.transform!.rotation.y, entity.transform!.rotation.z, entity.transform!.rotation.w);
    mesh.isVisible = true;
    mesh.checkCollisions = true;

    entity.render = { mesh };
} 