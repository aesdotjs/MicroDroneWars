import { Scene, Vector3, Mesh, StandardMaterial, Color3, Color4, ParticleSystem, Texture, MeshBuilder, Quaternion, TrailMesh } from '@babylonjs/core';
import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity, ProjectileType } from '@shared/ecs/types';

/**
 * Creates a system that handles visual effects for entities
 */
export function createEffectSystem(scene: Scene) {
    // Materials
    const muzzleFlashMaterial = new StandardMaterial('muzzleFlashMaterial', scene);
    muzzleFlashMaterial.diffuseColor = new Color3(1, 1, 1);
    muzzleFlashMaterial.specularColor = new Color3(0, 0, 0);
    muzzleFlashMaterial.emissiveColor = new Color3(1, 0.7, 0.3);
    muzzleFlashMaterial.alpha = 0.8;

    const bulletMaterial = new StandardMaterial('bulletMaterial', scene);
    bulletMaterial.emissiveColor = new Color3(1, 1, 0.3);
    bulletMaterial.diffuseColor = new Color3(1, 1, 0.3);
    bulletMaterial.specularColor = new Color3(0, 0, 0);
    bulletMaterial.alpha = 0.8;

    const missileMaterial = new StandardMaterial('missileMaterial', scene);
    missileMaterial.emissiveColor = new Color3(0.3, 0.5, 1);
    missileMaterial.diffuseColor = new Color3(0.3, 0.5, 1);
    missileMaterial.specularColor = new Color3(0, 0, 0);
    missileMaterial.alpha = 0.8;

    const bulletTrailMaterial = new StandardMaterial('bulletTrailMaterial', scene);
    bulletTrailMaterial.disableLighting = true;
    bulletTrailMaterial.emissiveColor = new Color3(1, 0.5, 0.2);
    bulletTrailMaterial.diffuseColor = new Color3(1, 0.5, 0.2);
    bulletTrailMaterial.specularColor = new Color3(0, 0, 0);
    bulletTrailMaterial.alpha = 0.8;
    bulletTrailMaterial.backFaceCulling = false;

    const missileTrailMaterial = new StandardMaterial('missileTrailMaterial', scene);
    missileTrailMaterial.disableLighting = true;
    missileTrailMaterial.emissiveColor = new Color3(0.3, 0.5, 1);
    missileTrailMaterial.diffuseColor = new Color3(0.3, 0.5, 1);
    missileTrailMaterial.specularColor = new Color3(0, 0, 0);
    missileTrailMaterial.alpha = 0.8;
    missileTrailMaterial.backFaceCulling = false;

    const trailMaterial = new StandardMaterial('trailMaterial', scene);
    trailMaterial.disableLighting = true;
    trailMaterial.emissiveColor = new Color3(1, 0.5, 0.2);
    trailMaterial.diffuseColor = new Color3(1, 0.5, 0.2);
    trailMaterial.specularColor = new Color3(0, 0, 0);
    trailMaterial.alpha = 0.8;
    trailMaterial.backFaceCulling = false;

    const impactMaterial = new StandardMaterial('impactMaterial', scene);
    impactMaterial.emissiveColor = new Color3(1, 0.3, 0.1);
    impactMaterial.alpha = 0.8;

    // Active effects
    const activeMuzzleFlashes = new Map<string, Mesh>();
    const activeProjectiles = new Map<string, Mesh>();
    const activeTrails = new Map<string, TrailMesh>();
    const activeImpacts = new Map<string, ParticleSystem>();
    const muzzleFlashTimeouts = new Map<string, NodeJS.Timeout>();

    // Create muzzle flash effect
    function createMuzzleFlash(entity: GameEntity): void {
        // Get the active weapon's trigger mesh
        const weaponTrigger = entity.asset?.triggerMeshes?.find(mesh => 
            'missile' === mesh.metadata?.gltf?.extras?.type
        );

        let spawnPointPosition: Vector3;
        let spawnPointRotation: Quaternion;
        
        if (weaponTrigger) {
            // Get the local position and rotation of the trigger mesh
            const localPosition = weaponTrigger.position.clone();
            const localRotation = weaponTrigger.rotationQuaternion?.clone() || new Quaternion();
            
            // Transform the local position by the vehicle's world transform
            spawnPointPosition = localPosition.clone();
            spawnPointPosition.rotateByQuaternionAroundPointToRef(
                entity.transform!.rotation,
                Vector3.Zero(),
                spawnPointPosition
            );
            spawnPointPosition.addInPlace(entity.transform!.position);
            
            // Combine rotations
            spawnPointRotation = entity.transform!.rotation.multiply(localRotation);
        } else {
            // Fallback to vehicle position/rotation if no trigger mesh found
            spawnPointPosition = entity.transform!.position;
            spawnPointRotation = entity.transform!.rotation;
        }

        // Clear any existing timeout
        const existingTimeout = muzzleFlashTimeouts.get(entity.id);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            muzzleFlashTimeouts.delete(entity.id);
        }

        // Remove existing muzzle flash
        removeMuzzleFlash(entity.id);

        // Create muzzle flash mesh
        const muzzleFlash = MeshBuilder.CreatePlane('muzzleFlash', { size: 1.0 }, scene);
        muzzleFlash.position = spawnPointPosition;
        muzzleFlash.material = muzzleFlashMaterial;
        muzzleFlash.billboardMode = Mesh.BILLBOARDMODE_ALL;
        muzzleFlash.rotation.y = Math.PI;

        activeMuzzleFlashes.set(entity.id, muzzleFlash);

        // Set timeout to remove
        const timeout = setTimeout(() => {
            if (activeMuzzleFlashes.get(entity.id) === muzzleFlash) {
                removeMuzzleFlash(entity.id);
            }
        }, 50);
        muzzleFlashTimeouts.set(entity.id, timeout);
    }

    // Create projectile mesh
    function createProjectileMesh(projectile: GameEntity): Mesh {
        removeProjectileMesh(projectile.id);

        let projectileMesh: Mesh;
        if (projectile.projectile?.projectileType === ProjectileType.Bullet) {
            projectileMesh = MeshBuilder.CreateSphere('bullet', { diameter: 0.05 }, scene);
            projectileMesh.material = bulletMaterial;
        } else {
            projectileMesh = MeshBuilder.CreateBox('missile', { size: 0.2 }, scene);
            projectileMesh.material = missileMaterial;
        }

        projectileMesh.position = projectile.transform!.position;
        projectileMesh.rotationQuaternion = projectile.transform!.rotation;

        activeProjectiles.set(projectile.id, projectileMesh);
        createTrailEffect(projectile, projectileMesh);
        return projectileMesh;
    }

    // Create trail effect
    function createTrailEffect(projectile: GameEntity, sourceMesh: Mesh): void {
        removeTrailEffect(projectile.id);

        sourceMesh.computeWorldMatrix();
        const trail = new TrailMesh(
            `trail_${projectile.id}`,
            sourceMesh,
            scene,
            0.1,
            5,
            true
        );

        // Use different trail materials based on projectile type
        trail.material = projectile.projectile?.projectileType === ProjectileType.Missile 
            ? missileTrailMaterial 
            : bulletTrailMaterial;
            
        activeTrails.set(projectile.id, trail);
    }

    // Create impact effect
    function createImpactEffect(position: Vector3, type: 'bullet' | 'missile'): void {
        const impactId = `impact_${Date.now()}`;
        const impact = new ParticleSystem('impact', 100, scene);
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

        activeImpacts.set(impactId, impact);

        setTimeout(() => removeImpactEffect(impactId), 300);
    }

    // Remove effects
    function removeMuzzleFlash(weaponId: string): void {
        const muzzleFlash = activeMuzzleFlashes.get(weaponId);
        if (muzzleFlash) {
            muzzleFlash.dispose();
            activeMuzzleFlashes.delete(weaponId);
        }
    }

    function removeProjectileMesh(projectileId: string): void {
        const projectile = activeProjectiles.get(projectileId);
        if (projectile) {
            projectile.dispose();
            activeProjectiles.delete(projectileId);
        }
        removeTrailEffect(projectileId);
    }

    function removeTrailEffect(projectileId: string): void {
        const trail = activeTrails.get(projectileId);
        if (trail) {
            trail.dispose();
            activeTrails.delete(projectileId);
        }
    }

    function removeImpactEffect(impactId: string): void {
        const impact = activeImpacts.get(impactId);
        if (impact) {
            impact.stop();
            impact.dispose();
            activeImpacts.delete(impactId);
        }
    }

    // Cleanup function
    function cleanup(): void {
        activeMuzzleFlashes.forEach(muzzleFlash => muzzleFlash.dispose());
        activeProjectiles.forEach(projectile => projectile.dispose());
        activeTrails.forEach(trail => trail.dispose());
        activeImpacts.forEach(impact => {
            impact.stop();
            impact.dispose();
        });
        muzzleFlashTimeouts.forEach(timeout => clearTimeout(timeout));

        activeMuzzleFlashes.clear();
        activeProjectiles.clear();
        activeTrails.clear();
        activeImpacts.clear();
        muzzleFlashTimeouts.clear();

        muzzleFlashMaterial.dispose();
        bulletMaterial.dispose();
        missileMaterial.dispose();
        bulletTrailMaterial.dispose();
        missileTrailMaterial.dispose();
        trailMaterial.dispose();
        impactMaterial.dispose();
    }

    return {
        createMuzzleFlash,
        createProjectileMesh,
        createImpactEffect,
        removeProjectileMesh,
        cleanup,
        update: (dt: number) => {
            // // Update projectile positions
            // const projectiles = ecsWorld.with("projectile", "transform");
            // for (const projectile of projectiles) {
            //     const mesh = activeProjectiles.get(projectile.id);
            //     if (mesh && projectile.transform) {
            //         mesh.position.copyFrom(projectile.transform.position);
            //     }
            // }
        }
    };
} 