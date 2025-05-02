import { describe, it, expect, beforeEach } from 'vitest'
import * as CANNON from 'cannon-es'
import { Vector3, Quaternion } from '@babylonjs/core'
import { world as ecsWorld } from '../../world'
import { createEnvironmentSystem } from '../EnvironmentSystems'
import { GameEntity } from '../../types'
import { CollisionGroups } from '../../CollisionGroups'

describe('EnvironmentSystem', () => {
  let cannonWorld: CANNON.World
  let environmentSystem: ReturnType<typeof createEnvironmentSystem>

  beforeEach(() => {
    cannonWorld = new CANNON.World()
    environmentSystem = createEnvironmentSystem(cannonWorld)
    ecsWorld.clear()
  })

  it('should create ground entity with correct properties', () => {
    const ground = ecsWorld.entities.find(e => e.type === 'environment') as GameEntity

    expect(ground).toBeDefined()
    expect(ground.id).toBe('ground')
    expect(ground.type).toBe('environment')
    expect(ground.physics?.body.collisionFilterGroup).toBe(CollisionGroups.Environment)
    expect(ground.physics?.body.collisionFilterMask).toBe(CollisionGroups.Drones | CollisionGroups.Planes)
  })

  it('should create ground physics body with correct properties', () => {
    const ground = ecsWorld.entities.find(e => e.type === 'environment') as GameEntity
    if (!ground.physics) {
      throw new Error('Ground physics component missing')
    }
    const body = ground.physics.body

    expect(body).toBeDefined()
    expect(body.mass).toBe(0)
    expect(body.collisionFilterGroup).toBe(CollisionGroups.Environment)
    expect(body.collisionFilterMask).toBe(CollisionGroups.Drones | CollisionGroups.Planes)
    expect(body.position).toEqual(new CANNON.Vec3(0, 0, 0))
  })

  it('should update ground entity position from physics body', () => {
    const ground = ecsWorld.entities.find(e => e.type === 'environment') as GameEntity
    if (!ground.physics || !ground.transform) {
      throw new Error('Required components missing')
    }
    const body = ground.physics.body

    // Move the physics body
    body.position.set(1, 2, 3)
    environmentSystem.update(1/60)

    expect(ground.transform.position).toEqual(new Vector3(1, 2, 3))
  })

  it('should update ground entity rotation from physics body', () => {
    const ground = ecsWorld.entities.find(e => e.type === 'environment') as GameEntity
    if (!ground.physics || !ground.transform) {
      throw new Error('Required components missing')
    }
    const body = ground.physics.body

    // Rotate the physics body
    body.quaternion.setFromEuler(Math.PI / 2, 0, 0)
    environmentSystem.update(1/60)

    expect(ground.transform.rotation).toEqual(new Quaternion(0.7071, 0, 0, 0.7071))
  })

  it('should create ground with correct collision shape', () => {
    const ground = ecsWorld.entities.find(e => e.type === 'environment') as GameEntity
    if (!ground.physics) {
      throw new Error('Ground physics component missing')
    }
    const body = ground.physics.body

    expect(body.shapes[0]).toBeInstanceOf(CANNON.Plane)
  })

  it('should create ground with correct material', () => {
    const ground = ecsWorld.entities.find(e => e.type === 'environment') as GameEntity
    if (!ground.physics) {
      throw new Error('Ground physics component missing')
    }
    const body = ground.physics.body

    expect(body.material).toBeDefined()
    expect((body.material as CANNON.Material).name).toBe('groundMaterial')
  })

  it('should handle multiple environment entities', () => {
    // Create another environment entity
    const wallBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(10, 0, 0)
    })
    cannonWorld.addBody(wallBody)

    const wallEntity: GameEntity = {
      id: 'wall',
      type: 'environment',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      physics: {
      body: wallBody,
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
        torque: 0,
        minSpeed: 0,
        bankAngle: 0,
        wingArea: 0,
        strafeForce: 0,
        minHeight: 0
      }
    }
    ecsWorld.add(wallEntity)

    // Move both bodies
    const ground = ecsWorld.entities.find(e => e.type === 'environment') as GameEntity
    if (!ground.physics || !ground.transform || !wallEntity.physics || !wallEntity.transform) {
      throw new Error('Required components missing')
    }
    const groundBody = ground.physics.body
    groundBody.position.set(1, 2, 3)
    wallBody.position.set(11, 12, 13)

    environmentSystem.update(1/60)

    expect(ground.transform.position).toEqual(new Vector3(1, 2, 3))
    expect(wallEntity.transform.position).toEqual(new Vector3(11, 12, 13))
  })
}) 