import { world as ecsWorld } from '@shared/ecs/world';
import { EntityType, GameEntity, VehicleType } from '@shared/ecs/types';
import { Vector3, Quaternion } from '@babylonjs/core';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createStateSyncSystem } from './StateSyncSystem';
import { createEntitySystem } from '@shared/ecs/systems/EntitySystem';
import { createAssetSystem } from '@shared/ecs/systems/AssetSystem';

export enum GameMode {
    CTF = 'ctf',
    Deathmatch = 'deathmatch',
    Race = 'race'
}

export interface GameModeConfig {
    mode: GameMode;
    teamCount?: number;
    maxPlayers?: number;
    timeLimit?: number;
    scoreLimit?: number;
    map: {
        path: string;
        type: string;
        scale: number;
    };
    // Optional spawn points and flag positions (will be loaded from map if not provided)
    spawnPoints?: Map<number, Vector3[]>;
    flagPositions?: Map<number, Vector3[]>;
    raceCheckpoints?: Vector3[];
}

/**
 * Creates a system that handles game mode initialization and management
 */
export function createGameModeSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    stateSyncSystem: ReturnType<typeof createStateSyncSystem>,
    entitySystem: ReturnType<typeof createEntitySystem>,
    assetSystem: ReturnType<typeof createAssetSystem>,
    generateEntityId: () => string,
    config: GameModeConfig
) {
    let mapData: ReturnType<typeof assetSystem.loadMap> extends Promise<infer T> ? T : never;
    let isInitialized = false;
    // Add spawn queue
    const spawnQueue: Array<{ vehicleType: VehicleType, team: number, clientId: string }> = [];

    const initialize = async () => {
        if (isInitialized) return;

        try {
            // Load the map
            mapData = await assetSystem.loadMap(config.map.path);

            // Create a single environment entity for the map
            const mapEntity = entitySystem.createEnvironmentEntity(
                "map",
                new Vector3(0, 0, 0)
            );
            
            // Set the map asset
            mapEntity.asset = {
                assetPath: config.map.path,
                assetType: config.map.type,
                scale: config.map.scale,
                isLoaded: false
            };

            // Create physics bodies for all colliders
            const colliderBodies = physicsWorldSystem.createColliderBodies(mapData.colliders);
            mapEntity.physics = {
                body: colliderBodies[0], // Use the first body as the main body
                mass: 0,
                drag: 0,
                angularDrag: 0,
                maxSpeed: 0,
                maxAngularSpeed: 0,
                maxAngularAcceleration: 0,
                angularDamping: 0,
                forceMultiplier: 0,
                thrust: 0,
                lift: 0,
                torque: 0
            };

            // Add the entity to the world
            ecsWorld.add(mapEntity);
            stateSyncSystem.addEntity(mapEntity);
            // Create flags if in CTF mode
            if (config.mode === GameMode.CTF) {
                const flagPositions = config.flagPositions || mapData.flagPositions;
                flagPositions.forEach((positions, team) => {
                    positions.forEach((position, index) => {
                        const flag = entitySystem.createFlagEntity(
                            generateEntityId(),
                            team,
                            position
                        );
                        flag.asset = assetSystem.getDefaultAsset(EntityType.Flag);
                        ecsWorld.add(flag);
                        stateSyncSystem.addEntity(flag);
                    });
                });
            }

            isInitialized = true;

            // Process any queued spawns
            while (spawnQueue.length > 0) {
                const spawn = spawnQueue.shift();
                if (spawn) {
                    spawnVehicle(spawn.vehicleType, spawn.team, spawn.clientId);
                }
            }
        } catch (error) {
            console.error('Failed to initialize game mode:', error);
            throw error;
        }
    };

    const spawnVehicle = (vehicleType: VehicleType, team: number, clientId: string) => {
        // If not initialized, queue the spawn
        if (!isInitialized) {
            console.log(`Queueing spawn for ${vehicleType} on team ${team}`);
            spawnQueue.push({ vehicleType, team, clientId });
            return null;
        }

        // Get spawn positions for team
        const spawnPoints = config.spawnPoints || mapData.spawnPoints;
        const teamSpawns = spawnPoints.get(team) || [];
        
        // If no spawn points for team, use default
        if (teamSpawns.length === 0) {
            console.warn(`No spawn points found for team ${team}, using default position`);
            return spawnVehicleAtPosition(vehicleType, team, new Vector3(0, 10, 0), clientId);
        }

        // Pick a random spawn point for the team
        const spawnIndex = Math.floor(Math.random() * teamSpawns.length);
        const spawnPosition = teamSpawns[spawnIndex];

        return spawnVehicleAtPosition(vehicleType, team, spawnPosition, clientId);
    };

    const spawnVehicleAtPosition = (vehicleType: VehicleType, team: number, position: Vector3, clientId: string) => {
        // Create vehicle entity
        const vehicle = entitySystem.createVehicleEntity(
            generateEntityId(),
            vehicleType,
            position,
            new Quaternion(),
            team
        );

        // Set asset component
        vehicle.asset = assetSystem.getDefaultAsset(vehicleType);
        vehicle.owner = {
            id: clientId,
            isLocal: false
        };
        // Add to world and sync
        ecsWorld.add(vehicle);
        stateSyncSystem.addEntity(vehicle);

        return vehicle;
    };

    const update = (dt: number) => {
        // Game mode specific update logic
        switch (config.mode) {
            case GameMode.CTF:
                updateCTF(dt);
                break;
            case GameMode.Deathmatch:
                updateDeathmatch(dt);
                break;
            case GameMode.Race:
                updateRace(dt);
                break;
        }
    };

    return {
        initialize,
        spawnVehicle,
        update,
        isInitialized: () => isInitialized
    };
}

/**
 * Updates Capture the Flag game mode
 */
function updateCTF(dt: number) {
    // CTF specific update logic
    // This could include scoring, flag capture logic, etc.
}

/**
 * Updates Deathmatch game mode
 */
function updateDeathmatch(dt: number) {
    // Deathmatch specific update logic
    // This could include kill tracking, respawn logic, etc.
}

/**
 * Updates Race game mode
 */
function updateRace(dt: number) {
    // Race specific update logic
    // This could include checkpoint tracking, lap counting, etc.
} 