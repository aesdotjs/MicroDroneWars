import * as CANNON from 'cannon-es';
import { Vector3, Quaternion, Mesh, MeshBuilder, StandardMaterial, Color3 } from 'babylonjs';
import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';
import { CollisionGroups } from '../CollisionGroups';

/**
 * Creates a system that handles ground and environment physics
 */
export function createEnvironmentSystem(cannonWorld: CANNON.World) {
    // Create ground material
    const groundMaterial = new CANNON.Material('groundMaterial');
    
    // Create ground body
    const groundBody = new CANNON.Body({
        mass: 0,
        material: groundMaterial,
        collisionFilterGroup: CollisionGroups.Environment,
        collisionFilterMask: CollisionGroups.Drones | CollisionGroups.Planes,
        position: new CANNON.Vec3(0, 0, 0)
    });
    
    // Add ground shape
    const groundShape = new CANNON.Plane();
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    
    // Add ground body to world
    cannonWorld.addBody(groundBody);
    
    // Create ground entity
    const groundEntity: GameEntity = {
        id: 'ground',
        type: 'environment',
        transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
            velocity: Vector3.Zero(),
            angularVelocity: Vector3.Zero()
        },
        physics: {
            body: groundBody,
            mass: 0,
            drag: 0,
            angularDrag: 0,
            maxSpeed: 0,
            maxAngularSpeed: 0,
            maxAngularAcceleration: 0,
            angularDamping: 1,
            forceMultiplier: 0,
            thrust: 0,
            lift: 0,
            torque: 0,
        },
        gameState: {
            health: 100,
            maxHealth: 100,
            team: -1, // Environment team
            hasFlag: false,
            carryingFlag: false,
            atBase: true
        }
    };
    
    // Add ground entity to ECS world
    ecsWorld.add(groundEntity);
    
    return {
        update: (dt: number) => {
            
        }
    };
}

/**
 * Creates a visual representation of the ground
 */
export function createGroundMesh(scene: any): Mesh {
    const groundMesh = MeshBuilder.CreateGround("ground", {
        width: 200,
        height: 200,
        subdivisions: 1
    }, scene);

    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    groundMaterial.specularPower = 64;
    groundMaterial.ambientColor = new Color3(0.3, 0.3, 0.3);
    
    groundMesh.material = groundMaterial;
    groundMesh.position.y = 0;
    groundMesh.checkCollisions = true;
    groundMesh.receiveShadows = true;

    return groundMesh;
} 