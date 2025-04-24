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
        environment: true,
        body: groundBody,
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        collisionGroup: CollisionGroups.Environment,
        collisionMask: CollisionGroups.Drones | CollisionGroups.Planes
    };
    
    // Add ground entity to ECS world
    ecsWorld.add(groundEntity);
    
    return {
        update: (dt: number) => {
            // Update ground entity position and rotation from physics body
            const ground = ecsWorld.with("environment", "body").first;
            if (ground) {
                ground.position = new Vector3(
                    ground.body!.position.x,
                    ground.body!.position.y,
                    ground.body!.position.z
                );
                ground.rotation = new Quaternion(
                    ground.body!.quaternion.x,
                    ground.body!.quaternion.y,
                    ground.body!.quaternion.z,
                    ground.body!.quaternion.w
                );
            }
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