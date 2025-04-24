import { describe, test, expect, beforeEach } from 'vitest'
import { Vector3, Quaternion } from 'babylonjs'
import { createStateSyncSystem } from '../StateSyncSystem'
import { State, EntitySchema, Weapon } from '../../../types/schemas'
import { GameEntity } from '../../types'

describe('StateSyncSystem', () => {
  let state: State
  let stateSyncSystem: ReturnType<typeof createStateSyncSystem>

  beforeEach(() => {
    state = new State()
    stateSyncSystem = createStateSyncSystem(state)
  })

  test('should sync transform data', () => {
    const entity: GameEntity = {
      id: 'test1',
      position: new Vector3(1, 2, 3),
      rotation: new Quaternion(0.5, 0.5, 0.5, 0.5),
      velocity: new Vector3(4, 5, 6),
      angularVelocity: new Vector3(0.1, 0.2, 0.3)
    }

    const entityState = new EntitySchema()
    entityState.id = 'test1'
    state.entities.set('test1', entityState)

    stateSyncSystem.update([entity])

    expect(entityState.positionX).toBe(1)
    expect(entityState.positionY).toBe(2)
    expect(entityState.positionZ).toBe(3)
    expect(entityState.quaternionX).toBe(0.5)
    expect(entityState.quaternionY).toBe(0.5)
    expect(entityState.quaternionZ).toBe(0.5)
    expect(entityState.quaternionW).toBe(0.5)
    expect(entityState.linearVelocityX).toBe(4)
    expect(entityState.linearVelocityY).toBe(5)
    expect(entityState.linearVelocityZ).toBe(6)
    expect(entityState.angularVelocityX).toBe(0.1)
    expect(entityState.angularVelocityY).toBe(0.2)
    expect(entityState.angularVelocityZ).toBe(0.3)
  })

  test('should sync common state data', () => {
    const entity: GameEntity = {
      id: 'test1',
      health: 100,
      maxHealth: 200,
      hasFlag: true,
      carriedBy: 'player1',
      atBase: true,
      team: 1
    }

    const entityState = new EntitySchema()
    entityState.id = 'test1'
    state.entities.set('test1', entityState)

    stateSyncSystem.update([entity])

    expect(entityState.health).toBe(100)
    expect(entityState.maxHealth).toBe(200)
    expect(entityState.hasFlag).toBe(true)
    expect(entityState.carriedBy).toBe('player1')
    expect(entityState.atBase).toBe(true)
    expect(entityState.team).toBe(1)
  })

  test('should sync vehicle data', () => {
    const entity: GameEntity = {
      id: 'test1',
      drone: true,
      weapons: [
        {
          id: 'weapon1',
          name: 'Weapon 1',
          projectileType: 'bullet',
          damage: 10,
          fireRate: 1,
          projectileSpeed: 10,
          cooldown: 1,
          range: 100,
          isOnCooldown: false,
          lastFireTime: 0
        }
      ],
      activeWeaponIndex: 0
    }

    const entityState = new EntitySchema()
    entityState.id = 'test1'
    state.entities.set('test1', entityState)

    stateSyncSystem.update([entity])

    expect(entityState.type).toBe('drone')
    expect(entityState.vehicleType).toBe('drone')
    expect(entityState.weapons.length).toBe(1)
    expect(entityState.weapons[0].id).toBe('weapon1')
    expect(entityState.weapons[0].name).toBe('Weapon 1')
    expect(entityState.activeWeaponIndex).toBe(0)
  })

  test('should sync projectile data', () => {
    const entity: GameEntity = {
      id: 'test1',
      projectile: true,
      damage: 50,
      range: 100,
      distanceTraveled: 25,
      sourceId: 'player1'
    }

    const entityState = new EntitySchema()
    entityState.id = 'test1'
    state.entities.set('test1', entityState)

    stateSyncSystem.update([entity])

    expect(entityState.type).toBe('projectile')
    expect(entityState.damage).toBe(50)
    expect(entityState.range).toBe(100)
    expect(entityState.distanceTraveled).toBe(25)
    expect(entityState.sourceId).toBe('player1')
  })

  test('should sync flag data', () => {
    const entity: GameEntity = {
      id: 'test1',
      flag: true
    }

    const entityState = new EntitySchema()
    entityState.id = 'test1'
    state.entities.set('test1', entityState)

    stateSyncSystem.update([entity])

    expect(entityState.type).toBe('flag')
  })

  test('should sync timestamps and ticks', () => {
    const entity: GameEntity = {
      id: 'test1',
      tick: 100,
      timestamp: 1000,
      lastProcessedInputTimestamp: 900,
      lastProcessedInputTick: 90
    }

    const entityState = new EntitySchema()
    entityState.id = 'test1'
    state.entities.set('test1', entityState)

    stateSyncSystem.update([entity])

    expect(entityState.tick).toBe(100)
    expect(entityState.timestamp).toBe(1000)
    expect(entityState.lastProcessedInputTimestamp).toBe(900)
    expect(entityState.lastProcessedInputTick).toBe(90)
  })

  test('should handle multiple entities', () => {
    const entities: GameEntity[] = [
      {
        id: 'test1',
        position: new Vector3(1, 2, 3)
      },
      {
        id: 'test2',
        position: new Vector3(4, 5, 6)
      }
    ]

    const entityState1 = new EntitySchema()
    entityState1.id = 'test1'
    const entityState2 = new EntitySchema()
    entityState2.id = 'test2'
    state.entities.set('test1', entityState1)
    state.entities.set('test2', entityState2)

    stateSyncSystem.update(entities)

    expect(entityState1.positionX).toBe(1)
    expect(entityState1.positionY).toBe(2)
    expect(entityState1.positionZ).toBe(3)
    expect(entityState2.positionX).toBe(4)
    expect(entityState2.positionY).toBe(5)
    expect(entityState2.positionZ).toBe(6)
  })
}) 