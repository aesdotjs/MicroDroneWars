import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';
import { Vector3, Quaternion } from 'babylonjs';
import { createFlagEntity } from '@shared/ecs/utils/EntityHelpers';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createStateSyncSystem } from './StateSyncSystem';

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
    spawnPoints?: Vector3[];
    flagPositions?: Vector3[];
    raceCheckpoints?: Vector3[];
}

/**
 * Creates a system that handles game mode initialization and management
 */
export function createGameModeSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    stateSyncSystem: ReturnType<typeof createStateSyncSystem>,
    generateEntityId: () => string,
    config: GameModeConfig
) {
    return {
        initialize: () => {
            switch (config.mode) {
                case GameMode.CTF:
                    initializeCTF(config, physicsWorldSystem, stateSyncSystem);
                    break;
                case GameMode.Deathmatch:
                    initializeDeathmatch(config);
                    break;
                case GameMode.Race:
                    initializeRace(config);
                    break;
            }
        },

        update: (dt: number) => {
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
        }
    };
}

/**
 * Initializes Capture the Flag game mode
 */
function initializeCTF(config: GameModeConfig, physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>, stateSyncSystem: ReturnType<typeof createStateSyncSystem>) {
    if (!config.flagPositions || config.flagPositions.length < 2) {
        throw new Error('CTF mode requires at least 2 flag positions');
    }

    // Create flags for each team
    const teamCount = config.teamCount || 2;
    for (let i = 0; i < teamCount; i++) {
        const flagPosition = config.flagPositions[i];
        const flag = createFlagEntity(`flag_team${i}`, i, flagPosition);
        ecsWorld.add(flag);
        physicsWorldSystem.addBody(flag);
        stateSyncSystem.addEntity(flag);
    }
}

/**
 * Initializes Deathmatch game mode
 */
function initializeDeathmatch(config: GameModeConfig) {
    // Deathmatch doesn't need any special initialization
    // It just uses the default spawn points
}

/**
 * Initializes Race game mode
 */
function initializeRace(config: GameModeConfig) {
    if (!config.raceCheckpoints || config.raceCheckpoints.length < 2) {
        throw new Error('Race mode requires at least 2 checkpoints');
    }

    // Create checkpoints
    config.raceCheckpoints.forEach((position, index) => {
        const checkpoint: GameEntity = {
            id: `checkpoint_${index}`,
            type: 'checkpoint',
            transform: {
                position: position.clone(),
                rotation: Quaternion.Identity(),
                velocity: Vector3.Zero(),
                angularVelocity: Vector3.Zero()
            },
            gameState: {
                health: 100,
                maxHealth: 100,
                team: -1,
                hasFlag: false,
                carryingFlag: false,
                atBase: true
            }
        };
        ecsWorld.add(checkpoint);
    });
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