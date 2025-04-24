import { describe, test, expect, beforeEach, vi } from 'vitest'
import * as CANNON from 'cannon-es'
import { Vector3, Quaternion } from 'babylonjs'
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

  test('should switch weapons when input changes', () => {
    const entity = ecsWorld.add({
      weapons: [
        { id: 'weapon1', name: 'Weapon 1', projectileType: 'bullet', damage: 10, fireRate: 1, projectileSpeed: 10, cooldown: 1, range: 100, isOnCooldown: false, lastFireTime: 0 },
        { id: 'weapon2', name: 'Weapon 2', projectileType: 'bullet', damage: 20, fireRate: 1, projectileSpeed: 10, cooldown: 1, range: 100, isOnCooldown: false, lastFireTime: 0 }
      ],
      activeWeaponIndex: 0,
      input: {
        nextWeapon: true,
        fire: false
      }
    } as GameEntity)

    weaponSystem.update(1/60)

    expect(entity.activeWeaponIndex).toBe(1)
  })

  test('should create projectile when firing', () => {
    const entity = ecsWorld.add({
      id: 'shooter1',
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
      activeWeaponIndex: 0,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      input: {
        fire: true
      }
    } as GameEntity)

    weaponSystem.update(1/60)

    const projectiles = Array.from(ecsWorld.with('projectile'))
    expect(projectiles.length).toBe(1)
  })

  test('should respect weapon cooldown', () => {
    const entity = ecsWorld.add({
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
      activeWeaponIndex: 0,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      input: {
        fire: true
      }
    } as GameEntity)

    weaponSystem.update(1/60)

    const projectiles = Array.from(ecsWorld.with('projectile'))
    expect(projectiles.length).toBe(0)
  })

  test('should remove projectiles that exceed their range', () => {
    const projectile = ecsWorld.add({
      projectile: true,
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(10, 0, 0),
      range: 100,
      distanceTraveled: 0
    } as GameEntity)

    // Simulate projectile traveling beyond its range
    projectile.distanceTraveled = 101
    projectileSystem.update(1/60)

    expect(ecsWorld.entities).not.toContain(projectile)
  })

  test('should update projectile distance traveled', () => {
    const projectile = ecsWorld.add({
      projectile: true,
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(10, 0, 0),
      range: 100,
      distanceTraveled: 0
    } as GameEntity)

    projectileSystem.update(1/60)

    expect(projectile.distanceTraveled).toBeGreaterThan(0)
  })

  test('should create different projectile shapes based on type', () => {
    const entity = ecsWorld.add({
      id: 'shooter1',
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
      activeWeaponIndex: 0,
      position: new Vector3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      input: {
        fire: true
      }
    } as GameEntity)

    // Fire bullet
    weaponSystem.update(1/60)
    const projectiles = Array.from(ecsWorld.with('projectile'))
    const bullet = projectiles[0]
    expect(bullet.body?.shapes[0]).toBeInstanceOf(CANNON.Sphere)

    // Switch to missile and fire
    entity.activeWeaponIndex = 1
    entity.input!.fire = true
    weaponSystem.update(1/60)
    const newProjectiles = Array.from(ecsWorld.with('projectile'))
    const missile = newProjectiles[1]
    expect(missile.body?.shapes[0]).toBeInstanceOf(CANNON.Box)
  })
}) 