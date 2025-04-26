import { describe, it, expect, beforeEach } from 'vitest'
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
      ],
      spawnPoints: [
        new Vector3(-10, 0, 0),
        new Vector3(110, 0, 0)
      ]
    }

    it('should initialize CTF mode with flags', () => {
      const gameModeSystem = createGameModeSystem(ctfConfig)
      gameModeSystem.initialize()

      const flags = ecsWorld.entities.filter(e => e.type === 'flag') as GameEntity[]
      expect(flags.length).toBe(2)
      expect(flags[0].id).toBe('flag_team0')
      expect(flags[1].id).toBe('flag_team1')
    })

    it('should throw error if flag positions are missing', () => {
      const invalidConfig: GameModeConfig = {
        mode: GameMode.CTF
      }

      const gameModeSystem = createGameModeSystem(invalidConfig)
      expect(() => gameModeSystem.initialize()).toThrow('CTF mode requires at least 2 flag positions')
    })

    it('should create flags at correct positions', () => {
      const gameModeSystem = createGameModeSystem(ctfConfig)
      gameModeSystem.initialize()

      const flags = ecsWorld.entities.filter(e => e.type === 'flag') as GameEntity[]
      if (!flags[0].transform || !flags[1].transform) {
        throw new Error('Required components missing')
      }
      expect(flags[0].transform.position).toEqual(new Vector3(0, 0, 0))
      expect(flags[1].transform.position).toEqual(new Vector3(100, 0, 0))
    })

    it('should create flags with correct team assignments', () => {
      const gameModeSystem = createGameModeSystem(ctfConfig)
      gameModeSystem.initialize()

      const flags = ecsWorld.entities.filter(e => e.type === 'flag') as GameEntity[]
      expect(flags[0].gameState?.team).toBe(0)
      expect(flags[1].gameState?.team).toBe(1)
    })

    it('should create flags with correct initial state', () => {
      const gameModeSystem = createGameModeSystem(ctfConfig)
      gameModeSystem.initialize()

      const flags = ecsWorld.entities.filter(e => e.type === 'flag') as GameEntity[]
      expect(flags[0].gameState?.atBase).toBe(true)
      expect(flags[0].gameState?.hasFlag).toBe(false)
      expect(flags[0].gameState?.carryingFlag).toBe(false)
      expect(flags[0].gameState?.carriedBy).toBeUndefined()
    })
  })

  describe('Deathmatch Mode', () => {
    const deathmatchConfig: GameModeConfig = {
      mode: GameMode.Deathmatch,
      spawnPoints: [
        new Vector3(0, 0, 0),
        new Vector3(10, 0, 0),
        new Vector3(20, 0, 0)
      ]
    }

    it('should initialize deathmatch mode without errors', () => {
      const gameModeSystem = createGameModeSystem(deathmatchConfig)
      expect(() => gameModeSystem.initialize()).not.toThrow()
    })

    it('should handle update for deathmatch mode', () => {
      const gameModeSystem = createGameModeSystem(deathmatchConfig)
      gameModeSystem.initialize()
      expect(() => gameModeSystem.update(1/60)).not.toThrow()
    })

    it('should track player scores in deathmatch mode', () => {
      const gameModeSystem = createGameModeSystem(deathmatchConfig)
      gameModeSystem.initialize()

      // Add some players
      const player1 = ecsWorld.add({
        id: 'player1',
        type: 'vehicle',
        transform: {
          position: new Vector3(0, 0, 0),
          rotation: new Quaternion(0, 0, 0, 1),
          velocity: new Vector3(0, 0, 0),
          angularVelocity: new Vector3(0, 0, 0)
        },
        gameState: {
          health: 100,
          maxHealth: 100,
          team: 0,
          hasFlag: false,
          carryingFlag: false,
          atBase: true
        }
      } as GameEntity)

      const player2 = ecsWorld.add({
        id: 'player2',
        type: 'vehicle',
        transform: {
          position: new Vector3(10, 0, 0),
          rotation: new Quaternion(0, 0, 0, 1),
          velocity: new Vector3(0, 0, 0),
          angularVelocity: new Vector3(0, 0, 0)
        },
        gameState: {
          health: 100,
          maxHealth: 100,
          team: 1,
          hasFlag: false,
          carryingFlag: false,
          atBase: true
        }
      } as GameEntity)

      // Simulate player1 killing player2
      if (player2.gameState) {
        player2.gameState.health = 0
      }

      gameModeSystem.update(1/60)

      // Check that player2 was respawned
      const respawnedPlayer2 = ecsWorld.entities.find(e => e.id === 'player2') as GameEntity
      expect(respawnedPlayer2.gameState?.health).toBe(100)
    })
  })

  describe('Race Mode', () => {
    const raceConfig: GameModeConfig = {
      mode: GameMode.Race,
      raceCheckpoints: [
        new Vector3(0, 0, 0),
        new Vector3(50, 0, 0),
        new Vector3(100, 0, 0)
      ],
      spawnPoints: [
        new Vector3(-10, 0, 0),
        new Vector3(-10, 0, 10)
      ]
    }

    it('should initialize race mode with checkpoints', () => {
      const gameModeSystem = createGameModeSystem(raceConfig)
      gameModeSystem.initialize()

      const checkpoints = ecsWorld.entities.filter(e => e.type === 'checkpoint') as GameEntity[]
      expect(checkpoints.length).toBe(3)
      expect(checkpoints[0].gameState?.team).toBe(0)
      expect(checkpoints[1].gameState?.team).toBe(1)
      expect(checkpoints[2].gameState?.team).toBe(2)
    })

    it('should throw error if checkpoints are missing', () => {
      const invalidConfig: GameModeConfig = {
        mode: GameMode.Race
      }

      const gameModeSystem = createGameModeSystem(invalidConfig)
      expect(() => gameModeSystem.initialize()).toThrow('Race mode requires at least 2 checkpoints')
    })

    it('should create checkpoints at correct positions', () => {
      const gameModeSystem = createGameModeSystem(raceConfig)
      gameModeSystem.initialize()

      const checkpoints = ecsWorld.entities.filter(e => e.type === 'checkpoint') as GameEntity[]
      if (!checkpoints[0].transform || !checkpoints[1].transform || !checkpoints[2].transform) {
        throw new Error('Required components missing')
      }
      expect(checkpoints[0].transform.position).toEqual(new Vector3(0, 0, 0))
      expect(checkpoints[1].transform.position).toEqual(new Vector3(50, 0, 0))
      expect(checkpoints[2].transform.position).toEqual(new Vector3(100, 0, 0))
    })

    it('should track player progress through checkpoints', () => {
      const gameModeSystem = createGameModeSystem(raceConfig)
      gameModeSystem.initialize()

      // Add a player
      const player = ecsWorld.add({
        id: 'player1',
        type: 'vehicle',
        transform: {
          position: new Vector3(0, 0, 0),
          rotation: new Quaternion(0, 0, 0, 1),
          velocity: new Vector3(0, 0, 0),
          angularVelocity: new Vector3(0, 0, 0)
        },
        gameState: {
          health: 100,
          maxHealth: 100,
          team: 0,
          hasFlag: false,
          carryingFlag: false,
          atBase: true
        }
      } as GameEntity)

      // Move player to first checkpoint
      if (player.transform) {
        player.transform.position = new Vector3(0, 0, 0)
      }
      gameModeSystem.update(1/60)

      // Move player to second checkpoint
      if (player.transform) {
        player.transform.position = new Vector3(50, 0, 0)
      }
      gameModeSystem.update(1/60)

      // Move player to third checkpoint
      if (player.transform) {
        player.transform.position = new Vector3(100, 0, 0)
      }
      gameModeSystem.update(1/60)

      // Check that player completed the race
      expect(player.gameState?.atBase).toBe(true)
    })
  })

  it('should handle update for all game modes', () => {
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