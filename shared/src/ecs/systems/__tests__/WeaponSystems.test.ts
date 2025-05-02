import { describe, it, expect, beforeEach } from 'vitest'
import * as CANNON from 'cannon-es'
import { Vector3, Quaternion } from '@babylonjs/core'
import { world as ecsWorld } from '../../world'
import { createWeaponSystem, createProjectileSystem } from '../WeaponSystems'
import { GameEntity } from '../../types'
import { CollisionGroups } from '../../CollisionGroups'

describe('WeaponSystem', () => {
  let cannonWorld: CANNON.World
  let weaponSystem: ReturnType<typeof createWeaponSystem>
  let projectileSystem: ReturnType<typeof createProjectileSystem>

  beforeEach(() => {
    cannonWorld = new CANNON.World()
    weaponSystem = createWeaponSystem(cannonWorld)
    projectileSystem = createProjectileSystem()
    ecsWorld.clear()
  })

  it('should switch weapons when input changes', () => {
    const entity = ecsWorld.add({
      id: 'shooter1',
      type: 'vehicle',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [
          { id: 'weapon1', name: 'Weapon 1', projectileType: 'bullet', damage: 10, fireRate: 1, projectileSpeed: 10, cooldown: 1, range: 100, isOnCooldown: false, lastFireTime: 0 },
          { id: 'weapon2', name: 'Weapon 2', projectileType: 'bullet', damage: 20, fireRate: 1, projectileSpeed: 10, cooldown: 1, range: 100, isOnCooldown: false, lastFireTime: 0 }
        ],
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
        nextWeapon: true,
        previousWeapon: false,
        weapon1: false,
        weapon2: false,
        weapon3: false,
        mouseDelta: { x: 0, y: 0 },
        tick: 0,
        timestamp: 0
      }
    } as GameEntity)

    weaponSystem.update(1/60)

    expect(entity.vehicle?.activeWeaponIndex).toBe(1)
  })

  it('should create projectile when firing', () => {
    const entity = ecsWorld.add({
      id: 'shooter1',
      type: 'vehicle',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [{
          id: 'weapon1',
          name: 'Weapon 1',
          projectileType: 'bullet',
          damage: 10,
          fireRate: 1,
          projectileSpeed: 10,
          cooldown: 1,
          range: 100,
          isOnCooldown: false,
          lastFireTime: 0
        }],
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
        fire: true,
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

    weaponSystem.update(1/60)

    const projectiles = ecsWorld.entities.filter(e => e.type === 'projectile') as GameEntity[]
    expect(projectiles.length).toBe(1)
  })

  it('should respect weapon cooldown', () => {
    const entity = ecsWorld.add({
      id: 'shooter1',
      type: 'vehicle',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [{
          id: 'weapon1',
          name: 'Weapon 1',
          projectileType: 'bullet',
          damage: 10,
          fireRate: 1,
          projectileSpeed: 10,
          cooldown: 1,
          range: 100,
          isOnCooldown: true,
          lastFireTime: Date.now()
        }],
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
        fire: true,
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

    weaponSystem.update(1/60)

    const projectiles = ecsWorld.entities.filter(e => e.type === 'projectile') as GameEntity[]
    expect(projectiles.length).toBe(0)
  })

  it('should remove projectiles that exceed their range', () => {
    const projectile = ecsWorld.add({
      id: 'proj1',
      type: 'projectile',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(10, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      projectile: {
        projectileType: 'bullet',
        damage: 10,
        range: 100,
        distanceTraveled: 0,
        sourceId: 'shooter1',
        timestamp: 0,
        tick: 0
      }
    } as GameEntity)

    // Simulate projectile traveling beyond its range
    if (!projectile.projectile) {
      throw new Error('Projectile component missing')
    }
    projectile.projectile.distanceTraveled = 101
    projectileSystem.update(1/60)

    expect(ecsWorld.entities).not.toContain(projectile)
  })

  it('should update projectile distance traveled', () => {
    const projectile = ecsWorld.add({
      id: 'proj1',
      type: 'projectile',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(10, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      projectile: {
        projectileType: 'bullet',
        damage: 10,
        range: 100,
        distanceTraveled: 0,
        sourceId: 'shooter1',
        timestamp: 0,
        tick: 0
      }
    } as GameEntity)

    projectileSystem.update(1/60)

    if (!projectile.projectile) {
      throw new Error('Projectile component missing')
    }
    expect(projectile.projectile.distanceTraveled).toBeGreaterThan(0)
  })

  it('should create different projectile shapes based on type', () => {
    const entity = ecsWorld.add({
      id: 'shooter1',
      type: 'vehicle',
      transform: {
        position: new Vector3(0, 0, 0),
        rotation: new Quaternion(0, 0, 0, 1),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0)
      },
      vehicle: {
        vehicleType: 'drone',
        weapons: [
          {
            id: 'bullet',
            name: 'Bullet',
            projectileType: 'bullet',
            damage: 10,
            fireRate: 1,
            projectileSpeed: 10,
            cooldown: 1,
            range: 100,
            isOnCooldown: false,
            lastFireTime: 0
          },
          {
            id: 'missile',
            name: 'Missile',
            projectileType: 'missile',
            damage: 20,
            fireRate: 1,
            projectileSpeed: 10,
            cooldown: 1,
            range: 100,
            isOnCooldown: false,
            lastFireTime: 0
          }
        ],
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
        fire: true,
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

    // Fire bullet
    weaponSystem.update(1/60)
    const projectiles = ecsWorld.entities.filter(e => e.type === 'projectile') as GameEntity[]
    const bullet = projectiles[0]
    if (!bullet.physics) {
      throw new Error('Physics component missing')
    }
    expect(bullet.physics.body.shapes[0]).toBeInstanceOf(CANNON.Sphere)

    // Switch to missile and fire
    if (!entity.vehicle) {
      throw new Error('Vehicle component missing')
    }
    entity.vehicle.activeWeaponIndex = 1
    if (!entity.input) {
      throw new Error('Input component missing')
    }
    entity.input.fire = true
    weaponSystem.update(1/60)
    const newProjectiles = ecsWorld.entities.filter(e => e.type === 'projectile') as GameEntity[]
    const missile = newProjectiles[1]
    if (!missile.physics) {
      throw new Error('Physics component missing')
    }
    expect(missile.physics.body.shapes[0]).toBeInstanceOf(CANNON.Box)
  })
}) 