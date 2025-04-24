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
    (world.solver as any).iterations = 10;
    world.defaultContactMaterial.friction = 0.3;
    world.defaultContactMaterial.restitution = 0.3;

    let currentTick = 0;
    const TICK_RATE = 60;
    const TIME_STEP = 1 / TICK_RATE;
    const MAX_SUB_STEPS = 3;

    return {
        getWorld: () => world,
        getCurrentTick: () => currentTick,
        
        update: (deltaTime: number) => {
            world.step(TIME_STEP, deltaTime, MAX_SUB_STEPS);
            currentTick++;
        },

        dispose: () => {
            world.bodies.forEach(body => {
                world.removeBody(body);
            });
        }
    };
} 