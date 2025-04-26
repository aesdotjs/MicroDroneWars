import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3, Quaternion } from 'babylonjs';
import { createStateSyncSystem } from '../StateSyncSystem';
import { State, EntitySchema } from '../../../schemas';
import { GameEntity } from '@shared/ecs/types';

describe('StateSyncSystem', () => {
    let state: State;
    let stateSyncSystem: ReturnType<typeof createStateSyncSystem>;

    beforeEach(() => {
        state = new State();
        stateSyncSystem = createStateSyncSystem(state);
    });

    it('should sync transform data', () => {
        const entity: GameEntity = {
            id: 'test1',
            transform: {
                position: new Vector3(1, 2, 3),
                rotation: new Quaternion(0.5, 0.5, 0.5, 0.5),
                velocity: new Vector3(4, 5, 6),
                angularVelocity: new Vector3(0.1, 0.2, 0.3)
            }
        };

        const entityState = new EntitySchema();
        entityState.id = 'test1';
        state.entities.set('test1', entityState);

        stateSyncSystem.update([entity]);

        expect(entityState.transform.positionX).toBe(1);
        expect(entityState.transform.positionY).toBe(2);
        expect(entityState.transform.positionZ).toBe(3);
        expect(entityState.transform.quaternionX).toBe(0.5);
        expect(entityState.transform.quaternionY).toBe(0.5);
        expect(entityState.transform.quaternionZ).toBe(0.5);
        expect(entityState.transform.quaternionW).toBe(0.5);
        expect(entityState.transform.linearVelocityX).toBe(4);
        expect(entityState.transform.linearVelocityY).toBe(5);
        expect(entityState.transform.linearVelocityZ).toBe(6);
        expect(entityState.transform.angularVelocityX).toBe(0.1);
        expect(entityState.transform.angularVelocityY).toBe(0.2);
        expect(entityState.transform.angularVelocityZ).toBe(0.3);
    });

    it('should sync game state data', () => {
        const entity: GameEntity = {
            id: 'test1',
            gameState: {
                health: 100,
                maxHealth: 200,
                team: 1,
                hasFlag: true,
                carryingFlag: false,
                carriedBy: 'player1',
                atBase: true
            }
        };

        const entityState = new EntitySchema();
        entityState.id = 'test1';
        state.entities.set('test1', entityState);

        stateSyncSystem.update([entity]);

        expect(entityState.gameState.health).toBe(100);
        expect(entityState.gameState.maxHealth).toBe(200);
        expect(entityState.gameState.team).toBe(1);
        expect(entityState.gameState.hasFlag).toBe(true);
        expect(entityState.gameState.carryingFlag).toBe(false);
        expect(entityState.gameState.carriedBy).toBe('player1');
        expect(entityState.gameState.atBase).toBe(true);
    });

    it('should sync vehicle data', () => {
        const entity: GameEntity = {
            id: 'test1',
            vehicle: {
                vehicleType: 'drone',
                weapons: [
                    {
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
                    }
                ],
                activeWeaponIndex: 0
            }
        };

        const entityState = new EntitySchema();
        entityState.id = 'test1';
        state.entities.set('test1', entityState);

        stateSyncSystem.update([entity]);

        expect(entityState.vehicle.vehicleType).toBe('drone');
        expect(entityState.vehicle.weapons.length).toBe(1);
        expect(entityState.vehicle.weapons[0].id).toBe('weapon1');
        expect(entityState.vehicle.weapons[0].name).toBe('Weapon 1');
        expect(entityState.vehicle.activeWeaponIndex).toBe(0);
    });

    it('should sync projectile data', () => {
        const entity: GameEntity = {
            id: 'test1',
            projectile: {
                projectileType: 'bullet',
                damage: 50,
                range: 100,
                distanceTraveled: 25,
                sourceId: 'player1',
                timestamp: 1000,
                tick: 1
            }
        };

        const entityState = new EntitySchema();
        entityState.id = 'test1';
        state.entities.set('test1', entityState);

        stateSyncSystem.update([entity]);

        expect(entityState.projectile.damage).toBe(50);
        expect(entityState.projectile.range).toBe(100);
        expect(entityState.projectile.distanceTraveled).toBe(25);
        expect(entityState.projectile.sourceId).toBe('player1');
    });

    it('should sync tick data', () => {
        const entity: GameEntity = {
            id: 'test1',
            tick: {
                tick: 100,
                timestamp: 1000,
                lastProcessedInputTimestamp: 900,
                lastProcessedInputTick: 90
            }
        };

        const entityState = new EntitySchema();
        entityState.id = 'test1';
        state.entities.set('test1', entityState);

        stateSyncSystem.update([entity]);

        expect(entityState.tick.tick).toBe(100);
        expect(entityState.tick.timestamp).toBe(1000);
        expect(entityState.tick.lastProcessedInputTimestamp).toBe(900);
        expect(entityState.tick.lastProcessedInputTick).toBe(90);
    });

    it('should handle multiple entities', () => {
        const entities: GameEntity[] = [
            {
                id: 'test1',
                transform: {
                    position: new Vector3(1, 2, 3),
                    rotation: new Quaternion(0, 0, 0, 1),
                    velocity: new Vector3(0, 0, 0),
                    angularVelocity: new Vector3(0, 0, 0)
                }
            },
            {
                id: 'test2',
                transform: {
                    position: new Vector3(4, 5, 6),
                    rotation: new Quaternion(0, 0, 0, 1),
                    velocity: new Vector3(0, 0, 0),
                    angularVelocity: new Vector3(0, 0, 0)
                }
            }
        ];

        const entityState1 = new EntitySchema();
        entityState1.id = 'test1';
        const entityState2 = new EntitySchema();
        entityState2.id = 'test2';
        state.entities.set('test1', entityState1);
        state.entities.set('test2', entityState2);

        stateSyncSystem.update(entities);

        expect(entityState1.transform.positionX).toBe(1);
        expect(entityState1.transform.positionY).toBe(2);
        expect(entityState1.transform.positionZ).toBe(3);
        expect(entityState2.transform.positionX).toBe(4);
        expect(entityState2.transform.positionY).toBe(5);
        expect(entityState2.transform.positionZ).toBe(6);
    });
}); 