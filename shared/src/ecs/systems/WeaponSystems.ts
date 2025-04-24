import * as CANNON from 'cannon-es';
import { Vector3, Quaternion } from 'babylonjs';
import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';
import { CollisionGroups, collisionMasks } from '../../physics/CollisionGroups';

// Define weapon type for better type safety
type Weapon = {
    id: string;
    name: string;
    projectileType: 'bullet' | 'missile';
    damage: number;
    fireRate: number;
    projectileSpeed: number;
    cooldown: number;
    range: number;
    isOnCooldown: boolean;
    lastFireTime: number;
};

/**
 * Weapon system that handles projectile creation and management
 */
export function createWeaponSystem(cannonWorld: CANNON.World) {
    const armedEntities = ecsWorld.with("weapons", "activeWeaponIndex", "position", "rotation", "input");

    return {
        update: (dt: number) => {
            for (const entity of armedEntities) {
                const input = entity.input!;
                const weapons = entity.weapons!;
                const activeWeaponIndex = entity.activeWeaponIndex!;
                const activeWeapon = weapons[activeWeaponIndex];

                // Handle weapon switching
                if (input.nextWeapon) {
                    entity.activeWeaponIndex = (activeWeaponIndex + 1) % weapons.length;
                }
                if (input.previousWeapon) {
                    entity.activeWeaponIndex = (activeWeaponIndex - 1 + weapons.length) % weapons.length;
                }
                if (input.weapon1) entity.activeWeaponIndex = 0;
                if (input.weapon2) entity.activeWeaponIndex = 1;
                if (input.weapon3) entity.activeWeaponIndex = 2;

                // Handle firing
                if (input.fire && activeWeapon && !activeWeapon.isOnCooldown) {
                    const now = Date.now();
                    if (now - activeWeapon.lastFireTime >= activeWeapon.cooldown * 1000) {
                        // Create projectile
                        const projectile = createProjectile(entity, activeWeapon, cannonWorld);
                        
                        // Add to ECS world
                        ecsWorld.add(projectile);
                        
                        // Update weapon state
                        activeWeapon.isOnCooldown = true;
                        activeWeapon.lastFireTime = now;
                    }
                }

                // Update weapon cooldowns
                const now = Date.now();
                weapons.forEach(weapon => {
                    if (weapon.isOnCooldown && now - weapon.lastFireTime >= weapon.cooldown * 1000) {
                        weapon.isOnCooldown = false;
                    }
                });
            }
        }
    };
}

/**
 * Creates a projectile entity based on the shooter and weapon
 */
function createProjectile(
    shooter: GameEntity, 
    weapon: Weapon,
    cannonWorld: CANNON.World
): GameEntity {
    // Get forward direction from shooter's rotation
    const forward = new Vector3(0, 0, 1);
    forward.rotateByQuaternionAroundPointToRef(
        shooter.rotation!,
        Vector3.Zero(),
        forward
    );

    // Create projectile body
    const body = new CANNON.Body({
        mass: 0.1,
        position: new CANNON.Vec3(
            shooter.position!.x,
            shooter.position!.y,
            shooter.position!.z
        ),
        velocity: new CANNON.Vec3(
            forward.x * weapon.projectileSpeed,
            forward.y * weapon.projectileSpeed,
            forward.z * weapon.projectileSpeed
        ),
        collisionFilterGroup: CollisionGroups.Projectiles,
        collisionFilterMask: collisionMasks.Projectile,
        type: CANNON.Body.DYNAMIC
    });

    // Add collision shape based on projectile type
    if (weapon.projectileType === 'bullet') {
        body.addShape(new CANNON.Sphere(0.1));
    } else {
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.2, 0.2, 0.5)));
    }

    // Add body to CANNON world
    cannonWorld.addBody(body);

    // Create and return projectile entity
    return {
        id: `${shooter.id}_${Date.now()}`,
        type: 'projectile',
        projectile: true,
        position: shooter.position!.clone(),
        rotation: shooter.rotation!.clone(),
        velocity: forward.scale(weapon.projectileSpeed),
        body,
        projectileType: weapon.projectileType,
        damage: weapon.damage,
        range: weapon.range,
        distanceTraveled: 0,
        sourceId: shooter.id,
        speed: weapon.projectileSpeed,
        tick: 0,
        timestamp: Date.now()
    };
}

/**
 * Projectile system that updates projectile positions and handles lifetime
 */
export function createProjectileSystem() {
    const projectiles = ecsWorld.with("projectile", "position", "velocity", "range", "distanceTraveled");

    return {
        update: (dt: number) => {
            for (const entity of projectiles) {
                // Update distance traveled
                const distance = entity.velocity!.length() * dt;
                entity.distanceTraveled! += distance;

                // Remove if exceeded range
                if (entity.distanceTraveled! >= entity.range!) {
                    ecsWorld.remove(entity);
                }
            }
        }
    };
} 