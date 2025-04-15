import { Scene, AbstractMesh } from 'babylonjs';

/**
 * Manages collision detection between game objects and the environment.
 * Handles registration and tracking of environment meshes for collision detection.
 */
export class CollisionManager {
    /** The Babylon.js scene containing the game objects */
    private scene: Scene;
    /** Set of meshes that make up the environment and can be collided with */
    private environmentMeshes: Set<AbstractMesh> = new Set();

    /**
     * Creates a new CollisionManager instance.
     * @param scene - The Babylon.js scene to manage collisions for
     */
    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Adds a mesh to the environment for collision detection.
     * @param mesh - The mesh to add to the environment
     */
    public addEnvironmentMesh(mesh: AbstractMesh): void {
        this.environmentMeshes.add(mesh);
        mesh.checkCollisions = true;
    }

    /**
     * Removes a mesh from the environment collision detection.
     * @param mesh - The mesh to remove from the environment
     */
    public removeEnvironmentMesh(mesh: AbstractMesh): void {
        this.environmentMeshes.delete(mesh);
    }

    /**
     * Gets all meshes that are part of the environment for collision detection.
     * @returns Set of environment meshes
     */
    public getEnvironmentMeshes(): Set<AbstractMesh> {
        return this.environmentMeshes;
    }
} 