import * as CANNON from 'cannon-es';
import { Vector3, Quaternion } from 'babylonjs';
import { Weapon, Projectile, PhysicsState, CollisionType } from './types';
import { CollisionGroups, collisionMasks } from './CollisionGroups';
import { CollisionManager, EnhancedCollisionEvent } from './CollisionManager';

/**
 * Default weapons available in the game
 */
export const DefaultWeapons: { [key: string]: Weapon } = {
    chaingun: {
        id: 'chaingun',
        name: 'Chaingun',
        projectileType: 'bullet',
        damage: 10,
        fireRate: 10,
        projectileSpeed: 100,
        cooldown: 0.1,
        range: 1000,
        isOnCooldown: false,
        lastFireTime: 0
    },
    missile: {
        id: 'missile',
        name: 'Missile',
        projectileType: 'missile',
        damage: 50,
        fireRate: 1,
        projectileSpeed: 50,
        cooldown: 1,
        range: 2000,
        isOnCooldown: false,
        lastFireTime: 0
    }
};

/**
 * Event emitted when a vehicle takes damage
 */
export interface DamageEvent {
    /** ID of the vehicle that took damage */
    targetId: string;
    /** Amount of damage taken */
    damage: number;
    /** Type of projectile that caused the damage */
    projectileType: 'bullet' | 'missile';
    /** Position where the damage occurred */
    position: Vector3;
    /** Timestamp of the damage event */
    timestamp: number;
}

/**
 * Callback type for damage events
 */
export type DamageCallback = (event: DamageEvent) => void;

/**
 * Manages weapons and projectiles for vehicles
 */
export class WeaponSystem {
    private world: CANNON.World;
    private collisionManager: CollisionManager;
    private weapons: Weapon[];
    private activeWeaponIndex: number = 0;
    private projectiles: Map<string, Projectile> = new Map();
    private projectileBodies: Map<string, CANNON.Body> = new Map();
    private readonly MAX_PROJECTILES = 100;
    private damageCallbacks: Map<string, DamageCallback[]> = new Map();

    /**
     * Creates a new WeaponSystem instance
     * @param world - The CANNON.js physics world
     * @param collisionManager - The collision manager instance
     * @param weapons - Array of weapons to equip
     */
    constructor(world: CANNON.World, collisionManager: CollisionManager, weapons: Weapon[] = []) {
        this.world = world;
        this.collisionManager = collisionManager;
        this.weapons = weapons;
    }

    /**
     * Switches to a specific weapon
     * @param index - The index of the weapon to switch to
     */
    public switchWeapon(index: number): void {
        this.activeWeaponIndex = index;
    }

    /**
     * Gets the currently active weapon
     */
    public getActiveWeapon(): Weapon {
        return this.weapons[this.activeWeaponIndex];
    }

    /**
     * Switches to the next weapon
     */
    public nextWeapon(): void {
        this.activeWeaponIndex = (this.activeWeaponIndex + 1) % this.weapons.length;
    }

    /**
     * Switches to the previous weapon
     */
    public previousWeapon(): void {
        this.activeWeaponIndex = (this.activeWeaponIndex - 1 + this.weapons.length) % this.weapons.length;
    }

    /**
     * Fires the active weapon
     * @param position - Position to fire from
     * @param direction - Direction to fire in
     * @param sourceId - ID of the vehicle firing the weapon
     * @param tick - Current physics tick
     * @returns The created projectile if successful, null otherwise
     */
    public fire(position: Vector3, direction: Vector3, sourceId: string, tick: number): Projectile | null {
        const weapon = this.getActiveWeapon();
        const now = Date.now();

        // Check cooldown
        if (weapon.isOnCooldown && now - weapon.lastFireTime < weapon.cooldown * 1000) {
            return null;
        }

        // Create projectile
        const projectile: Projectile = {
            id: `${sourceId}_${now}`,
            type: weapon.projectileType,
            position: position.clone(),
            direction: direction.normalize(),
            speed: weapon.projectileSpeed,
            damage: weapon.damage,
            range: weapon.range,
            distanceTraveled: 0,
            sourceId,
            timestamp: now,
            tick
        };

        // Create physics body for projectile
        const body = new CANNON.Body({
            mass: 0.1,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            velocity: new CANNON.Vec3(
                direction.x * weapon.projectileSpeed,
                direction.y * weapon.projectileSpeed,
                direction.z * weapon.projectileSpeed
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

        // Add to world and maps
        this.world.addBody(body);
        this.projectiles.set(projectile.id, projectile);
        this.projectileBodies.set(projectile.id, body);

        // Register collision callback
        this.collisionManager.registerCollisionCallback(projectile.id, (event) => {
            this.handleProjectileCollision(projectile, event);
        });

        // Update weapon state
        weapon.isOnCooldown = true;
        weapon.lastFireTime = now;

        // Clean up old projectiles if needed
        this.cleanupProjectiles();

        return projectile;
    }

    /**
     * Updates all projectiles
     * @param deltaTime - Time elapsed since last update in seconds
     */
    public update(deltaTime: number): void {
        // Update weapon cooldowns
        const now = Date.now();
        this.weapons.forEach(weapon => {
            if (weapon.isOnCooldown && now - weapon.lastFireTime >= weapon.cooldown * 1000) {
                weapon.isOnCooldown = false;
            }
        });

        // Update projectiles
        this.projectiles.forEach((projectile, id) => {
            const body = this.projectileBodies.get(id);
            if (!body) return;

            // Update position
            projectile.position = new Vector3(
                body.position.x,
                body.position.y,
                body.position.z
            );

            // Update distance traveled
            const velocity = new Vector3(
                body.velocity.x,
                body.velocity.y,
                body.velocity.z
            );
            projectile.distanceTraveled += velocity.length() * deltaTime;

            // Remove if exceeded range
            if (projectile.distanceTraveled >= projectile.range) {
                this.removeProjectile(id);
            }
        });
    }

    /**
     * Handles projectile collision
     * @param projectile - The projectile that collided
     * @param event - The collision event
     */
    private handleProjectileCollision(projectile: Projectile, event: EnhancedCollisionEvent): void {
        // Remove projectile on collision
        this.removeProjectile(projectile.id);

        // Handle different collision types
        switch (event.type) {
            case CollisionType.VehicleProjectile:
                this.handleVehicleProjectileCollision(projectile, event);
                break;
            case CollisionType.VehicleEnvironment:
                this.handleEnvironmentProjectileCollision(projectile, event);
                break;
        }
    }

    /**
     * Handles collision between a projectile and a vehicle
     * @param projectile - The projectile that collided
     * @param event - The collision event
     */
    private handleVehicleProjectileCollision(projectile: Projectile, event: EnhancedCollisionEvent): void {
        // Don't damage the vehicle that fired the projectile
        if (event.bodyA.id.toString() === projectile.sourceId || event.bodyB.id.toString() === projectile.sourceId) {
            return;
        }

        // Calculate damage based on impact velocity and projectile type
        const impactVelocity = event.impactVelocity;
        let damage = projectile.damage;

        // Scale damage based on impact velocity
        if (projectile.type === 'bullet') {
            // Bullets do more damage at higher velocities
            damage *= Math.min(1.5, impactVelocity / projectile.speed);
        } else {
            // Missiles do more damage at lower velocities (explosive)
            damage *= Math.max(0.5, 1 - (impactVelocity / projectile.speed));
        }

        // Apply damage to the target vehicle
        const targetBody = event.bodyA.id.toString() === projectile.sourceId ? event.bodyB : event.bodyA;
        const targetId = targetBody.id.toString();

        // Emit damage event
        this.emitDamageEvent({
            targetId,
            damage,
            projectileType: projectile.type,
            position: new Vector3(
                event.contactPoint.x,
                event.contactPoint.y,
                event.contactPoint.z
            ),
            timestamp: Date.now()
        });
    }

    /**
     * Handles collision between a projectile and the environment
     * @param projectile - The projectile that collided
     * @param event - The collision event
     */
    private handleEnvironmentProjectileCollision(projectile: Projectile, event: EnhancedCollisionEvent): void {
        // Create impact effect based on projectile type
        if (projectile.type === 'missile') {
            // Create explosion effect
            this.emitDamageEvent({
                targetId: 'environment',
                damage: projectile.damage,
                projectileType: projectile.type,
                position: new Vector3(
                    event.contactPoint.x,
                    event.contactPoint.y,
                    event.contactPoint.z
                ),
                timestamp: Date.now()
            });
        } else {
            // Create bullet impact effect
            this.emitDamageEvent({
                targetId: 'environment',
                damage: projectile.damage,
                projectileType: projectile.type,
                position: new Vector3(
                    event.contactPoint.x,
                    event.contactPoint.y,
                    event.contactPoint.z
                ),
                timestamp: Date.now()
            });
        }
    }

    /**
     * Removes a projectile and its physics body
     * @param id - ID of the projectile to remove
     */
    private removeProjectile(id: string): void {
        const body = this.projectileBodies.get(id);
        if (body) {
            this.world.removeBody(body);
            this.projectileBodies.delete(id);
        }
        this.projectiles.delete(id);
        this.collisionManager.unregisterCollisionCallback(id, () => {});
    }

    /**
     * Cleans up old projectiles if we have too many
     */
    private cleanupProjectiles(): void {
        const now = Date.now();
        // Clean up old projectiles
        this.projectiles.forEach((projectile, id) => {
            // Remove if exceeded range
            if (projectile.distanceTraveled >= projectile.range) {
                this.removeProjectile(id);
            }
            // Remove if too old (5 seconds)
            if (now - projectile.timestamp > 5000) {
                this.removeProjectile(id);
            }
        });

        // Limit total projectiles
        if (this.projectiles.size > this.MAX_PROJECTILES) {
            const toRemove = Array.from(this.projectiles.keys())
                .slice(0, this.projectiles.size - this.MAX_PROJECTILES);
            toRemove.forEach(id => this.removeProjectile(id));
        }
    }

    /**
     * Cleans up all projectiles and physics bodies
     */
    public cleanup(): void {
        // Clean up all projectiles
        this.projectiles.forEach((_, id) => this.removeProjectile(id));
        
        // Clear all callbacks
        this.damageCallbacks.clear();
        
        // Reset weapon states
        this.weapons.forEach(weapon => {
            weapon.isOnCooldown = false;
            weapon.lastFireTime = 0;
        });
    }

    /**
     * Gets a projectile by its ID
     * @param id - ID of the projectile to get
     * @returns The projectile if found, null otherwise
     */
    public getProjectileById(id: string): Projectile | null {
        return this.projectiles.get(id) || null;
    }

    /**
     * Gets all active projectiles
     * @returns Array of active projectiles
     */
    public getProjectiles(): Projectile[] {
        return Array.from(this.projectiles.values());
    }

    /**
     * Registers a callback for damage events
     * @param targetId - ID of the vehicle to register the callback for
     * @param callback - The function to call when damage occurs
     */
    public registerDamageCallback(targetId: string, callback: DamageCallback): void {
        if (!this.damageCallbacks.has(targetId)) {
            this.damageCallbacks.set(targetId, []);
        }
        this.damageCallbacks.get(targetId)!.push(callback);
    }

    /**
     * Unregisters a damage callback
     * @param targetId - ID of the vehicle to unregister the callback for
     * @param callback - The callback function to remove
     */
    public unregisterDamageCallback(targetId: string, callback: DamageCallback): void {
        const callbacks = this.damageCallbacks.get(targetId);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emits a damage event
     * @param event - The damage event to emit
     */
    private emitDamageEvent(event: DamageEvent): void {
        const callbacks = this.damageCallbacks.get(event.targetId);
        if (callbacks) {
            callbacks.forEach(callback => callback(event));
        }
    }

    /**
     * Updates the weapons array with new weapon states
     * @param weapons - Array of weapons to update
     */
    public updateWeapons(weapons: Weapon[]): void {
        // Update existing weapons
        weapons.forEach(weapon => {
            const existingWeapon = this.weapons.find(w => w.id === weapon.id);
            if (existingWeapon) {
                // Update weapon properties
                existingWeapon.damage = weapon.damage;
                existingWeapon.fireRate = weapon.fireRate;
                existingWeapon.projectileSpeed = weapon.projectileSpeed;
                existingWeapon.cooldown = weapon.cooldown;
                existingWeapon.range = weapon.range;
                existingWeapon.isOnCooldown = weapon.isOnCooldown;
                existingWeapon.lastFireTime = weapon.lastFireTime;
            } else {
                // Add new weapon
                this.weapons.push(weapon);
            }
        });

        // Remove weapons that are no longer in the array
        this.weapons = this.weapons.filter(weapon => 
            weapons.some(w => w.id === weapon.id)
        );

        // Ensure active weapon index is valid
        if (this.activeWeaponIndex >= this.weapons.length) {
            this.activeWeaponIndex = 0;
        }
    }
} 