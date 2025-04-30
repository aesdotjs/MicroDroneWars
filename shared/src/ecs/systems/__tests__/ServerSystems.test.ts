import { describe, it, expect } from 'vitest';
import { createVehicleEntity, createProjectileEntity, createFlagEntity } from '../EntitySystem';
import { DefaultWeapons } from '../../types';
import { Vector3, Quaternion } from 'babylonjs';

describe('ServerSystems', () => {
    describe('createVehicleEntity', () => {
        it('should create a vehicle entity with correct components', () => {
            const id = 'test-vehicle';
            const vehicleType = 'drone';
            const position = new Vector3(0, 0, 0);
            const team = 0;

            const entity = createVehicleEntity(id, vehicleType, position, team);

            expect(entity.id).toBe(id);
            expect(entity.type).toBe(vehicleType);
            expect(entity.transform).toBeDefined();
            expect(entity.transform?.position).toEqual(position);
            expect(entity.transform?.rotation).toEqual(new Quaternion(0, 0, 0, 1));
            expect(entity.vehicle).toBeDefined();
            expect(entity.vehicle?.vehicleType).toBe(vehicleType);
            expect(entity.vehicle?.weapons).toHaveLength(2);
            expect(entity.vehicle?.weapons[0]).toEqual(DefaultWeapons.chaingun);
            expect(entity.vehicle?.weapons[1]).toEqual(DefaultWeapons.missile);
            expect(entity.vehicle?.activeWeaponIndex).toBe(0);
            expect(entity.gameState).toBeDefined();
            expect(entity.gameState?.health).toBe(100);
            expect(entity.gameState?.maxHealth).toBe(150);
            expect(entity.gameState?.team).toBe(team);
            expect(entity.tick).toBeDefined();
            expect(entity.tick?.tick).toBe(0);
            expect(entity.tick?.timestamp).toBeDefined();
        });
    });

    describe('createProjectileEntity', () => {
        it('should create a projectile entity with correct components', () => {
            const id = 'test-projectile';
            const sourceId = 'player1';
            const position = new Vector3(0, 0, 0);
            const direction = new Vector3(0, 0, 1);
            const speed = 10;
            const damage = 10;
            const range = 100;
            const type = 'bullet';

            const entity = createProjectileEntity(
                id,
                sourceId,
                position,
                direction,
                speed,
                damage,
                range,
                type
            );

            expect(entity.id).toBe(id);
            expect(entity.type).toBe('projectile');
            expect(entity.transform).toBeDefined();
            expect(entity.transform?.position).toEqual(position);
            expect(entity.transform?.rotation).toEqual(new Quaternion(0, 0, 0, 1));
            expect(entity.transform?.velocity).toEqual(direction.scale(speed));
            expect(entity.projectile).toBeDefined();
            expect(entity.projectile?.projectileType).toBe(type);
            expect(entity.projectile?.damage).toBe(damage);
            expect(entity.projectile?.range).toBe(range);
            expect(entity.projectile?.distanceTraveled).toBe(0);
            expect(entity.projectile?.sourceId).toBe(sourceId);
            expect(entity.projectile?.timestamp).toBeDefined();
            expect(entity.projectile?.tick).toBe(0);
            expect(entity.tick).toBeDefined();
            expect(entity.tick?.tick).toBe(0);
            expect(entity.tick?.timestamp).toBeDefined();
        });
    });

    describe('createFlagEntity', () => {
        it('should create a flag entity with correct components', () => {
            const id = 'test-flag';
            const team = 0;
            const position = new Vector3(0, 0, 0);

            const entity = createFlagEntity(id, team, position);

            expect(entity.id).toBe(id);
            expect(entity.type).toBe('flag');
            expect(entity.transform).toBeDefined();
            expect(entity.transform?.position).toEqual(position);
            expect(entity.transform?.rotation).toEqual(new Quaternion(0, 0, 0, 1));
            expect(entity.gameState).toBeDefined();
            expect(entity.gameState?.team).toBe(team);
            expect(entity.gameState?.hasFlag).toBe(false);
            expect(entity.gameState?.carryingFlag).toBe(false);
            expect(entity.gameState?.atBase).toBe(true);
            expect(entity.tick).toBeDefined();
            expect(entity.tick?.tick).toBe(0);
            expect(entity.tick?.timestamp).toBeDefined();
        });
    });
}); 