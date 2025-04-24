import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';
import { Vector3, Quaternion } from 'babylonjs';
import { createFlagEntity } from './ServerSystems';

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
export function createGameModeSystem(config: GameModeConfig) {
    return {
        initialize: () => {
            switch (config.mode) {
                case GameMode.CTF:
                    initializeCTF(config);
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
function initializeCTF(config: GameModeConfig) {
    if (!config.flagPositions || config.flagPositions.length < 2) {
        throw new Error('CTF mode requires at least 2 flag positions');
    }

    // Create flags for each team
    const teamCount = config.teamCount || 2;
    for (let i = 0; i < teamCount; i++) {
        const flagPosition = config.flagPositions[i];
        const flag = createFlagEntity(`flag_team${i}`, i, flagPosition);
        ecsWorld.add(flag);
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
        const checkpoint = {
            id: `checkpoint_${index}`,
            checkpoint: true,
            checkpointIndex: index,
            position: position.clone(),
            rotation: Quaternion.Identity()
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