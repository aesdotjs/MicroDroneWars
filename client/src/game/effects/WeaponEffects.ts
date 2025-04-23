import { Scene, Vector3, Mesh, StandardMaterial, Color3, Color4, ParticleSystem, Texture, MeshBuilder, Quaternion, Camera, TrailMesh, TransformNode } from 'babylonjs';
import { Projectile } from '@shared/physics/types';

/**
 * Manages visual effects for weapons and projectiles
 */
export class WeaponEffects {
    private scene: Scene;
    private muzzleFlashMaterial!: StandardMaterial;
    private bulletMaterial!: StandardMaterial;
    private missileMaterial!: StandardMaterial;
    private trailMaterial!: StandardMaterial;
    private impactMaterial!: StandardMaterial;
    private muzzleFlashTexture!: Texture;
    private trailTexture!: Texture;
    private impactTexture!: Texture;
    private activeMuzzleFlashes: Map<string, Mesh> = new Map();
    private activeProjectiles: Map<string, Mesh> = new Map();
    private activeTrails: Map<string, TrailMesh> = new Map();
    private activeImpacts: Map<string, ParticleSystem> = new Map();
    private muzzleFlashTimeouts: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Creates a new WeaponEffects instance
     * @param scene - The Babylon.js scene
     */
    constructor(scene: Scene) {
        this.scene = scene;
        this.initializeMaterials();
    }

    /**
     * Initializes materials for weapon effects
     */
    private initializeMaterials(): void {
        // Muzzle flash material
        this.muzzleFlashMaterial = new StandardMaterial('muzzleFlashMaterial', this.scene);
        this.muzzleFlashMaterial.diffuseColor = new Color3(1, 1, 1); // White base color
        this.muzzleFlashMaterial.specularColor = new Color3(0, 0, 0); // No specular
        this.muzzleFlashMaterial.emissiveColor = new Color3(1, 0.7, 0.3); // Orange glow
        this.muzzleFlashMaterial.alpha = 0.8;
        this.muzzleFlashTexture = new Texture('/assets/textures/muzzle_flash.png', this.scene);
        this.muzzleFlashMaterial.diffuseTexture = this.muzzleFlashTexture;
        this.muzzleFlashMaterial.diffuseTexture.hasAlpha = true;
        this.muzzleFlashMaterial.useAlphaFromDiffuseTexture = true;
        this.muzzleFlashMaterial.backFaceCulling = false;
        this.muzzleFlashMaterial.separateCullingPass = true;

        // Bullet material
        this.bulletMaterial = new StandardMaterial('bulletMaterial', this.scene);
        this.bulletMaterial.emissiveColor = new Color3(1, 1, 0.3);
        this.bulletMaterial.diffuseColor = new Color3(1, 1, 0.3);
        this.bulletMaterial.specularColor = new Color3(0, 0, 0);
        this.bulletMaterial.alpha = 0.8;

        // Missile material
        this.missileMaterial = new StandardMaterial('missileMaterial', this.scene);
        this.missileMaterial.emissiveColor = new Color3(1, 0.3, 0.3);
        this.missileMaterial.diffuseColor = new Color3(1, 0.3, 0.3);
        this.missileMaterial.specularColor = new Color3(0, 0, 0);
        this.missileMaterial.alpha = 0.8;

        // Trail material
        this.trailMaterial = new StandardMaterial('trailMaterial', this.scene);
        this.trailMaterial.disableLighting = true;
        this.trailMaterial.emissiveColor = new Color3(1, 0.5, 0.2);
        this.trailMaterial.diffuseColor = new Color3(1, 0.5, 0.2);
        this.trailMaterial.specularColor = new Color3(0, 0, 0);
        this.trailMaterial.alpha = 0.8;
        this.trailMaterial.backFaceCulling = false;

        // Impact material
        this.impactMaterial = new StandardMaterial('impactMaterial', this.scene);
        this.impactMaterial.emissiveColor = new Color3(1, 0.3, 0.1);
        this.impactMaterial.alpha = 0.8;
        this.impactTexture = new Texture('/assets/textures/impact.png', this.scene);
        this.impactMaterial.diffuseTexture = this.impactTexture;
        this.impactMaterial.useAlphaFromDiffuseTexture = true;
    }

    /**
     * Creates a muzzle flash effect
     * @param position - World position of the muzzle flash
     * @param direction - Direction the weapon is facing
     * @param weaponId - ID of the weapon
     */
    public createMuzzleFlash(position: Vector3, direction: Vector3, weaponId: string): void {
        // Clear any existing timeout for this weapon
        const existingTimeout = this.muzzleFlashTimeouts.get(weaponId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            this.muzzleFlashTimeouts.delete(weaponId);
        }

        // Remove existing muzzle flash if any
        this.removeMuzzleFlash(weaponId);

        // Create muzzle flash mesh
        const muzzleFlash = MeshBuilder.CreatePlane('muzzleFlash', { size: 1.0 }, this.scene);
        muzzleFlash.position = position;
        muzzleFlash.material = this.muzzleFlashMaterial;

        // Use billboard mode for better visibility from all angles
        muzzleFlash.billboardMode = Mesh.BILLBOARDMODE_ALL;
        muzzleFlash.rotation.y = Math.PI; // Flip the texture to face forward

        // Store reference
        this.activeMuzzleFlashes.set(weaponId, muzzleFlash);

        // Set timeout to remove the muzzle flash if it hasn't been replaced
        const timeout = setTimeout(() => {
            // Only remove if this is still the current muzzle flash
            if (this.activeMuzzleFlashes.get(weaponId) === muzzleFlash) {
                this.removeMuzzleFlash(weaponId);
            }
        }, 50);
        this.muzzleFlashTimeouts.set(weaponId, timeout);
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
            // Create a small box for bullets
            projectileMesh = MeshBuilder.CreateBox('bullet', { 
                width: 0.05,  // Small width
                height: 0.05, // Small height
                depth: 0.4   // Longer depth for bullet shape
            }, this.scene);
            projectileMesh.material = this.bulletMaterial;
        } else {
            projectileMesh = MeshBuilder.CreateBox('missile', { size: 0.2 }, this.scene);
            projectileMesh.material = this.missileMaterial;
        }

        // Set position and rotation
        projectileMesh.position = projectile.position;
        const direction = projectile.direction.normalize();
        const rotation = Quaternion.FromLookDirectionLH(direction, Vector3.Up());
        projectileMesh.rotationQuaternion = rotation;

        // Store reference
        this.activeProjectiles.set(projectile.id, projectileMesh);

        // Create trail effect
        this.createTrailEffect(projectile, projectileMesh);
    }

    /**
     * Creates a trail effect for a projectile
     * @param projectile - The projectile data
     * @param sourceMesh - The mesh to follow
     */
    private createTrailEffect(projectile: Projectile, sourceMesh: Mesh): void {
        // Remove existing trail if any
        sourceMesh.computeWorldMatrix();
        this.removeTrailEffect(projectile.id);
        // Create trail mesh with simpler parameters
        const trail = new TrailMesh(
            `trail_${projectile.id}`,
            sourceMesh,  // Use the projectile mesh directly
            this.scene,
            0.1,  // diameter
            15,   // length
            true  // autoStart
        );

        // Use the shared trail material
        trail.material = this.trailMaterial;
        // Store reference
        this.activeTrails.set(projectile.id, trail);
    }

    /**
     * Updates a single projectile's position
     * @param id - ID of the projectile to update
     * @param position - New position of the projectile
     */
    public updateProjectilePosition(id: string, position: Vector3): void {
        const projectile = this.activeProjectiles.get(id);
        if (projectile) {
            // Update projectile position
            projectile.position = position;
            // Trail will automatically follow since it's parented
        }
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

        this.removeTrailEffect(projectileId);
    }

    /**
     * Removes a trail effect
     * @param projectileId - ID of the projectile
     */
    private removeTrailEffect(projectileId: string): void {
        const trail = this.activeTrails.get(projectileId);
        if (trail) {
            trail.dispose();
            this.activeTrails.delete(projectileId);
        }
    }

    /**
     * Creates an impact effect at the specified position
     * @param position - Position of the impact
     * @param type - Type of projectile that caused the impact
     */
    public createImpactEffect(position: Vector3, type: 'bullet' | 'missile'): void {
        const impactId = `impact_${Date.now()}`;
        const impact = new ParticleSystem('impact', 100, this.scene);
        impact.particleTexture = this.impactTexture;
        impact.emitter = position;
        impact.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
        impact.maxEmitBox = new Vector3(0.2, 0.2, 0.2);
        impact.color1 = new Color4(1, 0.5, 0.2, 1);
        impact.color2 = new Color4(1, 0.2, 0.1, 1);
        impact.colorDead = new Color4(0, 0, 0, 0);
        impact.minSize = 0.2;
        impact.maxSize = 0.5;
        impact.minLifeTime = 0.1;
        impact.maxLifeTime = 0.3;
        impact.emitRate = 1000;
        impact.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        impact.gravity = new Vector3(0, 0, 0);
        impact.direction1 = new Vector3(-1, -1, -1);
        impact.direction2 = new Vector3(1, 1, 1);
        impact.minAngularSpeed = 0;
        impact.maxAngularSpeed = Math.PI;
        impact.minEmitPower = 1;
        impact.maxEmitPower = 3;
        impact.updateSpeed = 0.01;
        impact.start();

        // Store reference
        this.activeImpacts.set(impactId, impact);

        // Remove after short duration
        setTimeout(() => this.removeImpactEffect(impactId), 300);
    }

    /**
     * Removes an impact effect
     * @param impactId - ID of the impact effect to remove
     */
    private removeImpactEffect(impactId: string): void {
        const impact = this.activeImpacts.get(impactId);
        if (impact) {
            impact.stop();
            impact.dispose();
            this.activeImpacts.delete(impactId);
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
            trail.dispose();
        });
        this.activeImpacts.forEach(impact => {
            impact.stop();
            impact.dispose();
        });

        // Clear all timeouts
        this.muzzleFlashTimeouts.forEach(timeout => {
            clearTimeout(timeout);
        });

        // Clear all maps
        this.activeMuzzleFlashes.clear();
        this.activeProjectiles.clear();
        this.activeTrails.clear();
        this.activeImpacts.clear();
        this.muzzleFlashTimeouts.clear();

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
        if (this.impactMaterial) {
            this.impactMaterial.dispose();
        }

        // Dispose of textures
        if (this.muzzleFlashTexture) {
            this.muzzleFlashTexture.dispose();
        }
        if (this.trailTexture) {
            this.trailTexture.dispose();
        }
        if (this.impactTexture) {
            this.impactTexture.dispose();
        }
    }

    public dispose() {
        this.cleanup();
    }
} 