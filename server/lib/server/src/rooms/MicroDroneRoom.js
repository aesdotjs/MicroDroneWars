"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicroDroneRoom = void 0;
const colyseus_1 = require("colyseus");
const schemas_1 = require("../schemas");
const ServerPhysicsWorld_1 = require("../physics/ServerPhysicsWorld");
/**
 * Represents a game room for MicroDroneWars multiplayer matches.
 * Handles player connections, game state, and physics simulation.
 * @extends Room<State>
 */
class MicroDroneRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.TICK_RATE = 60;
        this.MAX_LATENCY = 1000; // 1 second max latency
        this.MAX_INPUTS_PER_TICK = 3;
        this.clientLatencies = new Map();
    }
    /**
     * Initializes the game room when it's created.
     * Sets up room options, physics world, flags, and message handlers.
     * @param options - Room creation options
     */
    onCreate(options) {
        this.state = new schemas_1.State();
        console.log("MicroDrone room created");
        this.autoDispose = false; // Keep room alive even when empty
        this.maxClients = 20; // Set a reasonable max clients
        // Initialize physics world
        this.physicsWorld = new ServerPhysicsWorld_1.ServerPhysicsWorld();
        this.state.serverTick = this.physicsWorld.getCurrentTick();
        // Set room options for faster connection
        //  this.patchRate = 1000 / this.TICK_RATE; // 60 updates per second
        this.setSimulationInterval((deltaTime) => {
            this.update(deltaTime);
            this.broadcastPatch();
        }, 1000 / this.TICK_RATE);
        // Initialize flags
        const teamAFlag = new schemas_1.Flag();
        teamAFlag.team = 0;
        teamAFlag.x = -20;
        teamAFlag.z = 0;
        this.state.flags.set("teamA", teamAFlag);
        const teamBFlag = new schemas_1.Flag();
        teamBFlag.team = 1;
        teamBFlag.x = 20;
        teamBFlag.z = 0;
        this.state.flags.set("teamB", teamBFlag);
        // Set up message handlers
        this.onMessage("movement", (client, input) => {
            const vehicle = this.state.vehicles.get(client.sessionId);
            if (vehicle) {
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
                // Store input for processing
                this.physicsWorld.addInput(client.sessionId, input);
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
     * Handles a new player joining the room.
     * Creates a vehicle based on the player's chosen type and team.
     * @param client - The client joining the room
     * @param options - Player options including vehicle type and team
     */
    onJoin(client, options) {
        console.log(`Client ${client.sessionId} joining with options:`, options);
        // Create vehicle based on type
        let vehicle;
        if (options.vehicleType === "drone") {
            vehicle = new schemas_1.Drone();
        }
        else {
            vehicle = new schemas_1.Plane();
        }
        // Set initial position based on team
        vehicle.team = options.team;
        // Use team-based spawn points
        vehicle.positionX = 0;
        vehicle.positionY = 10;
        vehicle.positionZ = 0;
        vehicle.vehicleType = options.vehicleType;
        vehicle.lastProcessedInputTimestamp = Date.now();
        vehicle.lastProcessedInputTick = this.physicsWorld.getCurrentTick();
        vehicle.tick = this.physicsWorld.getCurrentTick();
        // Create vehicle and add to state
        this.physicsWorld.createVehicle(client.sessionId, vehicle);
        this.state.serverTick = this.physicsWorld.getCurrentTick();
        this.state.vehicles.set(client.sessionId, vehicle);
        console.log(`Vehicle created for ${client.sessionId}:`, {
            type: options.vehicleType,
            team: options.team,
            position: { x: vehicle.positionX, y: vehicle.positionY, z: vehicle.positionZ }
        });
        //log how much vehicle in the room
        console.log(`There are ${this.state.vehicles.size} vehicles in the room`);
    }
    /**
     * Handles a player leaving the room.
     * Returns any carried flag to base and cleans up the player's vehicle.
     * @param client - The client leaving the room
     */
    onLeave(client) {
        // If vehicle was carrying a flag, return it to base
        const vehicle = this.state.vehicles.get(client.sessionId);
        if (vehicle && vehicle.hasFlag) {
            const flag = Array.from(this.state.flags.values()).find(f => f.carriedBy === client.sessionId);
            if (flag) {
                flag.carriedBy = null;
                flag.atBase = true;
                flag.x = flag.team === 0 ? -20 : 20;
                flag.z = 0;
            }
        }
        // Remove physics controller
        this.physicsWorld.removeVehicle(client.sessionId);
        this.state.vehicles.delete(client.sessionId);
        this.clientLatencies.delete(client.sessionId);
        console.log(`Vehicle left: ${client.sessionId}`);
    }
    /**
     * Cleans up resources when the room is disposed.
     * Currently handles physics world cleanup.
     */
    onDispose() {
        // Clean up physics world
        this.physicsWorld.dispose();
    }
    update(deltaTime) {
        // Convert deltaTime to seconds and update physics
        this.physicsWorld.update(deltaTime, this.state);
        // Update server tick in state
        this.state.serverTick = this.physicsWorld.getCurrentTick();
        // Update last processed input ticks for each vehicle (attention ???)
        this.state.vehicles.forEach((vehicle, id) => {
            vehicle.lastProcessedInputTimestamp = Date.now();
            vehicle.lastProcessedInputTick = this.physicsWorld.getCurrentTick();
        });
    }
}
exports.MicroDroneRoom = MicroDroneRoom;
