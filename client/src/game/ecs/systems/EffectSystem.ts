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
    const muzzleFlashTexture = new Texture('assets/textures/muzzle_flash.png', scene);
    muzzleFlashMaterial.diffuseTexture = muzzleFlashTexture;
    muzzleFlashMaterial.diffuseTexture.hasAlpha = true;
    muzzleFlashMaterial.useAlphaFromDiffuseTexture = true;
    muzzleFlashMaterial.backFaceCulling = false;
    muzzleFlashMaterial.separateCullingPass = true;

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


    const impactMaterial = new StandardMaterial('impactMaterial', scene);
    impactMaterial.emissiveColor = new Color3(1, 0.3, 0.1);
    impactMaterial.alpha = 0.8;

    // Active effects
    const activeMuzzleFlashes = new Map<string, Mesh>();
    const activeProjectiles = new Map<string, Mesh>();
    const activeTrails = new Map<string, TrailMesh>();
    const activeImpactParticles = new Map<string, ParticleSystem>();
    const activeImpactSprites = new Map<string, Mesh>();
    const muzzleFlashTimeouts = new Map<string, NodeJS.Timeout>();

    // Create muzzle flash effect
    function createMuzzleFlash(entity: GameEntity): void {
        // Get the active weapon's trigger mesh
        const weaponTrigger = entity.asset?.triggerMeshes?.find(mesh => 
            'missile' === mesh.metadata?.gltf?.extras?.type
        );

        if (!entity.render?.mesh) {
            console.warn('No render mesh found for entity', entity.id);
            return;
        }

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
        
        // Parent to the entity's render mesh
        muzzleFlash.parent = entity.render.mesh;
        
        // Set local position relative to parent
        const localPos = spawnPointPosition.subtract(entity.render.mesh.absolutePosition);
        muzzleFlash.position = localPos;
        
        muzzleFlash.material = muzzleFlashMaterial;
        muzzleFlash.billboardMode = Mesh.BILLBOARDMODE_ALL;
        muzzleFlash.rotation.y = Math.PI; // Flip the texture to face forward

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
    function createImpactParticle(
        position: Vector3,
        normal: Vector3,
        impactId: string,
        type: ProjectileType
    ): void {
        const particleCount = type === ProjectileType.Missile ? 20 : 10;
        const impact = new ParticleSystem('impact', particleCount, scene);
        
        // Offset position slightly along normal to prevent clipping
        const offsetAmount = 0.05; // Small offset in meters
        const offsetPosition = position.clone().add(normal.scale(offsetAmount));
        
        // Ensure we're using the exact position passed in
        impact.emitter = offsetPosition;
        
        // Calculate emission direction based on normal
        const normalDir = normal.normalize();
        const tangent = Vector3.Cross(normalDir, Vector3.Up()).normalize();
        const bitangent = Vector3.Cross(normalDir, tangent).normalize();
        
        // Create emission box aligned with normal
        const emissionSize = type === ProjectileType.Missile ? 0.5 : 0.2;
        impact.minEmitBox = new Vector3(-emissionSize, -emissionSize, -emissionSize);
        impact.maxEmitBox = new Vector3(emissionSize, emissionSize, emissionSize);

        if (type === ProjectileType.Missile) {
            // Create static explosion sprite
            const explosionIndex = Math.floor(Math.random() * 9).toString().padStart(2, '0');
            const explosionTexture = new Texture(`assets/textures/explosion/explosion${explosionIndex}.png`, scene);
            
            // Create smoke particle system
            const smokeIndex = Math.floor(Math.random() * 5 + 1).toString().padStart(2, '0');
            const smokeTexture = new Texture(`assets/textures/smoke/blackSmoke${smokeIndex}.png`, scene);
            
            // Set up explosion sprite
            const explosionSprite = MeshBuilder.CreatePlane('explosion', { size: 2.0 }, scene);
            explosionSprite.position = offsetPosition; // Use the same offset position
            explosionSprite.billboardMode = Mesh.BILLBOARDMODE_ALL;
            explosionSprite.rotation.y = Math.PI;
            
            const explosionMaterial = new StandardMaterial('explosionMaterial', scene);
            explosionMaterial.diffuseTexture = explosionTexture;
            explosionMaterial.diffuseTexture.hasAlpha = true;
            explosionMaterial.useAlphaFromDiffuseTexture = true;
            explosionMaterial.backFaceCulling = false;
            explosionMaterial.disableLighting = true;
            explosionMaterial.specularColor = new Color3(0, 0, 0);
            explosionMaterial.emissiveColor = new Color3(1, 0.7, 0.3);
            explosionMaterial.alpha = 0.8;
            explosionMaterial.separateCullingPass = true;
            explosionSprite.material = explosionMaterial;
            explosionSprite.renderingGroupId = 1;
            
            // Set up smoke particles
            impact.particleTexture = smokeTexture;
            impact.isBillboardBased = true;
            impact.billboardMode = ParticleSystem.BILLBOARDMODE_ALL;
            
            // Explosion effect for missiles
            impact.color1 = new Color4(0.8, 0.8, 0.8, 0.8);
            impact.color2 = new Color4(0.5, 0.5, 0.5, 0.5);
            impact.colorDead = new Color4(0.2, 0.2, 0.2, 0);
            impact.minSize = 0.5;
            impact.maxSize = 1.0;
            impact.minLifeTime = 0.3;
            impact.maxLifeTime = 1.5;
            impact.emitRate = 0; // No continuous emission
            impact.manualEmitCount = particleCount; // Emit all particles at once
            impact.minEmitPower = 3;
            impact.maxEmitPower = 6;
            
            // Create a more spherical explosion pattern
            impact.direction1 = normalDir.scale(-1).add(tangent.scale(0.5)).add(bitangent.scale(0.5));
            impact.direction2 = normalDir.scale(-1).add(tangent.scale(-0.5)).add(bitangent.scale(-0.5));

            // Store explosion sprite for cleanup
            activeImpactParticles.set(impactId, impact);
            activeImpactSprites.set(impactId, explosionSprite);

            // Remove sprite after max lifetime
            setTimeout(() => {
                const sprite = activeImpactSprites.get(impactId);
                if (sprite) {
                    sprite.dispose();
                    activeImpactSprites.delete(impactId);
                }
            }, 300);

        } else {
            // Bullet sparkle effect
            const sparkleTexture = new Texture('assets/textures/sparkle.png', scene);
            impact.particleTexture = sparkleTexture;
            impact.isBillboardBased = true;
            impact.billboardMode = ParticleSystem.BILLBOARDMODE_ALL;
            
            // Sparkle effect for bullets
            impact.color1 = new Color4(1, 0.8, 0.2, 1);
            impact.color2 = new Color4(1, 0.4, 0.1, 1);
            impact.colorDead = new Color4(0.2, 0.1, 0.1, 0);
            impact.minSize = 0.05;
            impact.maxSize = 0.1;
            impact.minLifeTime = 1.2;
            impact.maxLifeTime = 1.5;
            impact.emitRate = 0; // No continuous emission
            impact.manualEmitCount = particleCount; // Emit all particles at once
            impact.minEmitPower = 3;
            impact.maxEmitPower = 5;
            impact.gravity = new Vector3(0, -9.81, 0); // Add some gravity for more realistic effect
            
            // Create a more focused sparkle pattern
            impact.direction1 = normalDir.scale(-1).add(tangent.scale(0.2)).add(bitangent.scale(0.2));
            impact.direction2 = normalDir.scale(-1).add(tangent.scale(-0.2)).add(bitangent.scale(-0.2));

            activeImpactParticles.set(impactId, impact);
        }

        impact.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        impact.minAngularSpeed = 0;
        impact.maxAngularSpeed = Math.PI;

        // speed gradient
        impact.addVelocityGradient(0, 1, 1.5);
        impact.addVelocityGradient(0.1, 0.8, 0.9);
        impact.addVelocityGradient(0.7, 0.4, 0.5);
        impact.addVelocityGradient(1, 0.1, 0.2);

        // Auto-remove when all particles are dead
        const checkInterval = setInterval(() => {
            if (impact.particles.length === 0) {
                clearInterval(checkInterval);
                removeImpactParticle(impactId);
            }
        }, 100);

        impact.start();
    }

    function createImpactEffects(entity: GameEntity): void {
        const impactId = `impact_${entity.id}`;
        createImpactParticle(
            entity.projectile!.impact!.position,
            entity.projectile!.impact!.normal,
            impactId,
            entity.projectile!.projectileType
        );
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

    function removeImpactParticle(impactId: string): void {
        const impact = activeImpactParticles.get(impactId);
        if (impact) {
            impact.stop();
            impact.dispose();
            activeImpactParticles.delete(impactId);
        }
    }

    // Cleanup function
    function cleanup(): void {
        activeMuzzleFlashes.forEach(muzzleFlash => muzzleFlash.dispose());
        activeProjectiles.forEach(projectile => projectile.dispose());
        activeTrails.forEach(trail => trail.dispose());
        activeImpactParticles.forEach(impact => {
            impact.stop();
            impact.dispose();
        });
        muzzleFlashTimeouts.forEach(timeout => clearTimeout(timeout));

        activeMuzzleFlashes.clear();
        activeProjectiles.clear();
        activeTrails.clear();
        activeImpactParticles.clear();
        activeImpactSprites.clear();
        muzzleFlashTimeouts.clear();

        muzzleFlashMaterial.dispose();
        bulletMaterial.dispose();
        missileMaterial.dispose();
        bulletTrailMaterial.dispose();
        missileTrailMaterial.dispose();
        impactMaterial.dispose();
    }

    return {
        createMuzzleFlash,
        createProjectileMesh,
        createImpactEffects,
        removeProjectileMesh,
        cleanup,
        update: () => {
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