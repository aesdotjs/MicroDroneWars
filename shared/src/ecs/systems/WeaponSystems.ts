import * as CANNON from 'cannon-es';
import { Vector3, Quaternion } from 'babylonjs';
import { world as ecsWorld } from '../world';
import { GameEntity, WeaponComponent, InputComponent } from '../types';
import { CollisionGroups, collisionMasks } from '../CollisionGroups';

/**
 * Weapon system that handles projectile creation and management
 */
export function createWeaponSystem(cannonWorld: CANNON.World) {
    const armedEntities = ecsWorld.with("vehicle", "transform");

    return {
        update: (dt: number, entity: GameEntity, input: InputComponent) => {
            const vehicle = entity.vehicle!;
            const activeWeapon = vehicle.weapons[vehicle.activeWeaponIndex];

            // Handle weapon switching
            if (input.nextWeapon) {
                vehicle.activeWeaponIndex = (vehicle.activeWeaponIndex + 1) % vehicle.weapons.length;
            }
            if (input.previousWeapon) {
                vehicle.activeWeaponIndex = (vehicle.activeWeaponIndex - 1 + vehicle.weapons.length) % vehicle.weapons.length;
            }
            if (input.weapon1) vehicle.activeWeaponIndex = 0;
            if (input.weapon2) vehicle.activeWeaponIndex = 1;
            if (input.weapon3) vehicle.activeWeaponIndex = 2;

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
            vehicle.weapons.forEach(weapon => {
                if (weapon.isOnCooldown && now - weapon.lastFireTime >= weapon.cooldown * 1000) {
                    weapon.isOnCooldown = false;
                }
            });
        }
    };
}

/**
 * Creates a projectile entity based on the shooter and weapon
 */
function createProjectile(
    shooter: GameEntity, 
    weapon: WeaponComponent,
    cannonWorld: CANNON.World
): GameEntity {
    // Get forward direction from shooter's rotation
    const forward = new Vector3(0, 0, 1);
    forward.rotateByQuaternionAroundPointToRef(
        shooter.transform!.rotation,
        Vector3.Zero(),
        forward
    );

    // Create projectile body
    const body = new CANNON.Body({
        mass: 0.1,
        position: new CANNON.Vec3(
            shooter.transform!.position.x,
            shooter.transform!.position.y,
            shooter.transform!.position.z
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
        transform: {
            position: shooter.transform!.position.clone(),
            rotation: shooter.transform!.rotation.clone(),
            velocity: forward.scale(weapon.projectileSpeed),
            angularVelocity: Vector3.Zero()
        },
        physics: {
            body,
            mass: 0.1,
            drag: 0.1,
            angularDrag: 0.1,
            maxSpeed: weapon.projectileSpeed,
            maxAngularSpeed: 0,
            maxAngularAcceleration: 0,
            angularDamping: 1,
            forceMultiplier: 1,
            thrust: 0,
            lift: 0,
            torque: 0,
            minSpeed: 0,
            bankAngle: 0,
            wingArea: 0,
            strafeForce: 0,
            minHeight: 0
        },
        projectile: {
            projectileType: weapon.projectileType,
            damage: weapon.damage,
            range: weapon.range,
            distanceTraveled: 0,
            sourceId: shooter.id,
            timestamp: Date.now(),
            tick: 0
        },
        tick: {
            tick: 0,
            timestamp: Date.now()
        }
    };
}

/**
 * Projectile system that updates projectile positions and handles lifetime
 */
export function createProjectileSystem() {
    const projectiles = ecsWorld.with("projectile", "transform");

    return {
        update: (dt: number) => {
            for (const entity of projectiles) {
                // Update distance traveled
                const distance = entity.transform!.velocity.length() * dt;
                entity.projectile!.distanceTraveled += distance;

                // Remove if exceeded range
                if (entity.projectile!.distanceTraveled >= entity.projectile!.range) {
                    ecsWorld.remove(entity);
                }
            }
        }
    };
} 