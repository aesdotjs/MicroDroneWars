import { Scene, AbstractMesh } from 'babylonjs';

export class CollisionManager {
    private scene: Scene;
    private environmentMeshes: Set<AbstractMesh> = new Set();

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public addEnvironmentMesh(mesh: AbstractMesh): void {
        this.environmentMeshes.add(mesh);
        mesh.checkCollisions = true;
    }

    public removeEnvironmentMesh(mesh: AbstractMesh): void {
        this.environmentMeshes.delete(mesh);
    }

    public getEnvironmentMeshes(): Set<AbstractMesh> {
        return this.environmentMeshes;
    }
} 