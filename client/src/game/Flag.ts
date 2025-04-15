import { Vector3, Scene, Mesh, StandardMaterial, Color3 } from 'babylonjs';

/**
 * Represents a flag in the game that can be captured and carried by vehicles.
 * Each flag belongs to a team and can be in one of three states:
 * - At base
 * - Being carried by a vehicle
 * - Dropped
 */
export class Flag {
    /** X-coordinate of the flag's position */
    x: number = 0;
    /** Y-coordinate of the flag's position */
    y: number = 0;
    /** Z-coordinate of the flag's position */
    z: number = 0;
    /** Team number (0 for team A, 1 for team B) */
    team: number = 0;
    /** Session ID of the vehicle carrying the flag, null if not carried */
    carriedBy: string | null = null;
    /** Whether the flag is at its base */
    atBase: boolean = true;
    /** The 3D mesh representing the flag in the scene */
    private mesh: Mesh;

    /**
     * Creates a new Flag instance.
     * @param scene - The Babylon.js scene to add the flag to
     * @param team - The team number (0 for team A, 1 for team B)
     */
    constructor(scene: Scene, team: number) {
        this.mesh = Mesh.CreateBox("flag", 1, scene);
        const material = new StandardMaterial("flagMaterial", scene);
        material.diffuseColor = team === 0 ? new Color3(1, 0, 0) : new Color3(0, 0, 1);
        this.mesh.material = material;
    }

    /**
     * Gets the current position of the flag as a Vector3.
     * @returns The flag's position
     */
    getPosition(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    /**
     * Sets the position of the flag and updates its mesh.
     * @param position - The new position as a Vector3
     */
    setPosition(position: Vector3): void {
        this.x = position.x;
        this.y = position.y;
        this.z = position.z;
        this.mesh.position = position;
    }

    /**
     * Checks if the flag is currently being carried by a vehicle.
     * @returns True if the flag is being carried, false otherwise
     */
    isCarried(): boolean {
        return this.carriedBy !== null;
    }

    /**
     * Marks the flag as being carried by a vehicle.
     * @param vehicleId - The session ID of the vehicle picking up the flag
     */
    pickup(vehicleId: string): void {
        this.carriedBy = vehicleId;
        this.atBase = false;
    }

    /**
     * Drops the flag from the vehicle carrying it.
     */
    drop(): void {
        this.carriedBy = null;
    }

    /**
     * Resets the flag to its base state.
     */
    reset(): void {
        this.carriedBy = null;
        this.atBase = true;
    }

    /**
     * Disposes of the flag's mesh and resources.
     */
    public dispose(): void {
        this.mesh.dispose();
    }
} 