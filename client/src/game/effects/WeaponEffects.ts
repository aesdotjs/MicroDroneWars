import { Scene, Vector3, Mesh, StandardMaterial, Color3, Color4, ParticleSystem, Texture, MeshBuilder, Quaternion } from 'babylonjs';
import { Weapon, Projectile } from '@shared/physics/types';
import { Projectile as ProjectileSchema } from "../schemas/Projectile";

/**
 * Manages visual effects for weapons and projectiles
 */
export class WeaponEffects {
    private scene: Scene;
    private muzzleFlashMaterial!: StandardMaterial;
    private bulletMaterial!: StandardMaterial;
    private missileMaterial!: StandardMaterial;
    private trailMaterial!: StandardMaterial;
    private muzzleFlashTexture!: Texture;
    private trailTexture!: Texture;
    private activeMuzzleFlashes: Map<string, Mesh> = new Map();
    private activeProjectiles: Map<string, Mesh> = new Map();
    private activeTrails: Map<string, ParticleSystem> = new Map();
    private projectileMesh: any;
    private particleSystem!: ParticleSystem;
    private muzzleFlash!: ParticleSystem;
    private impactEffect!: ParticleSystem;

    /**
     * Creates a new WeaponEffects instance
     * @param scene - The Babylon.js scene
     */
    constructor(scene: Scene) {
        this.scene = scene;
        this.initializeMaterials();
        this.setupParticleSystems();
    }

    /**
     * Initializes materials for weapon effects
     */
    private initializeMaterials(): void {
        // Muzzle flash material
        this.muzzleFlashMaterial = new StandardMaterial('muzzleFlashMaterial', this.scene);
        this.muzzleFlashMaterial.emissiveColor = new Color3(1, 0.7, 0.3);
        this.muzzleFlashMaterial.alpha = 0.8;
        this.muzzleFlashTexture = new Texture('assets/textures/muzzle_flash.png', this.scene);
        this.muzzleFlashMaterial.diffuseTexture = this.muzzleFlashTexture;

        // Bullet material
        this.bulletMaterial = new StandardMaterial('bulletMaterial', this.scene);
        this.bulletMaterial.emissiveColor = new Color3(1, 1, 0.3);
        this.bulletMaterial.alpha = 0.8;

        // Missile material
        this.missileMaterial = new StandardMaterial('missileMaterial', this.scene);
        this.missileMaterial.emissiveColor = new Color3(1, 0.3, 0.3);
        this.missileMaterial.alpha = 0.8;

        // Trail material
        this.trailMaterial = new StandardMaterial('trailMaterial', this.scene);
        this.trailMaterial.emissiveColor = new Color3(1, 0.5, 0.2);
        this.trailMaterial.alpha = 0.6;
        this.trailTexture = new Texture('assets/textures/trail.png', this.scene);
        this.trailMaterial.diffuseTexture = this.trailTexture;
    }

    private setupParticleSystems() {
        // Projectile trail particles
        this.particleSystem = new ParticleSystem("projectileTrail", 2000, this.scene);
        this.particleSystem.particleTexture = new Texture("textures/flare.png", this.scene);
        this.particleSystem.emitter = new Vector3(0, 0, 0);
        this.particleSystem.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
        this.particleSystem.maxEmitBox = new Vector3(0.1, 0.1, 0.1);
        this.particleSystem.color1 = new Color4(1, 0.5, 0, 1);
        this.particleSystem.color2 = new Color4(1, 0.5, 0, 0.5);
        this.particleSystem.colorDead = new Color4(0, 0, 0, 0);
        this.particleSystem.minSize = 0.1;
        this.particleSystem.maxSize = 0.3;
        this.particleSystem.minLifeTime = 0.1;
        this.particleSystem.maxLifeTime = 0.3;
        this.particleSystem.emitRate = 100;
        this.particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        this.particleSystem.gravity = new Vector3(0, 0, 0);
        this.particleSystem.direction1 = new Vector3(-1, -1, -1);
        this.particleSystem.direction2 = new Vector3(1, 1, 1);
        this.particleSystem.minAngularSpeed = 0;
        this.particleSystem.maxAngularSpeed = Math.PI;
        this.particleSystem.minEmitPower = 1;
        this.particleSystem.maxEmitPower = 3;
        this.particleSystem.updateSpeed = 0.01;

        // Muzzle flash particles
        this.muzzleFlash = new ParticleSystem("muzzleFlash", 100, this.scene);
        this.muzzleFlash.particleTexture = new Texture("textures/flare.png", this.scene);
        this.muzzleFlash.emitter = new Vector3(0, 0, 0);
        this.muzzleFlash.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
        this.muzzleFlash.maxEmitBox = new Vector3(0.1, 0.1, 0.1);
        this.muzzleFlash.color1 = new Color4(1, 0.8, 0, 1);
        this.muzzleFlash.color2 = new Color4(1, 0.8, 0, 0.5);
        this.muzzleFlash.colorDead = new Color4(0, 0, 0, 0);
        this.muzzleFlash.minSize = 0.2;
        this.muzzleFlash.maxSize = 0.5;
        this.muzzleFlash.minLifeTime = 0.05;
        this.muzzleFlash.maxLifeTime = 0.1;
        this.muzzleFlash.emitRate = 1000;
        this.muzzleFlash.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        this.muzzleFlash.gravity = new Vector3(0, 0, 0);
        this.muzzleFlash.direction1 = new Vector3(-1, -1, -1);
        this.muzzleFlash.direction2 = new Vector3(1, 1, 1);
        this.muzzleFlash.minAngularSpeed = 0;
        this.muzzleFlash.maxAngularSpeed = Math.PI;
        this.muzzleFlash.minEmitPower = 1;
        this.muzzleFlash.maxEmitPower = 3;
        this.muzzleFlash.updateSpeed = 0.01;

        // Impact effect particles
        this.impactEffect = new ParticleSystem("impactEffect", 500, this.scene);
        this.impactEffect.particleTexture = new Texture("textures/flare.png", this.scene);
        this.impactEffect.emitter = new Vector3(0, 0, 0);
        this.impactEffect.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
        this.impactEffect.maxEmitBox = new Vector3(0.2, 0.2, 0.2);
        this.impactEffect.color1 = new Color4(1, 0.5, 0, 1);
        this.impactEffect.color2 = new Color4(1, 0.5, 0, 0.5);
        this.impactEffect.colorDead = new Color4(0, 0, 0, 0);
        this.impactEffect.minSize = 0.2;
        this.impactEffect.maxSize = 0.5;
        this.impactEffect.minLifeTime = 0.1;
        this.impactEffect.maxLifeTime = 0.3;
        this.impactEffect.emitRate = 1000;
        this.impactEffect.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        this.impactEffect.gravity = new Vector3(0, 0, 0);
        this.impactEffect.direction1 = new Vector3(-1, -1, -1);
        this.impactEffect.direction2 = new Vector3(1, 1, 1);
        this.impactEffect.minAngularSpeed = 0;
        this.impactEffect.maxAngularSpeed = Math.PI;
        this.impactEffect.minEmitPower = 1;
        this.impactEffect.maxEmitPower = 3;
        this.impactEffect.updateSpeed = 0.01;
    }

    /**
     * Creates a muzzle flash effect
     * @param position - Position of the muzzle flash
     * @param direction - Direction the weapon is facing
     * @param weaponId - ID of the weapon
     */
    public createMuzzleFlash(position: Vector3, direction: Vector3, weaponId: string): void {
        // Remove existing muzzle flash if any
        this.removeMuzzleFlash(weaponId);

        // Create muzzle flash mesh
        const muzzleFlash = MeshBuilder.CreatePlane('muzzleFlash', { size: 0.5 }, this.scene);
        muzzleFlash.position = position;
        muzzleFlash.material = this.muzzleFlashMaterial;

        // Orient muzzle flash to face camera
        const camera = this.scene.activeCamera;
        if (camera) {
            muzzleFlash.lookAt(camera.position);
        }

        // Store reference
        this.activeMuzzleFlashes.set(weaponId, muzzleFlash);

        // Remove after short duration
        setTimeout(() => this.removeMuzzleFlash(weaponId), 50);
    }

    /**
     * Creates a projectile mesh
     * @param projectile - The projectile data
     */
    public createProjectileMesh(projectile: Projectile): void {
        // Remove existing projectile if any
        this.removeProjectileMesh(projectile.id);

        // Create projectile mesh based on type
        let projectileMesh: Mesh;
        if (projectile.type === 'bullet') {
            projectileMesh = MeshBuilder.CreateSphere('bullet', { diameter: 0.2 }, this.scene);
            projectileMesh.material = this.bulletMaterial;
        } else {
            projectileMesh = MeshBuilder.CreateBox('missile', { size: 0.4 }, this.scene);
            projectileMesh.material = this.missileMaterial;
        }

        // Set position and rotation
        projectileMesh.position = projectile.position;
        const direction = projectile.direction;
        const rotation = Quaternion.FromLookDirectionLH(direction, Vector3.Up());
        projectileMesh.rotationQuaternion = rotation;

        // Store reference
        this.activeProjectiles.set(projectile.id, projectileMesh);

        // Create trail effect
        this.createTrailEffect(projectile);
    }

    /**
     * Creates a trail effect for a projectile
     * @param projectile - The projectile data
     */
    private createTrailEffect(projectile: Projectile): void {
        const trail = new ParticleSystem('trail', 100, this.scene);
        trail.particleTexture = this.trailTexture;
        trail.emitter = this.activeProjectiles.get(projectile.id)!;
        trail.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
        trail.maxEmitBox = new Vector3(0.1, 0.1, 0.1);
        trail.color1 = new Color4(1, 0.5, 0.2, 1);
        trail.color2 = new Color4(1, 0.2, 0.1, 1);
        trail.colorDead = new Color4(0, 0, 0, 0);
        trail.minSize = 0.1;
        trail.maxSize = 0.3;
        trail.minLifeTime = 0.1;
        trail.maxLifeTime = 0.3;
        trail.emitRate = 100;
        trail.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        trail.gravity = new Vector3(0, 0, 0);
        trail.direction1 = new Vector3(-0.5, -0.5, -0.5);
        trail.direction2 = new Vector3(0.5, 0.5, 0.5);
        trail.minAngularSpeed = 0;
        trail.maxAngularSpeed = Math.PI;
        trail.minEmitPower = 0.1;
        trail.maxEmitPower = 0.5;
        trail.updateSpeed = 0.01;
        trail.start();

        // Store reference
        this.activeTrails.set(projectile.id, trail);
    }

    /**
     * Updates projectile positions
     * @param projectiles - Map of projectile IDs to their positions
     */
    public updateProjectiles(projectiles: Map<string, Vector3>): void {
        projectiles.forEach((position, id) => {
            const mesh = this.activeProjectiles.get(id);
            if (mesh) {
                mesh.position = position;
            }
        });
    }

    /**
     * Removes a muzzle flash effect
     * @param weaponId - ID of the weapon
     */
    public removeMuzzleFlash(weaponId: string): void {
        const muzzleFlash = this.activeMuzzleFlashes.get(weaponId);
        if (muzzleFlash) {
            muzzleFlash.dispose();
            this.activeMuzzleFlashes.delete(weaponId);
        }
    }

    /**
     * Removes a projectile mesh and its trail
     * @param projectileId - ID of the projectile
     */
    public removeProjectileMesh(projectileId: string): void {
        const projectile = this.activeProjectiles.get(projectileId);
        if (projectile) {
            projectile.dispose();
            this.activeProjectiles.delete(projectileId);
        }

        const trail = this.activeTrails.get(projectileId);
        if (trail) {
            trail.stop();
            trail.dispose();
            this.activeTrails.delete(projectileId);
        }
    }

    /**
     * Cleans up all effects
     */
    public cleanup(): void {
        // Clean up all active effects
        this.activeMuzzleFlashes.forEach(muzzleFlash => {
            muzzleFlash.dispose();
        });
        this.activeProjectiles.forEach(projectile => {
            projectile.dispose();
        });
        this.activeTrails.forEach(trail => {
            trail.stop();
            trail.dispose();
        });

        // Clear all maps
        this.activeMuzzleFlashes.clear();
        this.activeProjectiles.clear();
        this.activeTrails.clear();

        // Dispose of materials
        if (this.muzzleFlashMaterial) {
            this.muzzleFlashMaterial.dispose();
        }
        if (this.bulletMaterial) {
            this.bulletMaterial.dispose();
        }
        if (this.missileMaterial) {
            this.missileMaterial.dispose();
        }
        if (this.trailMaterial) {
            this.trailMaterial.dispose();
        }

        // Dispose of textures
        if (this.muzzleFlashTexture) {
            this.muzzleFlashTexture.dispose();
        }
        if (this.trailTexture) {
            this.trailTexture.dispose();
        }

        // Dispose of particle systems
        if (this.particleSystem) {
            this.particleSystem.dispose();
        }
        if (this.muzzleFlash) {
            this.muzzleFlash.dispose();
        }
        if (this.impactEffect) {
            this.impactEffect.dispose();
        }
    }

    public updateProjectilePosition(position: Vector3) {
        if (this.projectileMesh) {
            this.projectileMesh.position = position;
        }
    }

    public playMuzzleFlash(position: Vector3) {
        this.muzzleFlash.emitter = position;
        this.muzzleFlash.start();
        setTimeout(() => {
            this.muzzleFlash.stop();
        }, 100);
    }

    public playImpactEffect(position: Vector3) {
        this.impactEffect.emitter = position;
        this.impactEffect.start();
        setTimeout(() => {
            this.impactEffect.stop();
        }, 300);
    }

    public update(deltaTime: number) {
        // Update particle systems
        this.particleSystem.updateSpeed = deltaTime;
        this.muzzleFlash.updateSpeed = deltaTime;
        this.impactEffect.updateSpeed = deltaTime;
    }

    public dispose() {
        this.cleanup();
    }
} 