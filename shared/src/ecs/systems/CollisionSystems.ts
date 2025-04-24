import { GameEntity } from '../types';
import { Body, ContactEquation, World, Vec3, Quaternion } from 'cannon-es';
import { CollisionType, CollisionSeverity } from '../../physics/types';
import { world as ecsWorld } from '../world';
import { CollisionGroups } from '../../physics/CollisionGroups';

/**
 * Creates a collision system that handles all collision events in the game
 */
export function createCollisionSystem(cannonWorld: World) {
    // Initialize collision handling
    const SEVERITY_THRESHOLDS = {
        light: 5,    // m/s
        medium: 10,  // m/s
        heavy: 15    // m/s
    };

    // Register collision event listener
    cannonWorld.addEventListener('beginContact', (event: any) => {
        const { bodyA, bodyB } = event;
        const contacts = event.target.contacts;
        
        if (!contacts || contacts.length === 0) return;

        // Get the first contact point
        const contact = contacts[0];
        
        // Get collision type and severity
        const collisionType = determineCollisionType(bodyA, bodyB);
        const impactVelocity = Math.abs(
            bodyA.velocity.dot(contact.ni) -
            bodyB.velocity.dot(contact.ni)
        );
        const severity = determineCollisionSeverity(impactVelocity);

        // Create enhanced collision event
        const collisionEvent = {
            type: collisionType,
            severity: severity,
            bodyA: bodyA,
            bodyB: bodyB,
            impactVelocity: impactVelocity,
            contactPoint: new Vec3(contact.ri.x, contact.ri.y, contact.ri.z),
            normal: new Vec3(contact.ni.x, contact.ni.y, contact.ni.z),
            timestamp: Date.now()
        };

        // Handle collision
        handleCollisionEvent(collisionEvent);
    });

    return {
        update: (deltaTime: number) => {
            // Collision handling is done through the event listener
            // This system just ensures entities are properly registered
            const damageableEntities = ecsWorld.with("health", "body");
            
            for (const entity of damageableEntities) {
                if (!entity.body) continue;
                // Entity registration is handled by the physics system
            }
        }
    };
}

/**
 * Determines the type of collision based on the colliding bodies
 */
function determineCollisionType(bodyA: Body, bodyB: Body): CollisionType {
    const isGroundCollision = 
        (bodyA.collisionFilterGroup & CollisionGroups.Environment) !== 0 ||
        (bodyB.collisionFilterGroup & CollisionGroups.Environment) !== 0;
    const isVehicleCollision = 
        (bodyA.collisionFilterGroup & (CollisionGroups.Drones | CollisionGroups.Planes)) !== 0 &&
        (bodyB.collisionFilterGroup & (CollisionGroups.Drones | CollisionGroups.Planes)) !== 0;
    const isProjectileCollision = 
        (bodyA.collisionFilterGroup & CollisionGroups.Projectiles) !== 0 ||
        (bodyB.collisionFilterGroup & CollisionGroups.Projectiles) !== 0;
    const isFlagCollision = 
        (bodyA.collisionFilterGroup & CollisionGroups.Flags) !== 0 ||
        (bodyB.collisionFilterGroup & CollisionGroups.Flags) !== 0;

    if (isGroundCollision) return CollisionType.VehicleEnvironment;
    if (isVehicleCollision) return CollisionType.VehicleVehicle;
    if (isProjectileCollision) return CollisionType.VehicleProjectile;
    if (isFlagCollision) return CollisionType.VehicleFlag;

    return CollisionType.VehicleEnvironment; // Default to environment collision
}

/**
 * Determines the severity of a collision based on impact velocity
 */
function determineCollisionSeverity(impactVelocity: number): CollisionSeverity {
    const absVelocity = Math.abs(impactVelocity);
    if (absVelocity >= 15) return CollisionSeverity.Heavy;
    if (absVelocity >= 10) return CollisionSeverity.Medium;
    return CollisionSeverity.Light;
}

/**
 * Handles a collision event and routes it to the appropriate handler
 */
function handleCollisionEvent(event: any) {
    const entityA = ecsWorld.entities.find(e => e.body === event.bodyA);
    const entityB = ecsWorld.entities.find(e => e.body === event.bodyB);

    if (!entityA || !entityB) return;

    // Handle vehicle collisions
    if (entityA.drone || entityA.plane) {
        handleVehicleCollision(entityA, entityB, event);
    }
    if (entityB.drone || entityB.plane) {
        handleVehicleCollision(entityB, entityA, event);
    }

    // Handle projectile collisions
    if (entityA.projectile) {
        handleProjectileCollision(entityA, entityB, event);
    }
    if (entityB.projectile) {
        handleProjectileCollision(entityB, entityA, event);
    }

    // Handle flag collisions
    if (entityA.flag) {
        handleFlagCollision(entityA, entityB, event);
    }
    if (entityB.flag) {
        handleFlagCollision(entityB, entityA, event);
    }
}

/**
 * Handles collision events for vehicles
 */
function handleVehicleCollision(vehicle: GameEntity, other: GameEntity, event: any) {
    if (!vehicle.health) return;

    // Calculate damage based on impact velocity and collision severity
    let damage = 0;
    switch (event.severity) {
        case CollisionSeverity.Light:
            damage = event.impactVelocity * 0.05;
            break;
        case CollisionSeverity.Medium:
            damage = event.impactVelocity * 0.1;
            break;
        case CollisionSeverity.Heavy:
            damage = event.impactVelocity * 0.2;
            break;
    }

    // Apply additional damage for environment collisions
    if (other.environment) {
        damage *= 1.5;
    }

    // Apply damage
    vehicle.health = Math.max(0, vehicle.health - damage);

    // Check for destruction
    if (vehicle.health <= 0) {
        vehicle.health = 0;
        // TODO: Trigger destruction effects
    }
}

/**
 * Handles collision events for projectiles
 */
function handleProjectileCollision(projectile: GameEntity, other: GameEntity, event: any) {
    // Apply damage to hit entity
    if (other.health !== undefined) {
        const damage = projectile.damage || 20; // Use projectile damage or default
        other.health = Math.max(0, other.health - damage);
    }

    // Mark projectile for removal
    projectile.health = 0;
}

/**
 * Handles collision events for flags
 */
function handleFlagCollision(flag: GameEntity, other: GameEntity, event: any) {
    // Only drones can pick up flags
    if (other.drone && !flag.carriedBy) {
        flag.carriedBy = other.id;
        other.hasFlag = true;
    }
} 