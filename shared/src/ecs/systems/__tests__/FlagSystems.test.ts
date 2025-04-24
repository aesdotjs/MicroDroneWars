import { describe, test, expect, beforeEach } from 'vitest'
import { Vector3 } from 'babylonjs'
import { world as ecsWorld } from '../../world'
import { createFlagSystem } from '../FlagSystems'
import { GameEntity } from '../../types'

describe('FlagSystem', () => {
  let flagSystem: ReturnType<typeof createFlagSystem>

  beforeEach(() => {
    flagSystem = createFlagSystem()
    ecsWorld.clear()
  })

  test('should allow flag capture when vehicle is close enough', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      flag: true,
      team: 0,
      position: new Vector3(0, 0, 0),
      atBase: true
    } as GameEntity)

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      drone: true,
      team: 1,
      position: new Vector3(2, 0, 0)
    } as GameEntity)

    flagSystem.update(1/60)

    expect(flag.carriedBy).toBe('vehicle1')
    expect(vehicle.hasFlag).toBe(true)
  })

  test('should not allow flag capture when vehicle is too far', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      flag: true,
      team: 0,
      position: new Vector3(0, 0, 0),
      atBase: true
    } as GameEntity)

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      drone: true,
      team: 1,
      position: new Vector3(10, 0, 0)
    } as GameEntity)

    flagSystem.update(1/60)

    expect(flag.carriedBy).toBeUndefined()
    expect(vehicle.hasFlag).toBeUndefined()
  })

  test('should not allow flag capture by same team', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      flag: true,
      team: 0,
      position: new Vector3(0, 0, 0),
      atBase: true
    } as GameEntity)

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      drone: true,
      team: 0,
      position: new Vector3(2, 0, 0)
    } as GameEntity)

    flagSystem.update(1/60)

    expect(flag.carriedBy).toBeUndefined()
    expect(vehicle.hasFlag).toBeUndefined()
  })

  test('should update flag position when carried', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      flag: true,
      team: 0,
      position: new Vector3(0, 0, 0),
      atBase: true
    } as GameEntity)

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      drone: true,
      team: 1,
      position: new Vector3(2, 0, 0)
    } as GameEntity)

    // First update to capture flag
    flagSystem.update(1/60)

    // Move vehicle
    vehicle.position = new Vector3(5, 0, 0)
    flagSystem.update(1/60)

    expect(flag.position).toEqual(new Vector3(5, 0, 0))
  })

  test('should return flag to base when carrier reaches base', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      flag: true,
      team: 0,
      position: new Vector3(0, 0, 0),
      atBase: true
    } as GameEntity)

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      drone: true,
      team: 1,
      position: new Vector3(2, 0, 0)
    } as GameEntity)

    // First update to capture flag
    flagSystem.update(1/60)

    // Move vehicle to base
    vehicle.position = new Vector3(-20, 0, 0)
    flagSystem.update(1/60)

    expect(flag.carriedBy).toBeUndefined()
    expect(vehicle.hasFlag).toBe(false)
    expect(flag.atBase).toBe(true)
    expect(flag.position).toEqual(new Vector3(-20, 0, 0))
  })

  test('should return flag to base when carrier is destroyed', () => {
    const flag = ecsWorld.add({
      id: 'flag1',
      flag: true,
      team: 0,
      position: new Vector3(0, 0, 0),
      atBase: true
    } as GameEntity)

    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      drone: true,
      team: 1,
      position: new Vector3(2, 0, 0)
    } as GameEntity)

    // First update to capture flag
    flagSystem.update(1/60)

    // Remove carrier
    ecsWorld.remove(vehicle)
    flagSystem.update(1/60)

    expect(flag.carriedBy).toBeUndefined()
    expect(flag.atBase).toBe(true)
    expect(flag.position).toEqual(new Vector3(-20, 0, 0))
  })

  test('should handle multiple flags and vehicles', () => {
    const flag1 = ecsWorld.add({
      id: 'flag1',
      flag: true,
      team: 0,
      position: new Vector3(0, 0, 0),
      atBase: true
    } as GameEntity)

    const flag2 = ecsWorld.add({
      id: 'flag2',
      flag: true,
      team: 1,
      position: new Vector3(100, 0, 0),
      atBase: true
    } as GameEntity)

    const vehicle1 = ecsWorld.add({
      id: 'vehicle1',
      drone: true,
      team: 1,
      position: new Vector3(2, 0, 0)
    } as GameEntity)

    const vehicle2 = ecsWorld.add({
      id: 'vehicle2',
      drone: true,
      team: 0,
      position: new Vector3(102, 0, 0)
    } as GameEntity)

    flagSystem.update(1/60)

    expect(flag1.carriedBy).toBe('vehicle1')
    expect(flag2.carriedBy).toBe('vehicle2')
    expect(vehicle1.hasFlag).toBe(true)
    expect(vehicle2.hasFlag).toBe(true)
  })
}) 