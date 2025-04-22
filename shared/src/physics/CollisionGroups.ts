/**
 * Defines collision groups for different types of physics bodies in the game.
 * Uses bit flags to enable efficient collision filtering.
 */
export enum CollisionGroups {
    /** Default collision group for basic physics objects */
    Default = 1,
    /** Collision group for drone vehicles */
    Drones = 2,
    /** Collision group for plane vehicles */
    Planes = 4,
    /** Collision group for environment objects (ground, obstacles) */
    Environment = 8,
    /** Collision group for projectile objects */
    Projectiles = 16,
    /** Collision group for flag objects */
    Flags = 32,
    /** Collision group for trimesh colliders */
    TrimeshColliders = 64
}

/**
 * Interface defining collision masks for different vehicle types.
 * Each mask specifies which collision groups a vehicle can collide with.
 */
export interface CollisionMasks {
    /** Collision mask for drone vehicles */
    Drone: number;
    /** Collision mask for plane vehicles */
    Plane: number;
    /** Collision mask for projectile objects */
    Projectile: number;
    /** Collision mask for flag objects */
    Flag: number;
}

/**
 * Predefined collision masks for different vehicle types.
 * Each mask is a combination of collision groups that the vehicle can interact with.
 */
export const collisionMasks: CollisionMasks = {
    /** Drone collision mask - can collide with environment, projectiles, flags, and planes */
    Drone: CollisionGroups.Drones | CollisionGroups.Environment | CollisionGroups.Projectiles | CollisionGroups.Flags | CollisionGroups.Planes,
    /** Plane collision mask - can collide with environment, projectiles, flags, and drones */
    Plane: CollisionGroups.Planes | CollisionGroups.Environment | CollisionGroups.Projectiles | CollisionGroups.Flags | CollisionGroups.Drones,
    /** Projectile collision mask - can collide with drones, planes, and environment */
    Projectile: CollisionGroups.Drones | CollisionGroups.Planes | CollisionGroups.Environment,
    /** Flag collision mask - can collide with drones and planes */
    Flag: CollisionGroups.Drones | CollisionGroups.Planes
}; 