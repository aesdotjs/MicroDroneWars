import { GameEntity } from '../types';
import { Vector3, Quaternion } from 'babylonjs';
import * as CANNON from 'cannon-es';
import { DroneSettings, PlaneSettings } from '../types';
import { CollisionGroups } from '../CollisionGroups';

/**
 * Creates a vehicle entity in the ECS world
 */
export function createVehicleEntity(
    id: string,
    vehicleType: 'drone' | 'plane',
    position: Vector3,
    team: number,
    physicsWorld: any
): GameEntity {
    // Create physics body
    const body = new CANNON.Body({
        mass: vehicleType === 'drone' ? DroneSettings.mass : PlaneSettings.mass,
        material: new CANNON.Material('vehicleMaterial'),
        collisionFilterGroup: vehicleType === 'drone' ? CollisionGroups.Drones : CollisionGroups.Planes,
        collisionFilterMask: CollisionGroups.Environment | CollisionGroups.Drones | CollisionGroups.Planes,
        position: new CANNON.Vec3(position.x, position.y, position.z),
        quaternion: new CANNON.Quaternion(0, 0, 0, 1)
    });

    // Add collision shape based on vehicle type
    if (vehicleType === 'drone') {
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.25, 0.5));
        body.addShape(shape);
    } else {
        const shape = new CANNON.Box(new CANNON.Vec3(1.5, 0.3, 0.5));
        body.addShape(shape);
    }

    // Add body to world
    physicsWorld.getWorld().addBody(body);

    // Create entity
    return {
        id,
        type: vehicleType,
        position: position.clone(),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0),
        health: 100,
        maxHealth: vehicleType === 'drone' ? 150 : 100,
        team,
        body,
        [vehicleType]: true,
        vehicleType,
        weapons: [],
        activeWeaponIndex: 0,
        hasFlag: false,
        carriedBy: "",
        atBase: true,
        tick: 0,
        timestamp: Date.now(),
        lastProcessedInputTimestamp: 0,
        lastProcessedInputTick: 0
    };
}

/**
 * Creates a projectile entity in the ECS world
 */
export function createProjectileEntity(
    id: string,
    sourceId: string,
    position: Vector3,
    direction: Vector3,
    speed: number,
    damage: number,
    range: number,
    type: 'bullet' | 'missile'
): GameEntity {
    return {
        id,
        type: 'projectile',
        position: position.clone(),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: direction.scale(speed),
        projectile: true,
        projectileType: type,
        damage,
        range,
        distanceTraveled: 0,
        sourceId,
        speed,
        tick: 0,
        timestamp: Date.now()
    };
}

/**
 * Creates a flag entity in the ECS world
 */
export function createFlagEntity(
    id: string,
    team: number,
    position: Vector3
): GameEntity {
    return {
        id,
        type: 'flag',
        position: position.clone(),
        rotation: new Quaternion(0, 0, 0, 1),
        flag: true,
        team,
        hasFlag: false,
        carriedBy: "",
        atBase: true,
        tick: 0,
        timestamp: Date.now()
    };
} 