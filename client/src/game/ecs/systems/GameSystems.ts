import { Engine, Vector3 } from '@babylonjs/core';
import { Room } from 'colyseus.js';
import { State } from '@shared/schemas';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createCameraSystem } from './CameraSystem';
import { createClientInputSystem } from './ClientInputSystem';
import { createNetworkSystem } from './NetworkSystem';
import { createCollisionSystem } from '@shared/ecs/systems/CollisionSystems';
import { createFlagSystem } from '@shared/ecs/systems/FlagSystems';
import { createSceneSystem } from './SceneSystem';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
import { createAssetSystem } from '@shared/ecs/systems/AssetSystem';
import { createWeaponSystem } from '@shared/ecs/systems/WeaponSystems';
import { world as ecsWorld } from '@shared/ecs/world';
import { createProjectileSystem } from '@shared/ecs/systems/WeaponSystems';
import CannonDebugger from "cannon-es-debugger-babylonjs";

export function createGameSystems(
    engine: Engine,
    room: Room<State>,
    canvas: HTMLCanvasElement
) {
    console.log('Creating game systems...');

    // Initialize scene system first
    console.log('Initializing scene system...');
    const sceneSystem = createSceneSystem(engine);
    const scene = sceneSystem.getScene();
    const camera = sceneSystem.getCamera();
    console.log('Scene system initialized:', { scene, camera });

    // Initialize physics world system
    console.log('Initializing physics world system...');
    const physicsWorldSystem = createPhysicsWorldSystem();
    physicsWorldSystem.setCurrentTick(room.state.serverTick);
    console.log('Physics world system initialized');

    // Initialize cannon-es-debugger-babylonjs
    const cannonDebugger = new (CannonDebugger as any)(scene, physicsWorldSystem.getWorld());
    console.log('Cannon-es-debugger-babylonjs initialized');

    // Initialize weapon system
    console.log('Initializing weapon system...');
    const weaponSystem = createWeaponSystem(physicsWorldSystem, false);
    console.log('Weapon system initialized');

    // Initialize projectile system
    console.log('Initializing projectile system...');
    const projectileSystem = createProjectileSystem(physicsWorldSystem);
    console.log('Projectile system initialized');

    // Initialize physics system
    console.log('Initializing physics system...');
    const physicsSystem = createPhysicsSystem(physicsWorldSystem);
    console.log('Physics system initialized');

    // Initialize other systems
    console.log('Initializing remaining systems...');
    const cameraSystem = createCameraSystem(scene, camera);
    const inputSystem = createClientInputSystem(canvas);
    const networkSystem = createNetworkSystem(room, physicsWorldSystem, physicsSystem, inputSystem, weaponSystem);
    const collisionSystem = createCollisionSystem(physicsWorldSystem.getWorld());
    const flagSystem = createFlagSystem();
    const assetSystem = createAssetSystem(engine, scene, physicsWorldSystem, false);
    assetSystem.preloadAssets();

    console.log('All systems initialized');

    // handle entity removal
    ecsWorld.onEntityRemoved.subscribe((entity) => {
        console.log('Entity removed sub', entity.id);
        if (entity.physics?.body) {
            physicsWorldSystem.removeBody(entity.id);
        }
        if (entity.projectile?.projectileType) {
            sceneSystem.removeProjectileMesh(entity.id);
        }
    });

    // Physics loop settings
    const TICK_RATE = 60;
    const MS_PER_TICK = 1000 / TICK_RATE;
    let nextTick = performance.now();
    let isPhysicsRunning = true;

    function physicsStep() {
        if (!isPhysicsRunning) return;

        try {
            // Run exactly one tick
            physicsWorldSystem.update(1 / TICK_RATE);
            assetSystem.update(1 / TICK_RATE);
            networkSystem.update(1 / TICK_RATE);
            // cannonDebugger.update();
            projectileSystem.update(1 / TICK_RATE);
            sceneSystem.update(1 / TICK_RATE);
            collisionSystem.update(1 / TICK_RATE);
            flagSystem.update(1 / TICK_RATE);
            cameraSystem.update(1 / TICK_RATE);

            // Schedule next tick
            nextTick += MS_PER_TICK;
            const now = performance.now();
            const drift = nextTick - now;
            
            // If we've fallen behind, schedule next tick ASAP
            setTimeout(physicsStep, Math.max(0, drift));
        } catch (error) {
            console.error('Error in physics step:', error);
            // Even if there's an error, try to keep the physics loop running
            setTimeout(physicsStep, MS_PER_TICK);
        }
    }

    // Start the physics loop
    console.log('Starting physics loop...');
    physicsStep();

    // Render loop - runs as fast as possible
    console.log('Setting up render loop...');
    engine.runRenderLoop(() => {
        try {
            networkSystem.networkPredictionSystem.update();
            sceneSystem.render();
        } catch (error) {
            console.error('Error in render loop:', error);
        }
    });

    return {
        sceneSystem,
        physicsWorldSystem,
        physicsSystem,
        cameraSystem,
        inputSystem,
        networkSystem,
        collisionSystem,
        flagSystem,
        assetSystem,

        cleanup: () => {
            console.log('Cleaning up game systems...');
            try {
                isPhysicsRunning = false; // Stop the physics loop
                sceneSystem.dispose();
                physicsWorldSystem.dispose();
                physicsSystem.cleanup();
                inputSystem.cleanup();
                networkSystem.cleanup();
                assetSystem.cleanup();
                // Clean up ecsWorld
                ecsWorld.clear();
            } catch (error) {
                console.error('Error during game systems cleanup:', error);
            }
        }
    };
} 