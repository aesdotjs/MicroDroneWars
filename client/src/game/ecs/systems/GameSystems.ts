import { Engine, Vector3 } from '@babylonjs/core';
import { Room } from 'colyseus.js';
import { State } from '@shared/schemas';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createCameraSystem } from './CameraSystem';
import { createClientInputSystem } from './ClientInputSystem';
import { createNetworkSystem } from './NetworkSystem';
import { createFlagSystem } from '@shared/ecs/systems/FlagSystems';
import { createSceneSystem } from './SceneSystem';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
import { createAssetSystem } from '@shared/ecs/systems/AssetSystem';
import { createWeaponSystem } from '@shared/ecs/systems/WeaponSystem';
import { world as ecsWorld } from '@shared/ecs/world';
import { createProjectileSystem } from "./ProjectileSystem";
import { RapierDebugger } from "./RapierDebugger";
import { useGameDebug } from '@/composables/useGameDebug';

const { log } = useGameDebug();

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
    const physicsWorldSystem = createPhysicsWorldSystem(false);
    physicsWorldSystem.setCurrentTick(room.state.serverTick);
    console.log('Physics world system initialized');

    // Initialize Rapier debugger
    const rapierDebugger = new RapierDebugger(scene, physicsWorldSystem.getWorld());
    let isDebugMode = false;
    console.log('Rapier debugger initialized');

    // Initialize weapon system
    console.log('Initializing weapon system...');
    const weaponSystem = createWeaponSystem(physicsWorldSystem, false);
    console.log('Weapon system initialized');

    // Initialize physics system
    console.log('Initializing physics system...');
    const physicsSystem = createPhysicsSystem(physicsWorldSystem);
    console.log('Physics system initialized');

    // Initialize other systems
    console.log('Initializing remaining systems...');
    const cameraSystem = createCameraSystem(scene, camera);
    const inputSystem = createClientInputSystem(canvas);
    // Initialize projectile system
    console.log('Initializing projectile system...');
    const projectileSystem = createProjectileSystem(physicsWorldSystem, sceneSystem);
    const networkSystem = createNetworkSystem(room, physicsWorldSystem, physicsSystem, inputSystem, weaponSystem, projectileSystem, sceneSystem);

    console.log('Projectile system initialized');
    const flagSystem = createFlagSystem();
    const assetSystem = createAssetSystem(engine, scene, physicsWorldSystem, false);
    assetSystem.preloadAssets();

    console.log('All systems initialized');

    // handle entity removal
    ecsWorld.onEntityRemoved.subscribe((entity) => {
        if (entity.physics?.body) {
            physicsWorldSystem.removeBody(entity.id);
        }
        if (entity.projectile?.projectileType) {
            sceneSystem.removeProjectileMesh(entity.id);
        }
    });

    // Physics loop settings
    // const TICK_RATE = 60;
    // const MS_PER_TICK = 1000 / TICK_RATE;
    // let nextTick = performance.now();
    // let isPhysicsRunning = true;

    // function physicsStep() {
    //     if (!isPhysicsRunning) return;

    //     try {
    //         inputSystem.beginFrame();
    //         assetSystem.update(1 / TICK_RATE);
    //         networkSystem.update(1 / TICK_RATE);
    //         // cannonDebugger.update();
    //         projectileSystem.update(1 / TICK_RATE);
    //         sceneSystem.update(1 / TICK_RATE);
    //         collisionSystem.update(1 / TICK_RATE);
    //         flagSystem.update(1 / TICK_RATE);
    //         cameraSystem.update(1 / TICK_RATE);
    //         // Run exactly one tick
    //         physicsWorldSystem.update(1 / TICK_RATE);

    //         // Schedule next tick
    //         nextTick += MS_PER_TICK;
    //         const now = performance.now();
    //         const drift = nextTick - now;
            
    //         // If we've fallen behind, schedule next tick ASAP
    //         setTimeout(physicsStep, Math.max(0, drift));
    //     } catch (error) {
    //         console.error('Error in physics step:', error);
    //         // Even if there's an error, try to keep the physics loop running
    //         setTimeout(physicsStep, MS_PER_TICK);
    //     }
    // }

    // // Start the physics loop
    // console.log('Starting physics loop...');
    // physicsStep();

    // // Render loop - runs as fast as possible
    // console.log('Setting up render loop...');
    // engine.runRenderLoop(() => {
    //     try {
    //         networkSystem.networkPredictionSystem.update();
    //         sceneSystem.render();
    //     } catch (error) {
    //         console.error('Error in render loop:', error);
    //     }
    // });

     // Fixed time step settings
     const FIXED_TIME_STEP = 1/60; // 60fps
     let accumulator = 0;
     const update = (deltaTime: number) => {
         try {
             // Accumulate time
             accumulator += deltaTime;
 
             // Update systems in the correct order with fixed time step
             while (accumulator >= FIXED_TIME_STEP * 1000) {
                inputSystem.beginFrame();
                assetSystem.update(FIXED_TIME_STEP);
                physicsSystem.update(FIXED_TIME_STEP);
                weaponSystem.update(FIXED_TIME_STEP);
                networkSystem.update(FIXED_TIME_STEP);
                projectileSystem.update(FIXED_TIME_STEP);
                flagSystem.update(FIXED_TIME_STEP);
                // Run exactly one tick
                physicsWorldSystem.update(FIXED_TIME_STEP);
                log('Tick', physicsWorldSystem.getCurrentTick());
                cameraSystem.update(FIXED_TIME_STEP);

                accumulator -= FIXED_TIME_STEP * 1000;
            }
        } catch (error) {
            console.error('Error in game systems update:', error);
        }
    }
    console.log('Setting up render loop...');
    engine.runRenderLoop(() => {
        sceneSystem.render();
    });
    // Start the physics loop
    console.log('Starting physics loop...');
    scene.registerBeforeRender(() => {
        const dt = engine.getDeltaTime() / 1000;
        update(engine.getDeltaTime());
        networkSystem.networkPredictionSystem.updateRemotes(dt);
        if (isDebugMode) {
            rapierDebugger.update();
        }
        sceneSystem.update(dt);
    });

    return {
        sceneSystem,
        physicsWorldSystem,
        physicsSystem,
        cameraSystem,
        inputSystem,
        networkSystem,
        flagSystem,
        assetSystem,

        // Add debug mode controls
        setDebugMode: (enabled: boolean) => {
            isDebugMode = enabled;
            // Enable/disable network system debug mode
            networkSystem.setDebugMode(enabled);
            // Rapier debugger is automatically updated in the physics loop when isDebugMode is true
        },
        getDebugMode: () => isDebugMode,

        cleanup: () => {
            console.log('Cleaning up game systems...');
            try {
                sceneSystem.dispose();
                physicsWorldSystem.dispose();
                physicsSystem.cleanup();
                inputSystem.cleanup();
                networkSystem.cleanup();
                assetSystem.cleanup();
                rapierDebugger.dispose();
                // Clean up ecsWorld
                ecsWorld.clear();
            } catch (error) {
                console.error('Error during game systems cleanup:', error);
            }
        }
    };
} 