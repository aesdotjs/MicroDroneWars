import { Engine, Vector3 } from 'babylonjs';
import { Room } from 'colyseus.js';
import { State } from '../../schemas/State';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createCameraSystem } from './CameraSystem';
import { createClientInputSystem } from './ClientInputSystem';
import { createEffectSystem } from './EffectSystem';
import { createNetworkSystem } from './NetworkSystem';
import { createGameModeSystem, GameMode, GameModeConfig } from '@shared/ecs/systems/GameModeSystem';
import { createCollisionSystem } from '@shared/ecs/systems/CollisionSystems';
import { createEnvironmentSystem } from '@shared/ecs/systems/EnvironmentSystems';
import { createFlagSystem } from '@shared/ecs/systems/FlagSystems';
import { createSceneSystem } from './SceneSystem';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
import { world as ecsWorld } from '@shared/ecs/world';

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
    const shadowGenerator = sceneSystem.getShadowGenerator();
    console.log('Scene system initialized:', { scene, camera, shadowGenerator });

    // Initialize physics world system
    console.log('Initializing physics world system...');
    const physicsWorldSystem = createPhysicsWorldSystem();
    console.log('Physics world system initialized');

    // Initialize physics system
    console.log('Initializing physics system...');
    const physicsSystem = createPhysicsSystem(physicsWorldSystem.getWorld());
    console.log('Physics system initialized');

    // Initialize game mode system
    console.log('Initializing game mode system...');
    const gameModeConfig: GameModeConfig = {
        mode: GameMode.CTF,
        teamCount: 2,
        maxPlayers: 20,
        timeLimit: 600, // 10 minutes
        scoreLimit: 3,
        spawnPoints: [
            new Vector3(-20, 10, 0),
            new Vector3(20, 10, 0)
        ],
        flagPositions: [
            new Vector3(-20, 0, 0),
            new Vector3(20, 0, 0)
        ]
    };
    const gameModeSystem = createGameModeSystem(gameModeConfig);
    console.log('Game mode system initialized');

    // Initialize other systems
    console.log('Initializing remaining systems...');
    const cameraSystem = createCameraSystem(scene, camera);
    const inputSystem = createClientInputSystem(canvas);
    const effectSystem = createEffectSystem(scene);
    const networkSystem = createNetworkSystem(room, scene, cameraSystem, physicsWorldSystem, physicsSystem, inputSystem);
    const collisionSystem = createCollisionSystem(physicsWorldSystem.getWorld());
    const environmentSystem = createEnvironmentSystem(physicsWorldSystem.getWorld());
    const flagSystem = createFlagSystem();
    console.log('All systems initialized');

    // Start the render loop
    console.log('Starting scene render loop...');
    engine.runRenderLoop(() => {
        networkSystem.networkPredictionSystem.update(1/60);
        sceneSystem.update();
    });

    // Fixed time step settings
    const FIXED_TIME_STEP = 1/60; // 60fps
    let accumulator = 0;

    return {
        sceneSystem,
        physicsWorldSystem,
        physicsSystem,
        gameModeSystem,
        cameraSystem,
        inputSystem,
        effectSystem,
        networkSystem,
        collisionSystem,
        environmentSystem,
        flagSystem,

        update: (deltaTime: number) => {
            try {
                // Accumulate time
                accumulator += deltaTime;

                // Update systems in the correct order with fixed time step
                while (accumulator >= FIXED_TIME_STEP) {
                    physicsWorldSystem.update(FIXED_TIME_STEP);
                    networkSystem.update(FIXED_TIME_STEP);
                    collisionSystem.update(FIXED_TIME_STEP);
                    flagSystem.update(FIXED_TIME_STEP);
                    environmentSystem.update(FIXED_TIME_STEP);
                    gameModeSystem.update(FIXED_TIME_STEP);
                    cameraSystem.update(FIXED_TIME_STEP);
                    effectSystem.update(FIXED_TIME_STEP);
                    
                    accumulator -= FIXED_TIME_STEP;
                }
            } catch (error) {
                console.error('Error in game systems update:', error);
            }
        },

        cleanup: () => {
            console.log('Cleaning up game systems...');
            try {
                sceneSystem.dispose();
                physicsWorldSystem.dispose();
                physicsSystem.cleanup();
                inputSystem.cleanup();
                effectSystem.cleanup();
                networkSystem.cleanup();    
                // Clean up all vehicles
                const vehicles = ecsWorld.with("vehicle", "render").where(({vehicle}) => 
                    vehicle.vehicleType === 'drone' || vehicle.vehicleType === 'plane'
                );
                console.log('Cleaning up vehicles:', vehicles.size);
                console.log('Game systems cleanup completed');
            } catch (error) {
                console.error('Error during game systems cleanup:', error);
            }
        }
    };
} 