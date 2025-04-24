import { describe, test, expect, beforeEach } from 'vitest'
import * as CANNON from 'cannon-es'
import { Vector3, Quaternion } from 'babylonjs'
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

  test('should create ground entity with correct properties', () => {
    const ground = ecsWorld.with('environment').first as GameEntity

    expect(ground).toBeDefined()
    expect(ground.id).toBe('ground')
    expect(ground.type).toBe('environment')
    expect(ground.environment).toBe(true)
    expect(ground.collisionGroup).toBe(CollisionGroups.Environment)
    expect(ground.collisionMask).toBe(CollisionGroups.Drones | CollisionGroups.Planes)
  })

  test('should create ground physics body with correct properties', () => {
    const ground = ecsWorld.with('environment').first as GameEntity
    const body = ground.body as CANNON.Body

    expect(body).toBeDefined()
    expect(body.mass).toBe(0)
    expect(body.collisionFilterGroup).toBe(CollisionGroups.Environment)
    expect(body.collisionFilterMask).toBe(CollisionGroups.Drones | CollisionGroups.Planes)
    expect(body.position).toEqual(new CANNON.Vec3(0, 0, 0))
  })

  test('should update ground entity position from physics body', () => {
    const ground = ecsWorld.with('environment').first as GameEntity
    const body = ground.body as CANNON.Body

    // Move the physics body
    body.position.set(1, 2, 3)
    environmentSystem.update(1/60)

    expect(ground.position).toEqual(new Vector3(1, 2, 3))
  })

  test('should update ground entity rotation from physics body', () => {
    const ground = ecsWorld.with('environment').first as GameEntity
    const body = ground.body as CANNON.Body

    // Rotate the physics body
    body.quaternion.setFromEuler(Math.PI / 2, 0, 0)
    environmentSystem.update(1/60)

    expect(ground.rotation).toEqual(new Quaternion(0.7071, 0, 0, 0.7071))
  })

  test('should create ground with correct collision shape', () => {
    const ground = ecsWorld.with('environment').first as GameEntity
    const body = ground.body as CANNON.Body

    expect(body.shapes[0]).toBeInstanceOf(CANNON.Plane)
  })

  test('should create ground with correct material', () => {
    const ground = ecsWorld.with('environment').first as GameEntity
    const body = ground.body as CANNON.Body

    expect(body.material).toBeDefined()
    expect((body.material as CANNON.Material).name).toBe('groundMaterial')
  })

  test('should handle multiple environment entities', () => {
    // Create another environment entity
    const wallBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(10, 0, 0)
    })
    cannonWorld.addBody(wallBody)

    const wallEntity: GameEntity = {
      id: 'wall',
      type: 'environment',
      environment: true,
      body: wallBody,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1)
    }
    ecsWorld.add(wallEntity)

    // Move both bodies
    const ground = ecsWorld.with('environment').first as GameEntity
    const groundBody = ground.body as CANNON.Body
    groundBody.position.set(1, 2, 3)
    wallBody.position.set(11, 12, 13)

    environmentSystem.update(1/60)

    expect(ground.position).toEqual(new Vector3(1, 2, 3))
    expect(wallEntity.position).toEqual(new Vector3(11, 12, 13))
  })
}) 