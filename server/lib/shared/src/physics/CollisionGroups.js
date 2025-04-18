"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collisionMasks = exports.CollisionGroups = void 0;
/**
 * Defines collision groups for different types of physics bodies in the game.
 * Uses bit flags to enable efficient collision filtering.
 */
var CollisionGroups;
(function (CollisionGroups) {
    /** Default collision group for basic physics objects */
    CollisionGroups[CollisionGroups["Default"] = 1] = "Default";
    /** Collision group for drone vehicles */
    CollisionGroups[CollisionGroups["Drones"] = 2] = "Drones";
    /** Collision group for plane vehicles */
    CollisionGroups[CollisionGroups["Planes"] = 4] = "Planes";
    /** Collision group for environment objects (ground, obstacles) */
    CollisionGroups[CollisionGroups["Environment"] = 8] = "Environment";
    /** Collision group for projectile objects */
    CollisionGroups[CollisionGroups["Projectiles"] = 16] = "Projectiles";
    /** Collision group for flag objects */
    CollisionGroups[CollisionGroups["Flags"] = 32] = "Flags";
    /** Collision group for trimesh colliders */
    CollisionGroups[CollisionGroups["TrimeshColliders"] = 64] = "TrimeshColliders";
})(CollisionGroups || (exports.CollisionGroups = CollisionGroups = {}));
/**
 * Predefined collision masks for different vehicle types.
 * Each mask is a combination of collision groups that the vehicle can interact with.
 */
exports.collisionMasks = {
    /** Drone collision mask - can collide with environment, projectiles, flags, and planes */
    Drone: CollisionGroups.Environment | CollisionGroups.Projectiles | CollisionGroups.Flags | CollisionGroups.Planes,
    /** Plane collision mask - can collide with environment, projectiles, flags, and drones */
    Plane: CollisionGroups.Environment | CollisionGroups.Projectiles | CollisionGroups.Flags | CollisionGroups.Drones,
    /** Projectile collision mask - can collide with drones, planes, and environment */
    Projectile: CollisionGroups.Drones | CollisionGroups.Planes | CollisionGroups.Environment,
    /** Flag collision mask - can collide with drones and planes */
    Flag: CollisionGroups.Drones | CollisionGroups.Planes
};
