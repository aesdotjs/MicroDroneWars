import { describe, it, expect, beforeEach } from 'vitest'
import * as CANNON from 'cannon-es'
import { Vector3, Quaternion } from 'babylonjs'
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

  it('should determine vehicle-vehicle collision type', () => {
    const bodyA = new CANNON.Body()
    const bodyB = new CANNON.Body()
    bodyA.collisionFilterGroup = CollisionGroups.Drones
    bodyB.collisionFilterGroup = CollisionGroups.Planes

    const collisionType = determineCollisionType(bodyA, bodyB)
    expect(collisionType).toBe(CollisionType.VehicleVehicle)
  })

  it('should determine vehicle-environment collision type', () => {
    const bodyA = new CANNON.Body()
    const bodyB = new CANNON.Body()
    bodyA.collisionFilterGroup = CollisionGroups.Drones
    bodyB.collisionFilterGroup = CollisionGroups.Environment

    const collisionType = determineCollisionType(bodyA, bodyB)
    expect(collisionType).toBe(CollisionType.VehicleEnvironment)
  })

  it('should determine vehicle-projectile collision type', () => {
    const bodyA = new CANNON.Body()
    const bodyB = new CANNON.Body()
    bodyA.collisionFilterGroup = CollisionGroups.Drones
    bodyB.collisionFilterGroup = CollisionGroups.Projectiles

    const collisionType = determineCollisionType(bodyA, bodyB)
    expect(collisionType).toBe(CollisionType.VehicleProjectile)
  })

  it('should determine collision severity based on impact velocity', () => {
    expect(determineCollisionSeverity(4)).toBe(CollisionSeverity.Light)
    expect(determineCollisionSeverity(12)).toBe(CollisionSeverity.Medium)
    expect(determineCollisionSeverity(20)).toBe(CollisionSeverity.Heavy)
  })

  it('should handle vehicle collision damage', () => {
    const vehicle = ecsWorld.add({
      id: 'vehicle1',
      type: 'vehicle',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      physics: {
        body: new CANNON.Body(),
        mass: 1,
        drag: 0.8,
        angularDrag: 0.8,
        maxSpeed: 20,
        maxAngularSpeed: 0.2,
        maxAngularAcceleration: 0.05,
        angularDamping: 0.9,
        forceMultiplier: 0.005,
        thrust: 20,
        lift: 15,
        torque: 1
      },
      gameState: {
      health: 100,
        maxHealth: 100,
        team: 0,
        hasFlag: false,
        carryingFlag: false,
        atBase: true
      }
    } as unknown as GameEntity)

    const other = ecsWorld.add({
      id: 'env1',
      type: 'environment',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      physics: {
        body: new CANNON.Body(),
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
      }
    } as unknown as GameEntity)

    if (!vehicle.physics || !other.physics || !vehicle.gameState) {
      throw new Error('Required components missing')
    }

    const event = {
      severity: CollisionSeverity.Medium,
      impactVelocity: 12,
      bodyA: vehicle.physics.body,
      bodyB: other.physics.body
    }

    handleVehicleCollision(vehicle, other, event)
    expect(vehicle.gameState.health).toBeLessThan(100)
  })

  it('should handle projectile collision', () => {
    const projectile = ecsWorld.add({
      id: 'proj1',
      type: 'projectile',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      projectile: {
        projectileType: 'bullet',
        damage: 50,
        range: 100,
        distanceTraveled: 0,
        sourceId: 'player1',
        timestamp: 0,
        tick: 0
      },
      gameState: {
      health: 100,
        maxHealth: 100,
        team: 0,
        hasFlag: false,
        carryingFlag: false,
        atBase: true
      }
    } as unknown as GameEntity)

    const target = ecsWorld.add({
      id: 'target1',
      type: 'vehicle',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      physics: {
        body: new CANNON.Body(),
        mass: 1,
        drag: 0.8,
        angularDrag: 0.8,
        maxSpeed: 20,
        maxAngularSpeed: 0.2,
        maxAngularAcceleration: 0.05,
        angularDamping: 0.9,
        forceMultiplier: 0.005,
        thrust: 20,
        lift: 15,
        torque: 1
      },
      gameState: {
      health: 100,
        maxHealth: 100,
        team: 0,
        hasFlag: false,
        carryingFlag: false,
        atBase: true
      }
    } as unknown as GameEntity)

    if (!projectile.physics || !target.physics || !target.gameState || !projectile.gameState) {
      throw new Error('Required components missing')
    }

    const event = {
      bodyA: projectile.physics.body,
      bodyB: target.physics.body
    }

    handleProjectileCollision(projectile, target, event)
    expect(target.gameState.health).toBe(50)
    expect(projectile.gameState.health).toBe(0)
  })

  it('should handle flag collision', () => {
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
        hasFlag: true,
        carryingFlag: false,
        atBase: true
      }
    } as unknown as GameEntity)

    const drone = ecsWorld.add({
      id: 'drone1',
      type: 'vehicle',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      physics: {
        body: new CANNON.Body(),
        mass: 1,
        drag: 0.8,
        angularDrag: 0.8,
        maxSpeed: 20,
        maxAngularSpeed: 0.2,
        maxAngularAcceleration: 0.05,
        angularDamping: 0.9,
        forceMultiplier: 0.005,
        thrust: 20,
        lift: 15,
        torque: 1
      },
      gameState: {
        health: 100,
        maxHealth: 100,
        team: 1,
        hasFlag: false,
        carryingFlag: false,
        atBase: true
      }
    } as unknown as GameEntity)

    if (!flag.physics || !drone.physics || !flag.gameState || !drone.gameState) {
      throw new Error('Required components missing')
    }

    const event = {
      bodyA: flag.physics.body,
      bodyB: drone.physics.body
    }

    handleFlagCollision(flag, drone, event)
    expect(flag.gameState.carriedBy).toBe('drone1')
    expect(drone.gameState.hasFlag).toBe(true)
  })

  it('should not allow non-drones to pick up flags', () => {
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
        hasFlag: true,
        carryingFlag: false,
        atBase: true
      }
    } as unknown as GameEntity)

    const plane = ecsWorld.add({
      id: 'plane1',
      type: 'vehicle',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      physics: {
        body: new CANNON.Body(),
        mass: 1,
        drag: 0.8,
        angularDrag: 0.8,
        maxSpeed: 20,
        maxAngularSpeed: 0.2,
        maxAngularAcceleration: 0.05,
        angularDamping: 0.9,
        forceMultiplier: 0.005,
        thrust: 20,
        lift: 15,
        torque: 1
      },
      gameState: {
        health: 100,
        maxHealth: 100,
        team: 1,
        hasFlag: false,
        carryingFlag: false,
        atBase: true
      }
    } as unknown as GameEntity)

    if (!flag.physics || !plane.physics || !flag.gameState || !plane.gameState) {
      throw new Error('Required components missing')
    }

    const event = {
      bodyA: flag.physics.body,
      bodyB: plane.physics.body
    }

    handleFlagCollision(flag, plane, event)
    expect(flag.gameState.carriedBy).toBeUndefined()
    expect(plane.gameState.hasFlag).toBeUndefined()
  })
}) 