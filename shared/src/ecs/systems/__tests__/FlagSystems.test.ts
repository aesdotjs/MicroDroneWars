import { describe, it, expect, beforeEach } from 'vitest'
import { Vector3, Quaternion } from '@babylonjs/core'
import { world as ecsWorld } from '../../world'
import { createFlagSystem } from '../FlagSystems'
import { GameEntity } from '../../types'

describe('FlagSystem', () => {
  let flagSystem: ReturnType<typeof createFlagSystem>

  beforeEach(() => {
    flagSystem = createFlagSystem()
    ecsWorld.clear()
  })

  it('should allow flag capture when vehicle is close enough', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      type: 'flag',
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

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      type: 'vehicle',
      transform: {
        position: new Vector3(2, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [],
        activeWeaponIndex: 0
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

    flagSystem.update(1/60)

    expect(flag.gameState?.carriedBy).toBe('vehicle1')
    expect(vehicle.gameState?.hasFlag).toBe(true)
  })

  it('should not allow flag capture when vehicle is too far', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      type: 'flag',
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

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      type: 'vehicle',
      transform: {
        position: new Vector3(10, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [],
        activeWeaponIndex: 0
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

    flagSystem.update(1/60)

    expect(flag.gameState?.carriedBy).toBeUndefined()
    expect(vehicle.gameState?.hasFlag).toBeUndefined()
  })

  it('should not allow flag capture by same team', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      type: 'flag',
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

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      type: 'vehicle',
      transform: {
        position: new Vector3(2, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [],
        activeWeaponIndex: 0
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

    flagSystem.update(1/60)

    expect(flag.gameState?.carriedBy).toBeUndefined()
    expect(vehicle.gameState?.hasFlag).toBeUndefined()
  })

  it('should update flag position when carried', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      type: 'flag',
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

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      type: 'vehicle',
      transform: {
        position: new Vector3(2, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [],
        activeWeaponIndex: 0
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

    // First update to capture flag
    flagSystem.update(1/60)

    // Move vehicle
    if (!vehicle.transform) {
      throw new Error('Vehicle transform component missing')
    }
    vehicle.transform.position = new Vector3(5, 0, 0)
    flagSystem.update(1/60)

    if (!flag.transform) {
      throw new Error('Flag transform component missing')
    }
    expect(flag.transform.position).toEqual(new Vector3(5, 0, 0))
  })

  it('should return flag to base when carrier reaches base', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      type: 'flag',
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

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      type: 'vehicle',
      transform: {
        position: new Vector3(2, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [],
        activeWeaponIndex: 0
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

    // First update to capture flag
    flagSystem.update(1/60)

    // Move vehicle to base
    if (!vehicle.transform) {
      throw new Error('Vehicle transform component missing')
    }
    vehicle.transform.position = new Vector3(-20, 0, 0)
    flagSystem.update(1/60)

    expect(flag.gameState?.carriedBy).toBeUndefined()
    expect(vehicle.gameState?.hasFlag).toBe(false)
    expect(flag.gameState?.atBase).toBe(true)
    if (!flag.transform) {
      throw new Error('Flag transform component missing')
    }
    expect(flag.transform.position).toEqual(new Vector3(-20, 0, 0))
  })

  it('should return flag to base when carrier is destroyed', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      type: 'flag',
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

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      type: 'vehicle',
      transform: {
        position: new Vector3(2, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [],
        activeWeaponIndex: 0
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

    // First update to capture flag
    flagSystem.update(1/60)

    // Remove carrier
    ecsWorld.remove(vehicle)
    flagSystem.update(1/60)

    expect(flag.gameState?.carriedBy).toBeUndefined()
    expect(flag.gameState?.atBase).toBe(true)
    if (!flag.transform) {
      throw new Error('Flag transform component missing')
    }
    expect(flag.transform.position).toEqual(new Vector3(-20, 0, 0))
  })

  it('should handle multiple flags and vehicles', () => {
    const flag1 = ecsWorld.add({
      id: 'flag1',
      type: 'flag',
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

    const flag2 = ecsWorld.add({
      id: 'flag2',
      type: 'flag',
      transform: {
        position: new Vector3(100, 0, 0),
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

    const vehicle1 = ecsWorld.add({
      id: 'vehicle1',
      type: 'vehicle',
      transform: {
        position: new Vector3(2, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [],
        activeWeaponIndex: 0
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

    const vehicle2 = ecsWorld.add({
      id: 'vehicle2',
      type: 'vehicle',
      transform: {
        position: new Vector3(102, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [],
        activeWeaponIndex: 0
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

    flagSystem.update(1/60)

    expect(flag1.gameState?.carriedBy).toBe('vehicle1')
    expect(flag2.gameState?.carriedBy).toBe('vehicle2')
    expect(vehicle1.gameState?.hasFlag).toBe(true)
    expect(vehicle2.gameState?.hasFlag).toBe(true)
  })
}) 