import { describe, test, expect, beforeEach } from 'vitest'
import * as CANNON from 'cannon-es'
import { Vector3, Quaternion } from 'babylonjs'
import { world as ecsWorld } from '../../world'
import { createVehiclePhysicsSystem } from '../VehiclePhysicsSystem'
import { GameEntity } from '../../types'

describe('VehiclePhysicsSystem', () => {
  let cannonWorld: CANNON.World
  let vehiclePhysicsSystem: ReturnType<typeof createVehiclePhysicsSystem>

  beforeEach(() => {
    cannonWorld = new CANNON.World()
    vehiclePhysicsSystem = createVehiclePhysicsSystem(cannonWorld)
    ecsWorld.clear()
  })

  test('should update entity position from physics body', () => {
    const body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(1, 2, 3)
    })
    cannonWorld.addBody(body)

    const entity = ecsWorld.add({
      drone: true,
      body,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      input: {}
    } as GameEntity)

    vehiclePhysicsSystem.update(1/60)

    expect(entity.position).toEqual(new Vector3(1, 2, 3))
  })

  test('should update entity rotation from physics body', () => {
    const body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 0, 0)
    })
    body.quaternion.setFromEuler(0, Math.PI / 2, 0)
    cannonWorld.addBody(body)

    const entity = ecsWorld.add({
      drone: true,
      body,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      input: {}
    } as GameEntity)

    vehiclePhysicsSystem.update(1/60)

    expect(entity.rotation).toEqual(new Quaternion(0, 0.7071, 0, 0.7071))
  })

  test('should update entity velocities from physics body', () => {
    const body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 0, 0)
    })
    body.velocity.set(1, 2, 3)
    body.angularVelocity.set(0.1, 0.2, 0.3)
    cannonWorld.addBody(body)

    const entity = ecsWorld.add({
      drone: true,
      body,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      velocity: new Vector3(0, 0, 0),
      angularVelocity: new Vector3(0, 0, 0),
      input: {}
    } as GameEntity)

    vehiclePhysicsSystem.update(1/60)

    expect(entity.velocity).toEqual(new Vector3(1, 2, 3))
    expect(entity.angularVelocity).toEqual(new Vector3(0.1, 0.2, 0.3))
  })

  test('should apply mouse control torque', () => {
    const body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 0, 0)
    })
    cannonWorld.addBody(body)

    const entity = ecsWorld.add({
      drone: true,
      body,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      torque: 2,
      input: {
        mouseDelta: { x: 1, y: 1 }
      }
    } as GameEntity)

    vehiclePhysicsSystem.update(1/60)

    // Check that torque was applied (angular velocity should be non-zero)
    expect(body.angularVelocity.x).not.toBe(0)
    expect(body.angularVelocity.y).not.toBe(0)
  })

  test('should apply angular damping', () => {
    const body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 0, 0)
    })
    body.angularVelocity.set(1, 1, 1)
    cannonWorld.addBody(body)

    const entity = ecsWorld.add({
      drone: true,
      body,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      input: {}
    } as GameEntity)

    vehiclePhysicsSystem.update(1/60)

    // Angular velocity should be reduced by damping factor (0.95)
    expect(body.angularVelocity.x).toBe(0.95)
    expect(body.angularVelocity.y).toBe(0.95)
    expect(body.angularVelocity.z).toBe(0.95)
  })

  test('should handle both drone and plane entities', () => {
    const droneBody = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(1, 0, 0)
    })
    const planeBody = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(2, 0, 0)
    })
    cannonWorld.addBody(droneBody)
    cannonWorld.addBody(planeBody)

    const drone = ecsWorld.add({
      drone: true,
      body: droneBody,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      input: {}
    } as GameEntity)

    const plane = ecsWorld.add({
      plane: true,
      body: planeBody,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      input: {}
    } as GameEntity)

    vehiclePhysicsSystem.update(1/60)

    expect(drone.position).toEqual(new Vector3(1, 0, 0))
    expect(plane.position).toEqual(new Vector3(2, 0, 0))
  })
}) 