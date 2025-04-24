import { describe, test, expect, beforeEach } from 'vitest'
import { Vector3, Quaternion } from 'babylonjs'
import { world as ecsWorld } from '../../world'
import { createGameModeSystem, GameMode, GameModeConfig } from '../GameModeSystem'
import { GameEntity } from '../../types'

describe('GameModeSystem', () => {
  beforeEach(() => {
    ecsWorld.clear()
  })

  describe('CTF Mode', () => {
    const ctfConfig: GameModeConfig = {
      mode: GameMode.CTF,
      teamCount: 2,
      flagPositions: [
        new Vector3(0, 0, 0),
        new Vector3(100, 0, 0)
      ]
    }

    test('should initialize CTF mode with flags', () => {
      const gameModeSystem = createGameModeSystem(ctfConfig)
      gameModeSystem.initialize()

      const flags = Array.from(ecsWorld.with('flag'))
      expect(flags.length).toBe(2)
      expect(flags[0].id).toBe('flag_team0')
      expect(flags[1].id).toBe('flag_team1')
    })

    test('should throw error if flag positions are missing', () => {
      const invalidConfig: GameModeConfig = {
        mode: GameMode.CTF
      }

      const gameModeSystem = createGameModeSystem(invalidConfig)
      expect(() => gameModeSystem.initialize()).toThrow('CTF mode requires at least 2 flag positions')
    })

    test('should create flags at correct positions', () => {
      const gameModeSystem = createGameModeSystem(ctfConfig)
      gameModeSystem.initialize()

      const flags = Array.from(ecsWorld.with('flag'))
      expect(flags[0].position).toEqual(new Vector3(0, 0, 0))
      expect(flags[1].position).toEqual(new Vector3(100, 0, 0))
    })
  })

  describe('Deathmatch Mode', () => {
    const deathmatchConfig: GameModeConfig = {
      mode: GameMode.Deathmatch,
      spawnPoints: [
        new Vector3(0, 0, 0),
        new Vector3(10, 0, 0)
      ]
    }

    test('should initialize deathmatch mode without errors', () => {
      const gameModeSystem = createGameModeSystem(deathmatchConfig)
      expect(() => gameModeSystem.initialize()).not.toThrow()
    })
  })

  describe('Race Mode', () => {
    const raceConfig: GameModeConfig = {
      mode: GameMode.Race,
      raceCheckpoints: [
        new Vector3(0, 0, 0),
        new Vector3(50, 0, 0),
        new Vector3(100, 0, 0)
      ]
    }

    test('should initialize race mode with checkpoints', () => {
      const gameModeSystem = createGameModeSystem(raceConfig)
      gameModeSystem.initialize()

      const checkpoints = Array.from(ecsWorld.with('checkpoint'))
      expect(checkpoints.length).toBe(3)
      expect(checkpoints[0].checkpointIndex).toBe(0)
      expect(checkpoints[1].checkpointIndex).toBe(1)
      expect(checkpoints[2].checkpointIndex).toBe(2)
    })

    test('should throw error if checkpoints are missing', () => {
      const invalidConfig: GameModeConfig = {
        mode: GameMode.Race
      }

      const gameModeSystem = createGameModeSystem(invalidConfig)
      expect(() => gameModeSystem.initialize()).toThrow('Race mode requires at least 2 checkpoints')
    })

    test('should create checkpoints at correct positions', () => {
      const gameModeSystem = createGameModeSystem(raceConfig)
      gameModeSystem.initialize()

      const checkpoints = Array.from(ecsWorld.with('checkpoint'))
      expect(checkpoints[0].position).toEqual(new Vector3(0, 0, 0))
      expect(checkpoints[1].position).toEqual(new Vector3(50, 0, 0))
      expect(checkpoints[2].position).toEqual(new Vector3(100, 0, 0))
    })
  })

  test('should handle update for all game modes', () => {
    const configs = [
      { mode: GameMode.CTF, flagPositions: [new Vector3(0, 0, 0), new Vector3(100, 0, 0)] },
      { mode: GameMode.Deathmatch },
      { mode: GameMode.Race, raceCheckpoints: [new Vector3(0, 0, 0), new Vector3(100, 0, 0)] }
    ]

    for (const config of configs) {
      const gameModeSystem = createGameModeSystem(config)
      gameModeSystem.initialize()
      expect(() => gameModeSystem.update(1/60)).not.toThrow()
    }
  })
}) 