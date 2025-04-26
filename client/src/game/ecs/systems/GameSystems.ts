import { Engine, Vector3 } from 'babylonjs';
import { Room } from 'colyseus.js';
import { State } from '../../schemas/State';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createCameraSystem } from './CameraSystem';
import { createClientInputSystem } from './ClientInputSystem';
import { createEffectSystem } from './EffectSystem';
import { createNetworkSystem } from './NetworkSystem';
import { createRenderSystem } from './RenderSystem';
import { createPlaneSystem, createDroneSystem } from '@shared/ecs/systems/VehicleSystems';
import { createGameModeSystem, GameMode, GameModeConfig } from '@shared/ecs/systems/GameModeSystem';
import { createHealthSystem } from '@shared/ecs/systems/HealthSystems';
import { createCollisionSystem } from '@shared/ecs/systems/CollisionSystems';
import { createWeaponSystem } from '@shared/ecs/systems/WeaponSystems';
import { createEnvironmentSystem } from '@shared/ecs/systems/EnvironmentSystems';
import { createFlagSystem } from '@shared/ecs/systems/FlagSystems';
import { createSceneSystem } from './SceneSystem';
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
    const droneSystem = createDroneSystem(physicsWorldSystem.getWorld());
    const planeSystem = createPlaneSystem(physicsWorldSystem.getWorld());
    const weaponSystem = createWeaponSystem(physicsWorldSystem.getWorld());
    const networkSystem = createNetworkSystem(room, scene, cameraSystem, physicsWorldSystem, droneSystem, planeSystem, weaponSystem, inputSystem);
    const renderSystem = createRenderSystem(scene);
    const healthSystem = createHealthSystem();
    const collisionSystem = createCollisionSystem(physicsWorldSystem.getWorld());
    const environmentSystem = createEnvironmentSystem(physicsWorldSystem.getWorld());
    const flagSystem = createFlagSystem();
    console.log('All systems initialized');

    return {
        sceneSystem,
        physicsWorldSystem,
        gameModeSystem,
        cameraSystem,
        inputSystem,
        effectSystem,
        networkSystem,
        renderSystem,
        droneSystem,
        planeSystem,
        healthSystem,
        collisionSystem,
        weaponSystem,
        environmentSystem,
        flagSystem,

        update: (deltaTime: number) => {
            try {
                // Update systems in the correct order
                physicsWorldSystem.update(deltaTime);
                collisionSystem.update(deltaTime);
                healthSystem.update(deltaTime);
                flagSystem.update(deltaTime);
                environmentSystem.update(deltaTime);
                gameModeSystem.update(deltaTime);
                cameraSystem.update(deltaTime);
                effectSystem.update(deltaTime);
                renderSystem.update(deltaTime);
            } catch (error) {
                console.error('Error in game systems update:', error);
            }
        },

        cleanup: () => {
            console.log('Cleaning up game systems...');
            try {
                sceneSystem.dispose();
                physicsWorldSystem.dispose();
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