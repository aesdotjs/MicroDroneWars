import { Room, Client } from "colyseus";
import { ArraySchema, entity } from "@colyseus/schema";
import { State, EntitySchema, WeaponSchema } from "@shared/schemas";
import { createPhysicsWorldSystem } from "@shared/ecs/systems/PhysicsWorldSystem";
import { createPhysicsSystem } from "@shared/ecs/systems/PhysicsSystem";
import { GameEntity, InputComponent, VehicleType, EntityType } from "@shared/ecs/types";
import { DefaultWeapons } from "@shared/ecs/types";
import { Vector3, Quaternion, NullEngine, Scene } from '@babylonjs/core';
import { world as ecsWorld, world } from "@shared/ecs/world";
import { createStateSyncSystem } from "src/ecs/systems/StateSyncSystem";
import { createHealthSystem } from "@shared/ecs/systems/HealthSystems";
import { createFlagSystem } from "@shared/ecs/systems/FlagSystems";
import { createInputSystem } from "../ecs/systems/InputSystems";
import { createGameModeSystem, GameMode, GameModeConfig } from "../ecs/systems/GameModeSystem";
import { createAssetSystem } from "@shared/ecs/systems/AssetSystem";
import { createEntitySystem } from "@shared/ecs/systems/EntitySystem";
import { createWeaponSystem } from "@shared/ecs/systems/WeaponSystem";
import { createProjectileSystem } from "src/ecs/systems/ProjectileSystem";
// import * as xhr2 from "xhr2";
import '@babylonjs/loaders/glTF/2.0/Extensions/ExtrasAsMetadata';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_lights_punctual';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
(global as any).XMLHttpRequest = require("xhr2");
/**
 * Represents a game room for MicroDroneWars multiplayer matches.
 * Handles player connections, game state, and physics simulation.
 * @extends Room<State>
 */
export class MicroDroneRoom extends Room<State> {
    private physicsWorldSystem!: ReturnType<typeof createPhysicsWorldSystem>;
    private physicsSystem!: ReturnType<typeof createPhysicsSystem>;
    private readonly TICK_RATE = 60;
    private readonly MAX_LATENCY = 1000; // 1 second max latency
    private clientLatencies: Map<string, number> = new Map();
    private stateSyncSystem!: ReturnType<typeof createStateSyncSystem>;
    private healthSystem!: ReturnType<typeof createHealthSystem>;
    private flagSystem!: ReturnType<typeof createFlagSystem>;
    private inputSystem!: ReturnType<typeof createInputSystem>;
    private gameModeSystem!: ReturnType<typeof createGameModeSystem>;
    private assetSystem!: ReturnType<typeof createAssetSystem>;
    private entitySystem!: ReturnType<typeof createEntitySystem>;
    private weaponSystem!: ReturnType<typeof createWeaponSystem>;
    private projectileSystem!: ReturnType<typeof createProjectileSystem>;
    private accumulatedTime: number = 0;
    private isRunning: boolean = true;
    private serverEngine: NullEngine = new NullEngine();
    private serverScene: Scene = new Scene(this.serverEngine);
    private isInitializing: boolean = false;

    /**
     * Initializes the game room when it's created.
     * Sets up room options, physics world, flags, and message handlers.
     * @param options - Room creation options
     */
    async onCreate(options: Record<string, any>) {
        this.state = new State();
        console.log("MicroDrone room created");

        this.autoDispose = false; // Keep room alive even when empty
        this.maxClients = 20; // Set a reasonable max clients

        // Initialize server-side Babylon.js engine and scene
        this.serverEngine = new NullEngine();
        this.serverScene = new Scene(this.serverEngine);
        this.serverScene.useRightHandedSystem = true;
        /**
         * Generates a unique entity ID
         * @returns A unique entity ID
         */
        const generateEntityId = (): string => {
            const id = `entity_${this.state.nextEntityId++}`;
            return id;
        }

        // Initialize physics world system
        this.physicsWorldSystem = await createPhysicsWorldSystem();
        
        // Initialize weapon system
        this.weaponSystem = createWeaponSystem(this.physicsWorldSystem, true);

        // Initialize physics system
        this.physicsSystem = createPhysicsSystem(this.physicsWorldSystem);

        // Initialize entity system
        this.entitySystem = createEntitySystem();

        // Initialize input system
        this.inputSystem = createInputSystem(this.physicsSystem, this.physicsWorldSystem, this.weaponSystem);

        // Initialize state sync system
        this.stateSyncSystem = createStateSyncSystem(this.state, this.inputSystem, this.physicsWorldSystem);
        this.state.serverTick = this.physicsWorldSystem.getCurrentTick();

        // Initialize ECS systems
        this.healthSystem = createHealthSystem();
        this.projectileSystem = createProjectileSystem(this.physicsWorldSystem);
        this.flagSystem = createFlagSystem();
        this.assetSystem = createAssetSystem(this.serverEngine, this.serverScene, this.physicsWorldSystem, true);
        // this.assetSystem.preloadAssets();

        // Initialize game mode system
        const gameModeConfig: GameModeConfig = {
            mode: GameMode.CTF,
            teamCount: 2,
            maxPlayers: 20,
            timeLimit: 600, // 10 minutes
            scoreLimit: 3,
            map: {
                path: "http://localhost:2568/assets/maps/CTF-test.glb",
                type: "glb",
                scale: 1
            }
        };

        this.gameModeSystem = createGameModeSystem(
            this.physicsWorldSystem,
            this.stateSyncSystem,
            this.entitySystem,
            this.assetSystem,
            generateEntityId,
            gameModeConfig
        );

        // Start initialization in the background
        this.initializeGameMode();

        // Set room options for faster connection
        const NS_PER_SEC = 1e9;
        const NS_PER_TICK = NS_PER_SEC / this.TICK_RATE;
        let lastTime = process.hrtime();

        const step = () => {
            if (!this.isRunning) return;

            const now = process.hrtime();
            const diff = process.hrtime(lastTime);
            const deltaTime = (diff[0] * NS_PER_SEC + diff[1]) / NS_PER_SEC;
            lastTime = now;

            // Run ECS systems in the correct order
            this.assetSystem.update(1 / this.TICK_RATE);
            this.physicsSystem.update(1 / this.TICK_RATE);
            this.weaponSystem.update(1 / this.TICK_RATE);
            this.inputSystem.update(1 / this.TICK_RATE);
            this.healthSystem.update(1 / this.TICK_RATE);
            this.flagSystem.update(1 / this.TICK_RATE);
            this.projectileSystem.update(1 / this.TICK_RATE);
            this.gameModeSystem.update(1 / this.TICK_RATE);
            // Step physics world system
            this.physicsWorldSystem.update(1 / this.TICK_RATE);
            // Update server tick in state
            this.state.serverTick = this.physicsWorldSystem.getCurrentTick();
                
            // Sync ECS state to Colyseus state
            this.stateSyncSystem.update();
            this.broadcastPatch();

            // Calculate time taken by this tick
            const tickDiff = process.hrtime(lastTime);
            const tickTime = tickDiff[0] * NS_PER_SEC + tickDiff[1];

            // If we're running too fast, sleep for the remaining time
            if (tickTime < NS_PER_TICK) {
                const sleepTime = NS_PER_TICK - tickTime;
                const end = process.hrtime.bigint() + BigInt(Math.floor(sleepTime));
                while (process.hrtime.bigint() < end) {
                    // Busy wait
                }
            }

            // Use setImmediate for the next frame
            setImmediate(step);
        };

        // Start the game loop
        step();
        // Set up message handlers
        this.onMessage("command", (client, input: InputComponent) => {
            // Validate input timestamp - convert to milliseconds if needed
            const now = Date.now();
            const inputTime = typeof input.timestamp === 'number' ? input.timestamp : now;
            const latency = this.clientLatencies.get(client.sessionId) || 0;
            const maxAge = (this.MAX_LATENCY + latency);
            
            // Only drop inputs that are truly old
            if (now - inputTime > maxAge) {
                console.log(`Dropping old input from ${client.sessionId}, age: ${now - inputTime}ms`);
                return;
            }

            this.inputSystem.addInput(client.sessionId, input);
        });

        // Add ping/pong handlers for latency measurement
        this.onMessage("ping", (client, timestamp) => {
            const latency = (Date.now() - timestamp) / 2;
            this.clientLatencies.set(client.sessionId, latency);
            client.send("pong", {
                clientTime: timestamp,
                serverTime: Date.now(),
                latency
            });
        });

        // Handle player leaving
        this.onMessage('playerLeft', (client) => {
            console.log(`Player ${client.sessionId} left the game`);
            this.onLeave(client);
        });

        // handle entity removal
        world.onEntityRemoved.subscribe((entity) => {
            if (entity.physics?.body) {
                this.physicsWorldSystem.removeBody(entity.id);
            }
            this.stateSyncSystem.removeEntity(entity);
        });
    }

    /**
     * Initializes the game mode in the background
     */
    private async initializeGameMode() {
        if (this.isInitializing) return;
        this.isInitializing = true;

        try {
            await this.gameModeSystem.initialize();
            console.log("Game mode initialized successfully");
        } catch (error) {
            console.error("Failed to initialize game mode:", error);
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Handles a new player joining the room.
     * Creates a vehicle based on the player's chosen type and team.
     * @param client - The client joining the room
     * @param options - Player options including vehicle type and team
     */
    onJoin(client: Client, options: { vehicleType: VehicleType, team: number }) {
        // Spawn the vehicle using the game mode system
        this.gameModeSystem.spawnVehicle(options.vehicleType, options.team, client.sessionId);
    }

    /**
     * Handles a player leaving the room.
     * Returns any carried flag to base and cleans up the player's vehicle.
     * @param client - The client leaving the room
     */
    onLeave(client: Client) {
        console.log(`Client ${client.sessionId} leaving`);
            
        // Clean up input system
        this.inputSystem.cleanup(client.sessionId);

        // Remove all entities owned by this client
        const ecsEntities = ecsWorld.with("owner").where(({owner}) => owner.id === client.sessionId);
        console.log('Cleaning up entities for client:', client.sessionId, ecsEntities.size);
        for (const entity of ecsEntities) {
            ecsWorld.remove(entity);
        }
    }

    /**
     * Cleans up resources when the room is disposed.
     * Currently handles physics world cleanup.
     */
    onDispose() {
        // Stop the game loop
        this.isRunning = false;
        
        // Clean up physics world
        this.physicsWorldSystem.dispose();
        
        // Clean up asset system
        this.assetSystem.cleanup();
        
        // Dispose server scene
        this.serverScene.dispose();
    }
}