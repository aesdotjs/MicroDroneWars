import { describe, test, expect, beforeEach } from 'vitest'
import { world as ecsWorld } from '../../world'
import { createHealthSystem } from '../HealthSystems'
import { GameEntity } from '../../types'

describe('HealthSystem', () => {
  beforeEach(() => {
    // Clear the world before each test
    ecsWorld.clear()
  })

  test('should remove drone entity when health reaches 0', () => {
    const entity = ecsWorld.add({
      drone: true,
      health: 0,
      maxHealth: 100
    } as GameEntity)

    const healthSystem = createHealthSystem()
    healthSystem.update(1/60)

    expect(ecsWorld.entities).not.toContain(entity)
  })

  test('should remove projectile entity when health reaches 0', () => {
    const entity = ecsWorld.add({
      projectile: true,
      health: 0,
      maxHealth: 100
    } as GameEntity)

    const healthSystem = createHealthSystem()
    healthSystem.update(1/60)

    expect(ecsWorld.entities).not.toContain(entity)
  })

  test('should regenerate health over time', () => {
    const entity = ecsWorld.add({
      drone: true,
      health: 50,
      maxHealth: 100
    } as GameEntity)

    const healthSystem = createHealthSystem()
    healthSystem.update(1) // 1 second

    expect(entity.health).toBe(51)
  })

  test('should not exceed maxHealth when regenerating', () => {
    const entity = ecsWorld.add({
      drone: true,
      health: 99,
      maxHealth: 100
    } as GameEntity)

    const healthSystem = createHealthSystem()
    healthSystem.update(2) // 2 seconds

    expect(entity.health).toBe(100)
  })

  test('should not regenerate if health is at max', () => {
    const entity = ecsWorld.add({
      drone: true,
      health: 100,
      maxHealth: 100
    } as GameEntity)

    const healthSystem = createHealthSystem()
    healthSystem.update(1)

    expect(entity.health).toBe(100)
  })
}) 