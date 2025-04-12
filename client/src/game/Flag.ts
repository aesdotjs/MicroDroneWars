import { Vector3, Scene, Mesh, StandardMaterial, Color3 } from 'babylonjs';

export class Flag {
    x: number = 0;
    y: number = 0;
    z: number = 0;
    team: number = 0; // 0 for team A, 1 for team B
    carriedBy: string | null = null; // Session ID of vehicle carrying the flag
    atBase: boolean = true;
    private mesh: Mesh;

    constructor(scene: Scene, team: number) {
        this.mesh = Mesh.CreateBox("flag", 1, scene);
        const material = new StandardMaterial("flagMaterial", scene);
        material.diffuseColor = team === 0 ? new Color3(1, 0, 0) : new Color3(0, 0, 1);
        this.mesh.material = material;
    }

    getPosition(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    setPosition(position: Vector3): void {
        this.x = position.x;
        this.y = position.y;
        this.z = position.z;
        this.mesh.position = position;
    }

    isCarried(): boolean {
        return this.carriedBy !== null;
    }

    pickup(vehicleId: string): void {
        this.carriedBy = vehicleId;
        this.atBase = false;
    }

    drop(): void {
        this.carriedBy = null;
    }

    reset(): void {
        this.carriedBy = null;
        this.atBase = true;
    }

    public dispose(): void {
        this.mesh.dispose();
    }
} 