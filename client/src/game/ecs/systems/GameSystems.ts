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
    const weaponSystem = createWeaponSystem(physicsWorldSystem);
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
    // Fixed time step settings
    const FIXED_TIME_STEP = 1/60; // 60fps
    let accumulator = 0;
    const update = (deltaTime: number) => {
        try {
            // Accumulate time
            accumulator += deltaTime;

            // Update systems in the correct order with fixed time step
            while (accumulator >= FIXED_TIME_STEP) {
                physicsWorldSystem.update(FIXED_TIME_STEP);
                // cannonDebugger.update();
                assetSystem.update(FIXED_TIME_STEP);
                networkSystem.update(FIXED_TIME_STEP);
                projectileSystem.update(FIXED_TIME_STEP);
                sceneSystem.update(FIXED_TIME_STEP);
                collisionSystem.update(FIXED_TIME_STEP);
                flagSystem.update(FIXED_TIME_STEP);
                cameraSystem.update(FIXED_TIME_STEP);
                
                accumulator -= FIXED_TIME_STEP;
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
        networkSystem.networkPredictionSystem.update();
        update(engine.getDeltaTime() / 1000);
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
        update,

        cleanup: () => {
            console.log('Cleaning up game systems...');
            try {
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