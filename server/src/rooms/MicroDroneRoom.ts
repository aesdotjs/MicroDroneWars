import { Room, Client } from "colyseus";
import { ArraySchema } from "@colyseus/schema";
import { State, EntitySchema, Weapon } from "@shared/types/schemas";
import { createPhysicsWorldSystem } from "@shared/ecs/systems/PhysicsWorldSystem";
import { VehiclePhysicsConfig, PhysicsInput } from "@shared/ecs/types";
import { DefaultWeapons } from "@shared/physics/WeaponSystem";
import { Vector3, Quaternion } from "babylonjs";
import { world as ecsWorld } from "@shared/ecs/world";
import { createVehicleEntity, createFlagEntity } from "@shared/ecs/systems/ServerSystems";
import { createStateSyncSystem } from "@shared/ecs/systems/StateSyncSystem";
import { createWeaponSystem } from "@shared/ecs/systems/WeaponSystems";
import { createHealthSystem } from "@shared/ecs/systems/HealthSystems";
import { createFlagSystem } from "@shared/ecs/systems/FlagSystems";
import { createDroneSystem, createPlaneSystem } from "@shared/ecs/systems/VehicleSystems";
import { createInputSystem } from "@shared/ecs/systems/InputSystems";
import { createCollisionSystem } from "@shared/ecs/systems/CollisionSystems";
import { createEnvironmentSystem } from "@shared/ecs/systems/EnvironmentSystems";
import { createGameModeSystem, GameMode, GameModeConfig } from "@shared/ecs/systems/GameModeSystem";

/**
 * Represents a game room for MicroDroneWars multiplayer matches.
 * Handles player connections, game state, and physics simulation.
 * @extends Room<State>
 */
export class MicroDroneRoom extends Room<State> {
    private physicsWorldSystem!: ReturnType<typeof createPhysicsWorldSystem>;
    private readonly TICK_RATE = 60;
    private readonly MAX_LATENCY = 1000; // 1 second max latency
    private clientLatencies: Map<string, number> = new Map();
    private stateSyncSystem!: ReturnType<typeof createStateSyncSystem>;
    private weaponSystem!: ReturnType<typeof createWeaponSystem>;
    private healthSystem!: ReturnType<typeof createHealthSystem>;
    private flagSystem!: ReturnType<typeof createFlagSystem>;
    private droneSystem!: ReturnType<typeof createDroneSystem>;
    private planeSystem!: ReturnType<typeof createPlaneSystem>;
    private inputSystem!: ReturnType<typeof createInputSystem>;
    private collisionSystem!: ReturnType<typeof createCollisionSystem>;
    private environmentSystem!: ReturnType<typeof createEnvironmentSystem>;
    private gameModeSystem!: ReturnType<typeof createGameModeSystem>;

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

        // Initialize physics world system
        this.physicsWorldSystem = createPhysicsWorldSystem();
        this.state.serverTick = this.physicsWorldSystem.getCurrentTick();

        // Initialize ECS systems
        this.stateSyncSystem = createStateSyncSystem(this.state);
        this.weaponSystem = createWeaponSystem(this.physicsWorldSystem.getWorld());
        this.healthSystem = createHealthSystem();
        this.flagSystem = createFlagSystem();
        this.droneSystem = createDroneSystem(this.physicsWorldSystem.getWorld());
        this.planeSystem = createPlaneSystem(this.physicsWorldSystem.getWorld());
        this.inputSystem = createInputSystem();
        this.collisionSystem = createCollisionSystem(this.physicsWorldSystem.getWorld());
        this.environmentSystem = createEnvironmentSystem(this.physicsWorldSystem.getWorld());

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
        this.gameModeSystem = createGameModeSystem(gameModeConfig);
        this.gameModeSystem.initialize();

        // Set room options for faster connection
        this.patchRate = 1000 / this.TICK_RATE; // 60 updates per second
        this.setSimulationInterval((deltaTime) => {
            this.update(deltaTime);
        }, 1000 / this.TICK_RATE);

        // Initialize flags
        const teamAFlag = createFlagEntity("flag_teamA", 0, new Vector3(-20, 0, 0));
        const teamBFlag = createFlagEntity("flag_teamB", 1, new Vector3(20, 0, 0));
        
        // Add flags to ECS world
        ecsWorld.add(teamAFlag);
        ecsWorld.add(teamBFlag);

        // Add flags to Colyseus state
        const stateTeamAFlag = new EntitySchema();
        stateTeamAFlag.id = "flag_teamA";
        stateTeamAFlag.type = "flag";
        stateTeamAFlag.team = 0;
        stateTeamAFlag.positionX = -20;
        stateTeamAFlag.positionY = 0;
        stateTeamAFlag.positionZ = 0;
        this.state.entities.set("flag_teamA", stateTeamAFlag);

        const stateTeamBFlag = new EntitySchema();
        stateTeamBFlag.id = "flag_teamB";
        stateTeamBFlag.type = "flag";
        stateTeamBFlag.team = 1;
        stateTeamBFlag.positionX = 20;
        stateTeamBFlag.positionY = 0;
        stateTeamBFlag.positionZ = 0;
        this.state.entities.set("flag_teamB", stateTeamBFlag);

        // Set up message handlers
        this.onMessage("command", (client, input: PhysicsInput) => {
            const entity = this.state.entities.get(client.sessionId);
            if (entity) {
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
            }
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
     * Generates a unique entity ID
     * @returns A unique entity ID
     */
    private generateEntityId(): string {
        const id = `entity_${this.state.nextEntityId++}`;
        return id;
    }

    /**
     * Handles a new player joining the room.
     * Creates a vehicle based on the player's chosen type and team.
     * @param client - The client joining the room
     * @param options - Player options including vehicle type and team
     */
    onJoin(client: Client, options: { vehicleType: "drone" | "plane", team: number }) {
        console.log(`Client ${client.sessionId} joining with options:`, options);
        
        // Create vehicle entity in ECS world
        const spawnPos = new Vector3(0, 10, 0);
        const vehicleId = this.generateEntityId();
        const vehicleEntity = createVehicleEntity(
            vehicleId,
            options.vehicleType,
            spawnPos,
            options.team,
            this.physicsWorldSystem
        );
        ecsWorld.add(vehicleEntity);

        // Create vehicle in Colyseus state
        const vehicleState = new EntitySchema();
        vehicleState.id = vehicleId;
        vehicleState.type = options.vehicleType;
        vehicleState.team = options.team;
        vehicleState.positionX = spawnPos.x;
        vehicleState.positionY = spawnPos.y;
        vehicleState.positionZ = spawnPos.z;
        vehicleState.vehicleType = options.vehicleType;
        vehicleState.lastProcessedInputTimestamp = Date.now();
        vehicleState.lastProcessedInputTick = this.physicsWorldSystem.getCurrentTick();
        vehicleState.tick = this.physicsWorldSystem.getCurrentTick();
        
        // Initialize weapons
        Object.values(DefaultWeapons).forEach(weapon => {
            const w = new Weapon();
            w.id = weapon.id;
            w.name = weapon.name;
            w.projectileType = weapon.projectileType;
            w.damage = weapon.damage;
            w.fireRate = weapon.fireRate;
            w.projectileSpeed = weapon.projectileSpeed;
            w.cooldown = weapon.cooldown;
            w.range = weapon.range;
            w.isOnCooldown = false;
            w.lastFireTime = 0;
            vehicleState.weapons.push(w);
        });
        vehicleState.activeWeaponIndex = 0;
        
        // Add vehicle to state
        this.state.entities.set(vehicleId, vehicleState);
        
        console.log(`Vehicle created for ${client.sessionId}:`, {
            id: vehicleId,
            type: options.vehicleType,
            team: options.team,
            position: { x: vehicleState.positionX, y: vehicleState.positionY, z: vehicleState.positionZ }
        });
        console.log(`There are ${this.state.entities.size} entities in the room`);
    }

    /**
     * Handles a player leaving the room.
     * Returns any carried flag to base and cleans up the player's vehicle.
     * @param client - The client leaving the room
     */
    onLeave(client: Client) {
        // If vehicle was carrying a flag, return it to base
        const entity = this.state.entities.get(client.sessionId);
        if (entity && entity.hasFlag) {
            const flag = Array.from(this.state.entities.values()).find((e: EntitySchema) => e.carriedBy === client.sessionId);
            if (flag) {
                flag.carriedBy = "";
                flag.atBase = true;
                flag.positionX = flag.team === 0 ? -20 : 20;
                flag.positionY = 0;
                flag.positionZ = 0;
            }
        }

        this.inputSystem.cleanup(client.sessionId);

        // Remove entity from ECS world
        const ecsEntity = ecsWorld.entities.find(e => e.id === client.sessionId);
        if (ecsEntity) {
            ecsWorld.remove(ecsEntity);
        }

        this.state.entities.delete(client.sessionId);
        this.clientLatencies.delete(client.sessionId);
        console.log(`Vehicle left: ${client.sessionId}`);
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
        this.inputSystem.update(deltaTime);
        this.physicsWorldSystem.update(deltaTime);
        this.collisionSystem.update(deltaTime);
        this.weaponSystem.update(deltaTime);
        this.healthSystem.update(deltaTime);
        this.flagSystem.update(deltaTime);
        this.droneSystem.update(deltaTime);
        this.planeSystem.update(deltaTime);
        this.environmentSystem.update(deltaTime);
        this.gameModeSystem.update(deltaTime);
        
        // Sync ECS state to Colyseus state
        this.stateSyncSystem.update(Array.from(ecsWorld.entities));

        // Update server tick in state
        this.state.serverTick = this.physicsWorldSystem.getCurrentTick();
    }
}