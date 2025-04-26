import { Room, Client } from "colyseus";
import { ArraySchema } from "@colyseus/schema";
import { State, EntitySchema, WeaponSchema } from "../schemas";
import { createPhysicsWorldSystem } from "@shared/ecs/systems/PhysicsWorldSystem";
import { createPhysicsSystem } from "@shared/ecs/systems/PhysicsSystem";
import { GameEntity, InputComponent } from "@shared/ecs/types";
import { DefaultWeapons } from "@shared/ecs/types";
import { Vector3, Quaternion } from "babylonjs";
import { world as ecsWorld } from "@shared/ecs/world";
import { createStateSyncSystem } from "src/ecs/systems/StateSyncSystem";
import { createHealthSystem } from "@shared/ecs/systems/HealthSystems";
import { createFlagSystem } from "@shared/ecs/systems/FlagSystems";
import { createInputSystem } from "../ecs/systems/InputSystems";
import { createCollisionSystem } from "@shared/ecs/systems/CollisionSystems";
import { createEnvironmentSystem } from "@shared/ecs/systems/EnvironmentSystems";
import { createGameModeSystem, GameMode, GameModeConfig } from "../ecs/systems/GameModeSystem";
import { createClientSystem } from "../ecs/systems/ClientSystem";

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
    private collisionSystem!: ReturnType<typeof createCollisionSystem>;
    private environmentSystem!: ReturnType<typeof createEnvironmentSystem>;
    private gameModeSystem!: ReturnType<typeof createGameModeSystem>;
    private clientSystem!: ReturnType<typeof createClientSystem>;

    /**
     * Initializes the game room when it's created.
     * Sets up room options, physics world, flags, and message handlers.
     * @param options - Room creation options
     */
    onCreate(options: Record<string, any>) {
        this.state = new State();
        console.log("MicroDrone room created");

        this.autoDispose = false; // Keep room alive even when empty
        this.maxClients = 20; // Set a reasonable max clients

        /**
         * Generates a unique entity ID
         * @returns A unique entity ID
         */
        const generateEntityId = (): string => {
            const id = `entity_${this.state.nextEntityId++}`;
            return id;
        }

        // Initialize physics world system
        this.physicsWorldSystem = createPhysicsWorldSystem();
        this.state.serverTick = this.physicsWorldSystem.getCurrentTick();

        // Initialize physics system
        this.physicsSystem = createPhysicsSystem(this.physicsWorldSystem.getWorld());

        // Initialize ECS systems
        this.stateSyncSystem = createStateSyncSystem(this.state);
        this.healthSystem = createHealthSystem();
        this.flagSystem = createFlagSystem();
        this.inputSystem = createInputSystem(this.physicsSystem);
        this.collisionSystem = createCollisionSystem(this.physicsWorldSystem.getWorld());
        this.environmentSystem = createEnvironmentSystem(this.physicsWorldSystem.getWorld());
        this.clientSystem = createClientSystem(this.physicsWorldSystem, this.stateSyncSystem, this.inputSystem, generateEntityId);

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
        this.gameModeSystem = createGameModeSystem(this.physicsWorldSystem, this.stateSyncSystem, generateEntityId, gameModeConfig);
        this.gameModeSystem.initialize();

        // Set room options for faster connection
        this.patchRate = 1000 / this.TICK_RATE; // 60 updates per second
        this.setSimulationInterval((deltaTime) => {
            this.update(deltaTime);
        }, 1000 / this.TICK_RATE);

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
    }

    /**
     * Handles a new player joining the room.
     * Creates a vehicle based on the player's chosen type and team.
     * @param client - The client joining the room
     * @param options - Player options including vehicle type and team
     */
    onJoin(client: Client, options: { vehicleType: "drone" | "plane", team: number }) {
        this.clientSystem.handleJoin(client, options);
    }



    /**
     * Handles a player leaving the room.
     * Returns any carried flag to base and cleans up the player's vehicle.
     * @param client - The client leaving the room
     */
    onLeave(client: Client) {
        this.clientSystem.handleLeave(client);
    }

    /**
     * Cleans up resources when the room is disposed.
     * Currently handles physics world cleanup.
     */
    onDispose() {
        // Clean up physics world
        this.physicsWorldSystem.dispose();
    }

    private update(deltaTime: number) {
        // Run ECS systems in the correct order
        this.inputSystem.update(1 / this.TICK_RATE);
        this.physicsWorldSystem.update(1 / this.TICK_RATE);
        // Update server tick in state
        this.state.serverTick = this.physicsWorldSystem.getCurrentTick();
        this.collisionSystem.update(1 / this.TICK_RATE);
        this.healthSystem.update(1 / this.TICK_RATE);
        this.flagSystem.update(1 / this.TICK_RATE);
        this.environmentSystem.update(1 / this.TICK_RATE);
        this.gameModeSystem.update(1 / this.TICK_RATE);
        
        // Sync ECS state to Colyseus state
        this.stateSyncSystem.update(Array.from(ecsWorld.entities));
    }
}