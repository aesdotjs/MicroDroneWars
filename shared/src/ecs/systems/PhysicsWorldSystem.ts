import * as CANNON from 'cannon-es';
import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';

/**
 * Creates a system that manages the physics world for both client and server
 */
export function createPhysicsWorldSystem() {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.defaultContactMaterial.friction = 0.3;
    world.defaultContactMaterial.restitution = 0.3;

    let currentTick = 0;
    const TICK_RATE = 60;
    const TIME_STEP = 1 / TICK_RATE;
    const MAX_SUB_STEPS = 1;

    // Map to track which bodies belong to which entities
    const entityBodies = new Map<string, CANNON.Body>();

    return {
        getWorld: () => world,
        getCurrentTick: () => currentTick,
        
        addBody: (entity: GameEntity) => {
            if (!entity.physics?.body) {
                console.warn(`Entity ${entity.id} has no physics body to add`);
                return;
            }

            // Add body to world if not already added
            if (!world.bodies.includes(entity.physics.body)) {
                world.addBody(entity.physics.body);
                entityBodies.set(entity.id, entity.physics.body);
            }
        },

        removeBody: (entityId: string) => {
            const body = entityBodies.get(entityId);
            if (body) {
                world.removeBody(body);
                entityBodies.delete(entityId);
            }
        },
        
        update: (deltaTime: number) => {
            world.step(TIME_STEP, deltaTime, MAX_SUB_STEPS);
            currentTick++;
        },

        dispose: () => {
            // Remove all bodies from world
            world.bodies.forEach(body => {
                world.removeBody(body);
            });
            entityBodies.clear();
        }
    };
} 