import * as CANNON from 'cannon-es';
import { CollisionGroups, collisionMasks } from './CollisionGroups';
import { CollisionEvent, VehicleCollisionEvent, CollisionType, CollisionSeverity } from './types';


/**
 * Represents a collision event with additional metadata
 */
export interface EnhancedCollisionEvent {
    type: CollisionType;
    severity: CollisionSeverity;
    bodyA: CANNON.Body;
    bodyB: CANNON.Body;
    impactVelocity: number;
    contactPoint: CANNON.Vec3;
    normal: CANNON.Vec3;
    timestamp: number;
}

/**
 * Callback type for collision events
 */
export type CollisionCallback = (event: EnhancedCollisionEvent) => void;

/**
 * Manages collision events in the physics world.
 * Handles collision detection, filtering, and event dispatching.
 */
export class CollisionManager {
    private world: CANNON.World;
    private callbacks: Map<string, CollisionCallback[]> = new Map();
    private groundBody: CANNON.Body;
    private readonly SEVERITY_THRESHOLDS = {
        light: 5,    // m/s
        medium: 10,  // m/s
        heavy: 15    // m/s
    };

    private readonly tempVec3 = new CANNON.Vec3();
    private readonly tempEvent: EnhancedCollisionEvent = {
        type: CollisionType.VehicleEnvironment,
        severity: CollisionSeverity.Light,
        bodyA: null as any,
        bodyB: null as any,
        impactVelocity: 0,
        contactPoint: new CANNON.Vec3(),
        normal: new CANNON.Vec3(),
        timestamp: 0
    };

    /**
     * Creates a new CollisionManager instance.
     * @param world - The CANNON.js physics world
     * @param groundBody - The ground physics body
     */
    constructor(world: CANNON.World, groundBody: CANNON.Body) {
        this.world = world;
        this.groundBody = groundBody;
        this.initializeCollisionHandling();
    }

    /**
     * Initializes collision event handling for the physics world.
     */
    private initializeCollisionHandling(): void {
        this.world.addEventListener('beginContact', (event: CollisionEvent) => {
            this.handleCollision(event);
        });
    }

    /**
     * Handles a collision event and dispatches it to appropriate callbacks.
     * @param event - The raw collision event from CANNON.js
     */
    private handleCollision(event: CollisionEvent): void {
        const { bodyA, bodyB } = event;
        const contacts = event.target.contacts;
        
        if (!contacts || contacts.length === 0) return;

        // Get the first contact point
        const contact = contacts[0];
        
        // Get collision type and severity
        const collisionType = this.determineCollisionType(bodyA, bodyB);
        
        // Reuse tempVec3 for impact velocity calculation
        this.tempVec3.set(contact.ni.x, contact.ni.y, contact.ni.z);
        const impactVelocity = Math.abs(
            bodyA.velocity.dot(this.tempVec3) -
            bodyB.velocity.dot(this.tempVec3)
        );
        const severity = this.determineCollisionSeverity(impactVelocity);

        // Update temp event object
        this.tempEvent.type = collisionType;
        this.tempEvent.severity = severity;
        this.tempEvent.bodyA = bodyA;
        this.tempEvent.bodyB = bodyB;
        this.tempEvent.impactVelocity = impactVelocity;
        this.tempEvent.contactPoint.set(contact.ri.x, contact.ri.y, contact.ri.z);
        this.tempEvent.normal.set(contact.ni.x, contact.ni.y, contact.ni.z);
        this.tempEvent.timestamp = Date.now();

        // Dispatch to appropriate callbacks
        this.dispatchCollisionEvent(this.tempEvent);
    }

    /**
     * Determines the type of collision based on the colliding bodies.
     */
    private determineCollisionType(bodyA: CANNON.Body, bodyB: CANNON.Body): CollisionType {
        const isGroundCollision = bodyA === this.groundBody || bodyB === this.groundBody;
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
     * Determines the severity of a collision based on impact velocity.
     */
    private determineCollisionSeverity(impactVelocity: number): CollisionSeverity {
        const absVelocity = Math.abs(impactVelocity);
        if (absVelocity >= this.SEVERITY_THRESHOLDS.heavy) return CollisionSeverity.Heavy;
        if (absVelocity >= this.SEVERITY_THRESHOLDS.medium) return CollisionSeverity.Medium;
        return CollisionSeverity.Light;
    }

    /**
     * Dispatches a collision event to all registered callbacks.
     */
    private dispatchCollisionEvent(event: EnhancedCollisionEvent): void {
        // Get IDs of both bodies (convert to string if needed)
        const idA = String(event.bodyA.id);
        const idB = String(event.bodyB.id);

        // Dispatch to specific callbacks for each body
        if (idA) this.dispatchToCallbacks(idA, event);
        if (idB) this.dispatchToCallbacks(idB, event);

        // Dispatch to global callbacks
        const globalCallbacks = this.callbacks.get('global');
        if (globalCallbacks) {
            globalCallbacks.forEach(callback => callback(event));
        }
    }

    /**
     * Dispatches a collision event to callbacks registered for a specific ID.
     */
    private dispatchToCallbacks(id: string, event: EnhancedCollisionEvent): void {
        const callbacks = this.callbacks.get(id);
        if (callbacks) {
            callbacks.forEach(callback => callback(event));
        }
    }

    /**
     * Registers a callback for collision events for a specific body.
     * @param id - The ID of the body to register the callback for
     * @param callback - The function to call when a collision occurs
     */
    public registerCollisionCallback(id: string, callback: CollisionCallback): void {
        if (!this.callbacks.has(id)) {
            this.callbacks.set(id, []);
        }
        this.callbacks.get(id)!.push(callback);
    }

    /**
     * Registers a global callback for all collision events.
     * @param callback - The function to call when any collision occurs
     */
    public registerGlobalCollisionCallback(callback: CollisionCallback): void {
        if (!this.callbacks.has('global')) {
            this.callbacks.set('global', []);
        }
        this.callbacks.get('global')!.push(callback);
    }

    /**
     * Removes a collision callback for a specific body.
     * @param id - The ID of the body to remove the callback for
     * @param callback - The callback function to remove
     */
    public unregisterCollisionCallback(id: string, callback: CollisionCallback): void {
        const callbacks = this.callbacks.get(id);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Removes a global collision callback.
     * @param callback - The global callback function to remove
     */
    public unregisterGlobalCollisionCallback(callback: CollisionCallback): void {
        const callbacks = this.callbacks.get('global');
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Cleans up all registered callbacks.
     */
    public cleanup(): void {
        this.callbacks.clear();
    }
} 