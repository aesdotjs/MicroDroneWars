import { Engine, Vector3 } from 'babylonjs';
import { Room } from 'colyseus.js';
import { State } from '../../schemas/State';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createCameraSystem } from './CameraSystem';
import { createClientInputSystem } from './ClientInputSystem';
import { createEffectSystem } from './EffectSystem';
import { createNetworkSystem } from './NetworkSystem';
import { createNetworkPredictionSystem } from './NetworkPredictionSystem';
import { createRenderSystem } from './RenderSystem';
import { createVehicleSystem } from './VehicleSystem';
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
    // Initialize scene system first
    const sceneSystem = createSceneSystem(engine);
    const scene = sceneSystem.getScene();
    const camera = sceneSystem.getCamera();
    const shadowGenerator = sceneSystem.getShadowGenerator();

    // Initialize physics world system
    const physicsWorldSystem = createPhysicsWorldSystem();

    // Initialize game mode system
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

    // Initialize other systems
    const cameraSystem = createCameraSystem(scene, camera);
    const inputSystem = createClientInputSystem(canvas);
    const effectSystem = createEffectSystem(scene);
    const networkSystem = createNetworkSystem(room);
    const networkPredictionSystem = createNetworkPredictionSystem(room);
    const renderSystem = createRenderSystem(scene);
    const vehicleSystem = createVehicleSystem(scene);
    const healthSystem = createHealthSystem();
    const collisionSystem = createCollisionSystem(physicsWorldSystem.getWorld());
    const weaponSystem = createWeaponSystem(physicsWorldSystem.getWorld());
    const environmentSystem = createEnvironmentSystem(physicsWorldSystem.getWorld());
    const flagSystem = createFlagSystem();

    return {
        sceneSystem,
        physicsWorldSystem,
        gameModeSystem,
        cameraSystem,
        inputSystem,
        effectSystem,
        networkSystem,
        networkPredictionSystem,
        renderSystem,
        vehicleSystem,
        healthSystem,
        collisionSystem,
        weaponSystem,
        environmentSystem,
        flagSystem,

        update: (deltaTime: number) => {
            // Update systems in the correct order
            inputSystem.update(deltaTime);
            physicsWorldSystem.update(deltaTime);
            collisionSystem.update(deltaTime);
            weaponSystem.update(deltaTime);
            healthSystem.update(deltaTime);
            flagSystem.update(deltaTime);
            vehicleSystem.update(deltaTime);
            environmentSystem.update(deltaTime);
            gameModeSystem.update(deltaTime);
            networkPredictionSystem.update(deltaTime);
            cameraSystem.update(deltaTime);
            effectSystem.update(deltaTime);
            renderSystem.update(deltaTime);
        },

        cleanup: () => {
            sceneSystem.dispose();
            physicsWorldSystem.dispose();
            inputSystem.cleanup();
            effectSystem.cleanup();
            
            // Clean up all vehicles
            const vehicles = ecsWorld.with("drone", "plane");
            for (const vehicle of vehicles) {
                vehicleSystem.cleanup(vehicle);
            }
            
            networkPredictionSystem.cleanup();
        }
    };
} 