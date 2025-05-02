import { describe, test, expect, beforeEach } from 'vitest'
import * as CANNON from 'cannon-es'
import { createPhysicsWorldSystem } from '../PhysicsWorldSystem'

describe('PhysicsWorldSystem', () => {
  let physicsSystem: ReturnType<typeof createPhysicsWorldSystem>
  let world: CANNON.World

  beforeEach(() => {
    physicsSystem = createPhysicsWorldSystem()
    world = physicsSystem.getWorld()
  })

  test('should create a physics world with correct initial settings', () => {
    expect(world.gravity.y).toBe(-9.82)
    expect(world.broadphase).toBeInstanceOf(CANNON.SAPBroadphase)
    expect((world.solver as any).iterations).toBe(10)
    expect(world.defaultContactMaterial.friction).toBe(0.3)
    expect(world.defaultContactMaterial.restitution).toBe(0.3)
  })

  test('should increment tick counter on update', () => {
    const initialTick = physicsSystem.getCurrentTick()
    physicsSystem.update(1/60)
    expect(physicsSystem.getCurrentTick()).toBe(initialTick + 1)
  })

  test('should step the physics world on update', () => {
    // Create a test body
    const body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 10, 0)
    })
    world.addBody(body)

    // Step the world
    physicsSystem.update(1/60)

    // Body should have moved due to gravity
    expect(body.position.y).toBeLessThan(10)
  })

  test('should dispose of all bodies on dispose', () => {
    // Add some test bodies
    const body1 = new CANNON.Body({ mass: 1 })
    const body2 = new CANNON.Body({ mass: 1 })
    world.addBody(body1)
    world.addBody(body2)

    expect(world.bodies.length).toBe(2)

    physicsSystem.dispose()

    expect(world.bodies.length).toBe(0)
  })

  test('should handle multiple physics steps correctly', () => {
    const body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 10, 0)
    })
    world.addBody(body)

    // Step multiple times
    for (let i = 0; i < 10; i++) {
      physicsSystem.update(1/60)
    }

    // Body should have moved more after multiple steps
    expect(body.position.y).toBeLessThan(10)
    expect(physicsSystem.getCurrentTick()).toBe(10)
  })
}) 