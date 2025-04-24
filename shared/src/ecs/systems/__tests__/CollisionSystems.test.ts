import { describe, test, expect, beforeEach, vi } from 'vitest'
import * as CANNON from 'cannon-es'
import { world as ecsWorld } from '../../world'
import { 
  createCollisionSystem,
  determineCollisionType,
  determineCollisionSeverity,
  handleVehicleCollision,
  handleProjectileCollision,
  handleFlagCollision
} from '../CollisionSystems'
import { GameEntity, CollisionType, CollisionSeverity } from '../../types'
import { CollisionGroups } from '../../CollisionGroups'

describe('CollisionSystem', () => {
  let cannonWorld: CANNON.World
  let collisionSystem: ReturnType<typeof createCollisionSystem>

  beforeEach(() => {
    cannonWorld = new CANNON.World()
    collisionSystem = createCollisionSystem(cannonWorld)
    ecsWorld.clear()
  })

  test('should determine vehicle-vehicle collision type', () => {
    const bodyA = new CANNON.Body()
    const bodyB = new CANNON.Body()
    bodyA.collisionFilterGroup = CollisionGroups.Drones
    bodyB.collisionFilterGroup = CollisionGroups.Planes

    const collisionType = determineCollisionType(bodyA, bodyB)
    expect(collisionType).toBe(CollisionType.VehicleVehicle)
  })

  test('should determine vehicle-environment collision type', () => {
    const bodyA = new CANNON.Body()
    const bodyB = new CANNON.Body()
    bodyA.collisionFilterGroup = CollisionGroups.Drones
    bodyB.collisionFilterGroup = CollisionGroups.Environment

    const collisionType = determineCollisionType(bodyA, bodyB)
    expect(collisionType).toBe(CollisionType.VehicleEnvironment)
  })

  test('should determine vehicle-projectile collision type', () => {
    const bodyA = new CANNON.Body()
    const bodyB = new CANNON.Body()
    bodyA.collisionFilterGroup = CollisionGroups.Drones
    bodyB.collisionFilterGroup = CollisionGroups.Projectiles

    const collisionType = determineCollisionType(bodyA, bodyB)
    expect(collisionType).toBe(CollisionType.VehicleProjectile)
  })

  test('should determine collision severity based on impact velocity', () => {
    expect(determineCollisionSeverity(4)).toBe(CollisionSeverity.Light)
    expect(determineCollisionSeverity(12)).toBe(CollisionSeverity.Medium)
    expect(determineCollisionSeverity(20)).toBe(CollisionSeverity.Heavy)
  })

  test('should handle vehicle collision damage', () => {
    const vehicle = ecsWorld.add({
      drone: true,
      health: 100,
      body: new CANNON.Body()
    } as GameEntity)

    const other = ecsWorld.add({
      environment: true,
      body: new CANNON.Body()
    } as GameEntity)

    const event = {
      severity: CollisionSeverity.Medium,
      impactVelocity: 12,
      bodyA: vehicle.body,
      bodyB: other.body
    }

    handleVehicleCollision(vehicle, other, event)
    expect(vehicle.health).toBeLessThan(100)
  })

  test('should handle projectile collision', () => {
    const projectile = ecsWorld.add({
      projectile: true,
      health: 100,
      damage: 50,
      body: new CANNON.Body()
    } as GameEntity)

    const target = ecsWorld.add({
      drone: true,
      health: 100,
      body: new CANNON.Body()
    } as GameEntity)

    const event = {
      bodyA: projectile.body,
      bodyB: target.body
    }

    handleProjectileCollision(projectile, target, event)
    expect(target.health).toBe(50)
    expect(projectile.health).toBe(0)
  })

  test('should handle flag collision', () => {
    const flag = ecsWorld.add({
      flag: true,
      body: new CANNON.Body()
    } as GameEntity)

    const drone = ecsWorld.add({
      drone: true,
      id: 'drone1',
      body: new CANNON.Body()
    } as GameEntity)

    const event = {
      bodyA: flag.body,
      bodyB: drone.body
    }

    handleFlagCollision(flag, drone, event)
    expect(flag.carriedBy).toBe('drone1')
    expect(drone.hasFlag).toBe(true)
  })

  test('should not allow non-drones to pick up flags', () => {
    const flag = ecsWorld.add({
      flag: true,
      body: new CANNON.Body()
    } as GameEntity)

    const plane = ecsWorld.add({
      plane: true,
      id: 'plane1',
      body: new CANNON.Body()
    } as GameEntity)

    const event = {
      bodyA: flag.body,
      bodyB: plane.body
    }

    handleFlagCollision(flag, plane, event)
    expect(flag.carriedBy).toBeUndefined()
    expect(plane.hasFlag).toBeUndefined()
  })
}) 