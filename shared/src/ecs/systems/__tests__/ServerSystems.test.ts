import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3, Quaternion } from 'babylonjs';
import * as CANNON from 'cannon-es';
import { createVehicleEntity, createProjectileEntity, createFlagEntity } from '../ServerSystems';
import { GameEntity } from '../../types';

describe('ServerSystems', () => {
  let physicsWorld: any;

  beforeEach(() => {
    // Mock physics world
    physicsWorld = {
      getWorld: () => ({
        addBody: () => {}
      })
    };
  });

  describe('createVehicleEntity', () => {
    it('should create a drone entity with correct components', () => {
      const id = 'test1';
      const vehicleType = 'drone';
      const position = new Vector3(1, 2, 3);
      const team = 1;

      const entity = createVehicleEntity(id, vehicleType, position, team, physicsWorld);

      // Check basic properties
      expect(entity.id).toBe(id);
      expect(entity.type).toBe(vehicleType);
      expect(entity.vehicleType).toBe(vehicleType);
      expect(entity.team).toBe(team);
      expect(entity.drone).toBe(true);

      // Check transform
      expect(entity.position).toEqual(position);
      expect(entity.rotation).toEqual(new Quaternion(0, 0, 0, 1));
      expect(entity.velocity).toEqual(new Vector3(0, 0, 0));
      expect(entity.angularVelocity).toEqual(new Vector3(0, 0, 0));

      // Check health
      expect(entity.health).toBe(100);
      expect(entity.maxHealth).toBe(150);

      // Check other properties
      expect(entity.weapons).toEqual([]);
      expect(entity.activeWeaponIndex).toBe(0);
      expect(entity.hasFlag).toBe(false);
      expect(entity.carriedBy).toBe("");
      expect(entity.atBase).toBe(true);
    });

    it('should create a plane entity with correct components', () => {
      const id = 'test2';
      const vehicleType = 'plane';
      const position = new Vector3(4, 5, 6);
      const team = 2;

      const entity = createVehicleEntity(id, vehicleType, position, team, physicsWorld);

      // Check basic properties
      expect(entity.id).toBe(id);
      expect(entity.type).toBe(vehicleType);
      expect(entity.vehicleType).toBe(vehicleType);
      expect(entity.team).toBe(team);
      expect(entity.plane).toBe(true);

      // Check transform
      expect(entity.position).toEqual(position);
      expect(entity.rotation).toEqual(new Quaternion(0, 0, 0, 1));
      expect(entity.velocity).toEqual(new Vector3(0, 0, 0));
      expect(entity.angularVelocity).toEqual(new Vector3(0, 0, 0));

      // Check health
      expect(entity.health).toBe(100);
      expect(entity.maxHealth).toBe(100);

      // Check other properties
      expect(entity.weapons).toEqual([]);
      expect(entity.activeWeaponIndex).toBe(0);
      expect(entity.hasFlag).toBe(false);
      expect(entity.carriedBy).toBe("");
      expect(entity.atBase).toBe(true);
    });
  });

  describe('createProjectileEntity', () => {
    it('should create a bullet entity with correct components', () => {
      const id = 'test1';
      const sourceId = 'player1';
      const position = new Vector3(1, 2, 3);
      const direction = new Vector3(0, 0, 1);
      const speed = 10;
      const damage = 20;
      const range = 100;
      const type = 'bullet';

      const entity = createProjectileEntity(id, sourceId, position, direction, speed, damage, range, type);

      // Check basic properties
      expect(entity.id).toBe(id);
      expect(entity.type).toBe('projectile');
      expect(entity.projectile).toBe(true);
      expect(entity.projectileType).toBe(type);
      expect(entity.sourceId).toBe(sourceId);

      // Check transform
      expect(entity.position).toEqual(position);
      expect(entity.rotation).toEqual(new Quaternion(0, 0, 0, 1));
      expect(entity.velocity).toEqual(direction.scale(speed));

      // Check projectile properties
      expect(entity.damage).toBe(damage);
      expect(entity.range).toBe(range);
      expect(entity.distanceTraveled).toBe(0);
      expect(entity.speed).toBe(speed);
    });

    it('should create a missile entity with correct components', () => {
      const id = 'test2';
      const sourceId = 'player2';
      const position = new Vector3(4, 5, 6);
      const direction = new Vector3(1, 0, 0);
      const speed = 20;
      const damage = 50;
      const range = 200;
      const type = 'missile';

      const entity = createProjectileEntity(id, sourceId, position, direction, speed, damage, range, type);

      // Check basic properties
      expect(entity.id).toBe(id);
      expect(entity.type).toBe('projectile');
      expect(entity.projectile).toBe(true);
      expect(entity.projectileType).toBe(type);
      expect(entity.sourceId).toBe(sourceId);

      // Check transform
      expect(entity.position).toEqual(position);
      expect(entity.rotation).toEqual(new Quaternion(0, 0, 0, 1));
      expect(entity.velocity).toEqual(direction.scale(speed));

      // Check projectile properties
      expect(entity.damage).toBe(damage);
      expect(entity.range).toBe(range);
      expect(entity.distanceTraveled).toBe(0);
      expect(entity.speed).toBe(speed);
    });
  });

  describe('createFlagEntity', () => {
    it('should create a flag entity with correct components', () => {
      const id = 'test1';
      const team = 1;
      const position = new Vector3(1, 2, 3);

      const entity = createFlagEntity(id, team, position);

      // Check basic properties
      expect(entity.id).toBe(id);
      expect(entity.type).toBe('flag');
      expect(entity.flag).toBe(true);
      expect(entity.team).toBe(team);

      // Check transform
      expect(entity.position).toEqual(position);
      expect(entity.rotation).toEqual(new Quaternion(0, 0, 0, 1));

      // Check flag properties
      expect(entity.hasFlag).toBe(false);
      expect(entity.carriedBy).toBe("");
      expect(entity.atBase).toBe(true);
    });

    it('should create flags for different teams', () => {
      const position = new Vector3(0, 0, 0);

      // Test team 1 flag
      const team1Flag = createFlagEntity('flag1', 1, position);
      expect(team1Flag.team).toBe(1);

      // Test team 2 flag
      const team2Flag = createFlagEntity('flag2', 2, position);
      expect(team2Flag.team).toBe(2);
    });
  });
}); 