import { describe, it, expect, beforeEach } from 'vitest'
import * as CANNON from 'cannon-es'
import { Vector3, Quaternion } from '@babylonjs/core'
import { world as ecsWorld } from '../../world'
import { createDroneSystem, createPlaneSystem } from '../DroneSystem'
import { GameEntity } from '../../types'
import { CollisionGroups } from '../../CollisionGroups'

describe('VehicleSystems', () => {
  let cannonWorld: CANNON.World
  let droneSystem: ReturnType<typeof createDroneSystem>
  let planeSystem: ReturnType<typeof createPlaneSystem>

  beforeEach(() => {
    cannonWorld = new CANNON.World()
    droneSystem = createDroneSystem(cannonWorld)
    planeSystem = createPlaneSystem(cannonWorld)
    ecsWorld.clear()
  })

  describe('Drone System', () => {
    it('should initialize drone with correct components', () => {
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
          body: new CANNON.Body({
            mass: 10,
            position: new CANNON.Vec3(0, 0, 0),
            quaternion: new CANNON.Quaternion(0, 0, 0, 1)
          }),
          mass: 10,
          drag: 0.8,
          angularDrag: 0.8,
          maxSpeed: 20,
          maxAngularSpeed: 0.2,
          maxAngularAcceleration: 0.05,
          angularDamping: 0.9,
          forceMultiplier: 0.005,
          thrust: 20,
          lift: 15,
          torque: 1,
          minSpeed: 0,
          bankAngle: 0,
          wingArea: 0,
          strafeForce: 0,
          minHeight: 0
        },
        vehicle: {
          vehicleType: 'drone',
          weapons: [],
          activeWeaponIndex: 0
        },
        input: {
          forward: false,
          backward: false,
          left: false,
          right: false,
          up: false,
          down: false,
          pitchUp: false,
          pitchDown: false,
          yawLeft: false,
          yawRight: false,
          rollLeft: false,
          rollRight: false,
          fire: false,
          zoom: false,
          nextWeapon: false,
          previousWeapon: false,
          weapon1: false,
          weapon2: false,
          weapon3: false,
          mouseDelta: { x: 0, y: 0 },
          tick: 0,
          timestamp: 0
        }
      } as GameEntity)

      expect(drone.vehicle?.vehicleType).toBe('drone')
      expect(drone.physics?.body).toBeDefined()
      expect(drone.transform).toBeDefined()
    })

    it('should apply thrust when moving forward', () => {
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
          body: new CANNON.Body({
            mass: 10,
            position: new CANNON.Vec3(0, 0, 0),
            quaternion: new CANNON.Quaternion(0, 0, 0, 1)
          }),
          mass: 10,
          drag: 0.8,
          angularDrag: 0.8,
          maxSpeed: 20,
          maxAngularSpeed: 0.2,
          maxAngularAcceleration: 0.05,
          angularDamping: 0.9,
          forceMultiplier: 0.005,
          thrust: 20,
          lift: 15,
          torque: 1,
          minSpeed: 0,
          bankAngle: 0,
          wingArea: 0,
          strafeForce: 0,
          minHeight: 0
        },
        vehicle: {
          vehicleType: 'drone',
          weapons: [],
          activeWeaponIndex: 0
        },
        input: {
          forward: true,
          backward: false,
          left: false,
          right: false,
          up: false,
          down: false,
          pitchUp: false,
          pitchDown: false,
          yawLeft: false,
          yawRight: false,
          rollLeft: false,
          rollRight: false,
          fire: false,
          zoom: false,
          nextWeapon: false,
          previousWeapon: false,
          weapon1: false,
          weapon2: false,
          weapon3: false,
          mouseDelta: { x: 0, y: 0 },
          tick: 0,
          timestamp: 0
        }
      } as GameEntity)

      const initialVelocity = new Vector3(
        drone.physics!.body.velocity.x,
        drone.physics!.body.velocity.y,
        drone.physics!.body.velocity.z
      )

      droneSystem.update(1/60)

      const newVelocity = new Vector3(
        drone.physics!.body.velocity.x,
        drone.physics!.body.velocity.y,
        drone.physics!.body.velocity.z
      )

      expect(newVelocity.length()).toBeGreaterThan(initialVelocity.length())
    })

    it('should apply stabilization forces', () => {
      const drone = ecsWorld.add({
        id: 'drone1',
        type: 'vehicle',
        transform: {
          position: new Vector3(0, 0, 0),
          rotation: new Quaternion(0.1, 0.1, 0.1, 0.9), // Tilted rotation
          velocity: new Vector3(0, 0, 0),
          angularVelocity: new Vector3(0, 0, 0)
        },
        physics: {
          body: new CANNON.Body({
            mass: 10,
            position: new CANNON.Vec3(0, 0, 0),
            quaternion: new CANNON.Quaternion(0.1, 0.1, 0.1, 0.9)
          }),
          mass: 10,
          drag: 0.8,
          angularDrag: 0.8,
          maxSpeed: 20,
          maxAngularSpeed: 0.2,
          maxAngularAcceleration: 0.05,
          angularDamping: 0.9,
          forceMultiplier: 0.005,
          thrust: 20,
          lift: 15,
          torque: 1,
          minSpeed: 0,
          bankAngle: 0,
          wingArea: 0,
          strafeForce: 0,
          minHeight: 0
        },
        vehicle: {
          vehicleType: 'drone',
          weapons: [],
          activeWeaponIndex: 0
        },
        input: {
          forward: false,
          backward: false,
          left: false,
          right: false,
          up: false,
          down: false,
          pitchUp: false,
          pitchDown: false,
          yawLeft: false,
          yawRight: false,
          rollLeft: false,
          rollRight: false,
          fire: false,
          zoom: false,
          nextWeapon: false,
          previousWeapon: false,
          weapon1: false,
          weapon2: false,
          weapon3: false,
          mouseDelta: { x: 0, y: 0 },
          tick: 0,
          timestamp: 0
        }
      } as GameEntity)

      const initialQuaternion = drone.physics!.body.quaternion.clone()
      droneSystem.update(1/60)
      const newQuaternion = drone.physics!.body.quaternion

      // The quaternion should change as stabilization is applied
      expect(newQuaternion.x).not.toBe(initialQuaternion.x)
      expect(newQuaternion.y).not.toBe(initialQuaternion.y)
      expect(newQuaternion.z).not.toBe(initialQuaternion.z)
      expect(newQuaternion.w).not.toBe(initialQuaternion.w)
    })
  })

  describe('Plane System', () => {
    it('should initialize plane with correct components', () => {
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
          body: new CANNON.Body({
            mass: 50,
            position: new CANNON.Vec3(0, 0, 0),
            quaternion: new CANNON.Quaternion(0, 0, 0, 1)
          }),
          mass: 50,
          drag: 0.8,
          angularDrag: 0.8,
          maxSpeed: 20,
          maxAngularSpeed: 0.2,
          maxAngularAcceleration: 0.05,
          angularDamping: 0.9,
          forceMultiplier: 0.005,
          thrust: 30,
          lift: 12,
          torque: 2,
          minSpeed: 0,
          bankAngle: 0,
          wingArea: 0,
          strafeForce: 0,
          minHeight: 0
        },
        vehicle: {
          vehicleType: 'plane',
          weapons: [],
          activeWeaponIndex: 0
        },
        input: {
          forward: false,
          backward: false,
          left: false,
          right: false,
          up: false,
          down: false,
          pitchUp: false,
          pitchDown: false,
          yawLeft: false,
          yawRight: false,
          rollLeft: false,
          rollRight: false,
          fire: false,
          zoom: false,
          nextWeapon: false,
          previousWeapon: false,
          weapon1: false,
          weapon2: false,
          weapon3: false,
          mouseDelta: { x: 0, y: 0 },
          tick: 0,
          timestamp: 0
        }
      } as GameEntity)

      expect(plane.vehicle?.vehicleType).toBe('plane')
      expect(plane.physics?.body).toBeDefined()
      expect(plane.transform).toBeDefined()
    })

    it('should increase engine power when accelerating', () => {
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
          body: new CANNON.Body({
            mass: 50,
            position: new CANNON.Vec3(0, 0, 0),
            quaternion: new CANNON.Quaternion(0, 0, 0, 1)
          }),
          mass: 50,
          drag: 0.8,
          angularDrag: 0.8,
          maxSpeed: 20,
          maxAngularSpeed: 0.2,
          maxAngularAcceleration: 0.05,
          angularDamping: 0.9,
          forceMultiplier: 0.005,
          thrust: 30,
          lift: 12,
          torque: 2,
          minSpeed: 0,
          bankAngle: 0,
          wingArea: 0,
          strafeForce: 0,
          minHeight: 0
        },
        vehicle: {
          vehicleType: 'plane',
          weapons: [],
          activeWeaponIndex: 0
        },
        input: {
          forward: false,
          backward: false,
          left: false,
          right: false,
          up: true,
          down: false,
          pitchUp: false,
          pitchDown: false,
          yawLeft: false,
          yawRight: false,
          rollLeft: false,
          rollRight: false,
          fire: false,
          zoom: false,
          nextWeapon: false,
          previousWeapon: false,
          weapon1: false,
          weapon2: false,
          weapon3: false,
          mouseDelta: { x: 0, y: 0 },
          tick: 0,
          timestamp: 0
        }
      } as GameEntity)

      const initialVelocity = new Vector3(
        plane.physics!.body.velocity.x,
        plane.physics!.body.velocity.y,
        plane.physics!.body.velocity.z
      )

      planeSystem.update(1/60)

      const newVelocity = new Vector3(
        plane.physics!.body.velocity.x,
        plane.physics!.body.velocity.y,
        plane.physics!.body.velocity.z
      )

      expect(newVelocity.length()).toBeGreaterThan(initialVelocity.length())
    })

    it('should apply lift based on speed', () => {
      const plane = ecsWorld.add({
        id: 'plane1',
        type: 'vehicle',
        transform: {
          position: new Vector3(0, 0, 0),
          rotation: new Quaternion(0, 0, 0, 1),
          velocity: new Vector3(10, 0, 0), // Initial forward velocity
          angularVelocity: new Vector3(0, 0, 0)
        },
        physics: {
          body: new CANNON.Body({
            mass: 50,
            position: new CANNON.Vec3(0, 0, 0),
            quaternion: new CANNON.Quaternion(0, 0, 0, 1),
            velocity: new CANNON.Vec3(10, 0, 0)
          }),
          mass: 50,
          drag: 0.8,
          angularDrag: 0.8,
          maxSpeed: 20,
          maxAngularSpeed: 0.2,
          maxAngularAcceleration: 0.05,
          angularDamping: 0.9,
          forceMultiplier: 0.005,
          thrust: 30,
          lift: 12,
          torque: 2,
          minSpeed: 0,
          bankAngle: 0,
          wingArea: 0,
          strafeForce: 0,
          minHeight: 0
        },
        vehicle: {
          vehicleType: 'plane',
          weapons: [],
          activeWeaponIndex: 0
        },
        input: {
          forward: false,
          backward: false,
          left: false,
          right: false,
          up: true,
          down: false,
          pitchUp: false,
          pitchDown: false,
          yawLeft: false,
          yawRight: false,
          rollLeft: false,
          rollRight: false,
          fire: false,
          zoom: false,
          nextWeapon: false,
          previousWeapon: false,
          weapon1: false,
          weapon2: false,
          weapon3: false,
          mouseDelta: { x: 0, y: 0 },
          tick: 0,
          timestamp: 0
        }
      } as GameEntity)

      const initialYVelocity = plane.physics!.body.velocity.y
      planeSystem.update(1/60)
      const newYVelocity = plane.physics!.body.velocity.y

      // Lift should cause upward acceleration
      expect(newYVelocity).toBeGreaterThan(initialYVelocity)
    })
  })
}) 