import { Room } from 'colyseus.js';
import { State } from '../../schemas/State';
import { EntitySchema } from '../../schemas/EntitySchema';
import { world as ecsWorld } from '@shared/ecs/world';
import { Vector3, Quaternion } from 'babylonjs';
import { GameEntity } from '@shared/ecs/types';
import * as Colyseus from 'colyseus.js';

/**
 * Creates a system that handles network state updates and converts them to ECS entities
 */
export function createNetworkSystem(room: Room<State>) {
    const entityById = new Map<string, GameEntity>();
    const $ = Colyseus.getStateCallbacks(room);

    // Network quality tracking
    let networkLatency = 0;
    let networkQuality = 1.0;
    let networkJitter = 0;
    const qualitySamples: number[] = [];
    const QUALITY_SAMPLES = 20;
    const MIN_LATENCY = 5;
    const LATENCY_SMOOTHING = 0.1;

    // Handle network quality measurements
    room.onMessage("pong", (data: { clientTime: number, serverTime: number, latency: number }) => {
        const now = Date.now();
        const rtt = now - data.clientTime;
        const oneWayLatency = Math.max(MIN_LATENCY, rtt / 2);
        const jitter = Math.abs(rtt/2 - oneWayLatency);
        
        // Update network stats with smoothing
        networkLatency = networkLatency === 0 
            ? oneWayLatency 
            : LATENCY_SMOOTHING * oneWayLatency + (1 - LATENCY_SMOOTHING) * networkLatency;
        
        networkJitter = networkJitter === 0
            ? jitter
            : LATENCY_SMOOTHING * jitter + (1 - LATENCY_SMOOTHING) * networkJitter;

        // Update network quality
        const latencyScore = Math.max(0, 1 - (oneWayLatency / 500));
        const jitterScore = Math.max(0, 1 - (jitter / 100));
        const qualityScore = (latencyScore + jitterScore) / 2;

        qualitySamples.push(qualityScore);
        if (qualitySamples.length > QUALITY_SAMPLES) {
            qualitySamples.shift();
        }

        networkQuality = qualitySamples.reduce((a, b) => a + b, 0) / qualitySamples.length;
    });

    // Handle entity updates
    $(room.state).entities.onAdd((entity: EntitySchema, id: string) => {
        const newEntity: GameEntity = {
            id,
            type: entity.type,
            position: new Vector3(entity.positionX, entity.positionY, entity.positionZ),
            rotation: new Quaternion(entity.quaternionX, entity.quaternionY, entity.quaternionZ, entity.quaternionW),
            velocity: new Vector3(entity.linearVelocityX, entity.linearVelocityY, entity.linearVelocityZ),
            angularVelocity: new Vector3(entity.angularVelocityX, entity.angularVelocityY, entity.angularVelocityZ),
            health: entity.health,
            maxHealth: entity.maxHealth,
            team: entity.team,
            hasFlag: entity.hasFlag,
            carriedBy: entity.carriedBy,
            atBase: entity.atBase
        };

        // Set type-specific properties
        if (entity.type === 'drone' || entity.type === 'plane') {
            newEntity[entity.type] = true;
            // Convert weapons array to the correct type
            newEntity.weapons = Array.from(entity.weapons).map(w => ({
                id: w.id,
                name: w.name,
                projectileType: w.projectileType as 'bullet' | 'missile',
                damage: w.damage,
                fireRate: w.fireRate,
                projectileSpeed: w.projectileSpeed,
                cooldown: w.cooldown,
                range: w.range,
                isOnCooldown: w.isOnCooldown,
                lastFireTime: w.lastFireTime
            }));
            newEntity.activeWeaponIndex = entity.activeWeaponIndex;
        } else if (entity.type === 'projectile') {
            newEntity.projectile = true;
            newEntity.damage = entity.damage;
            newEntity.range = entity.range;
            newEntity.distanceTraveled = entity.distanceTraveled;
            newEntity.sourceId = entity.sourceId;
        } else if (entity.type === 'flag') {
            newEntity.flag = true;
        }

        ecsWorld.add(newEntity);
        entityById.set(id, newEntity);
    });

    $(room.state).entities.onChange((entity: EntitySchema, id: string) => {
        const gameEntity = entityById.get(id);
        if (!gameEntity) return;

        // Update transform data
        if (gameEntity.position) {
            gameEntity.position.set(entity.positionX, entity.positionY, entity.positionZ);
        }
        if (gameEntity.rotation) {
            gameEntity.rotation.set(entity.quaternionX, entity.quaternionY, entity.quaternionZ, entity.quaternionW);
        }
        if (gameEntity.velocity) {
            gameEntity.velocity.set(entity.linearVelocityX, entity.linearVelocityY, entity.linearVelocityZ);
        }
        if (gameEntity.angularVelocity) {
            gameEntity.angularVelocity.set(entity.angularVelocityX, entity.angularVelocityY, entity.angularVelocityZ);
        }

        // Update common state data
        gameEntity.health = entity.health;
        gameEntity.maxHealth = entity.maxHealth;
        gameEntity.hasFlag = entity.hasFlag;
        gameEntity.carriedBy = entity.carriedBy;
        gameEntity.atBase = entity.atBase;
        gameEntity.team = entity.team;

        // Update type-specific data
        if (entity.type === 'drone' || entity.type === 'plane') {
            // Convert weapons array to the correct type
            gameEntity.weapons = Array.from(entity.weapons).map(w => ({
                id: w.id,
                name: w.name,
                projectileType: w.projectileType as 'bullet' | 'missile',
                damage: w.damage,
                fireRate: w.fireRate,
                projectileSpeed: w.projectileSpeed,
                cooldown: w.cooldown,
                range: w.range,
                isOnCooldown: w.isOnCooldown,
                lastFireTime: w.lastFireTime
            }));
            gameEntity.activeWeaponIndex = entity.activeWeaponIndex;
        } else if (entity.type === 'projectile') {
            gameEntity.damage = entity.damage;
            gameEntity.range = entity.range;
            gameEntity.distanceTraveled = entity.distanceTraveled;
            gameEntity.sourceId = entity.sourceId;
        }
    });

    $(room.state).entities.onRemove((_entity: EntitySchema, id: string) => {
        const entity = entityById.get(id);
        if (entity) {
            ecsWorld.remove(entity);
            entityById.delete(id);
        }
    });

    return {
        getEntityById: (id: string) => entityById.get(id),
        getNetworkStats: () => ({
            latency: networkLatency,
            quality: networkQuality,
            jitter: networkJitter
        }),
        sendCommand: (input: any) => {
            room.send("command", input);
        },
        sendPing: () => {
            room.send("ping", Date.now());
        },
        update: (dt: number) => {
            // Network system doesn't need per-frame updates
            // All updates are handled through Colyseus state change events
        }
    };
} 