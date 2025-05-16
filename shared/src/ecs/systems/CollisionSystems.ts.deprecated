import { GameEntity, CollisionType, CollisionSeverity, CollisionGroups, EntityType } from '../types';
import { Body, ContactEquation, World, Vec3, Quaternion } from 'cannon-es';
import { world as ecsWorld } from '../world';
import { Vector3 } from '@babylonjs/core';
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
            
        }
    };
}

/**
 * Determines the type of collision based on the colliding bodies
 */
export function determineCollisionType(bodyA: Body, bodyB: Body): CollisionType {
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
export function determineCollisionSeverity(impactVelocity: number): CollisionSeverity {
    const absVelocity = Math.abs(impactVelocity);
    if (absVelocity >= 15) return CollisionSeverity.Heavy;
    if (absVelocity >= 10) return CollisionSeverity.Medium;
    return CollisionSeverity.Light;
}

/**
 * Handles a collision event and routes it to the appropriate handler
 */
function handleCollisionEvent(event: any) {
    const entityA = ecsWorld.entities.find(e => e.physics?.body === event.bodyA);
    const entityB = ecsWorld.entities.find(e => e.physics?.body === event.bodyB);
    if (!entityA || !entityB) return;

    // Handle vehicle collisions
    if (entityA.type === EntityType.Vehicle) {
        handleVehicleCollision(entityA, entityB, event);
    }
    if (entityB.type === EntityType.Vehicle) {
        handleVehicleCollision(entityB, entityA, event);
    }

    // Handle projectile collisions
    if (entityA.type === EntityType.Projectile) {
        handleProjectileCollision(entityA, entityB, event);
    }
    if (entityB.type === EntityType.Projectile) {
        handleProjectileCollision(entityB, entityA, event);
    }

    // Handle flag collisions
    if (entityA.gameState?.hasFlag) {
        handleFlagCollision(entityA, entityB, event);
    }
    if (entityB.gameState?.hasFlag) {
        handleFlagCollision(entityB, entityA, event);
    }
}

/**
 * Handles collision events for vehicles
 */
export function handleVehicleCollision(vehicle: GameEntity, other: GameEntity, event: any) {
    if (!vehicle.gameState?.health) return;

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
    // Check if the other entity is an environment object (no gameState or type is Environment)
    const isEnvironmentCollision = !other.gameState || other.type === EntityType.Environment;
    if (isEnvironmentCollision) {
        damage *= 1.5;
    }

    // Apply damage
    vehicle.gameState.health = Math.max(0, vehicle.gameState.health - damage);

    // Check for destruction
    if (vehicle.gameState.health <= 0) {
        vehicle.gameState.health = 0;
        // TODO: Trigger destruction effects
    }
}

/**
 * Handles collision events for projectiles
 */
export function handleProjectileCollision(projectile: GameEntity, other: GameEntity, event: any) {
    // Check if projectile has required components
    if (!projectile.gameState || !projectile.projectile) {
        console.warn('Projectile missing required components:', projectile.id);
        return;
    }

    // Check if other entity has gameState and health
    if (other.gameState && other.gameState.health !== undefined) {
        // const damage = projectile.projectile.damage || 20; // Use projectile damage or default
        // other.gameState.health = Math.max(0, other.gameState.health - damage);
        // console.log('other is dead');
    }
    const contactEq = event?.bodyB?.world.contacts[0];
    // console.log(event?.bodyB?.world.contacts);
    // console.log(contactEq.ri.x, contactEq.ri.y, contactEq.ri.z, contactEq.bi.position.x, contactEq.bi.position.y, contactEq.bi.position.z);
    // console.log(event.contactPoint, event.normal);
    const position = new Vector3(contactEq.bi.position.x + contactEq.ri.x, contactEq.bi.position.y + contactEq.ri.y, contactEq.bi.position.z + contactEq.ri.z);
    projectile.projectile.impact = {
        position,
        normal: new Vector3(event.normal.x, event.normal.y, event.normal.z),
        impactVelocity: event.impactVelocity,
        targetId: other.id,
        targetType: other.type || ""
    }
}

/**
 * Handles collision events for flags
 */
export function handleFlagCollision(flag: GameEntity, other: GameEntity, event: any) {
    // Only vehicles can pick up flags
    if (other.vehicle && !flag.gameState!.carriedBy) {
        flag.gameState!.carriedBy = other.id;
        other.gameState!.hasFlag = true;
    }
} 