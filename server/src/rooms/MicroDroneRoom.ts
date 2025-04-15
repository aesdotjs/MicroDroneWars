import { Room, Client } from "colyseus";
import { State, Drone, Plane, Flag } from "../schemas";
import { ServerPhysicsWorld } from "../physics/ServerPhysicsWorld";
import { VehiclePhysicsConfig, PhysicsInput } from "@shared/physics/types";

export class MicroDroneRoom extends Room<State> {
    private physicsWorld!: ServerPhysicsWorld;

    onCreate(options: Record<string, any>) {
        this.state = new State();
        console.log("MicroDrone room created");

        // Set room options for faster connection
        this.patchRate = 1000 / 60; // 60 updates per second
        this.autoDispose = false; // Keep room alive even when empty
        this.maxClients = 20; // Set a reasonable max clients

        // Initialize physics world
        this.physicsWorld = new ServerPhysicsWorld();

        // Initialize flags
        const teamAFlag = new Flag();
        teamAFlag.team = 0;
        teamAFlag.x = -20;
        teamAFlag.z = 0;
        this.state.flags.set("teamA", teamAFlag);

        const teamBFlag = new Flag();
        teamBFlag.team = 1;
        teamBFlag.x = 20;
        teamBFlag.z = 0;
        this.state.flags.set("teamB", teamBFlag);

        // Set up message handlers
        this.onMessage("movement", (client, data: PhysicsInput) => {
            const vehicle = this.state.vehicles.get(client.sessionId);
            if (vehicle) {
                // Add input to queue with current server tick
                data.tick = this.physicsWorld.getCurrentTick();
                vehicle.inputQueue.push(data);
                
                // Keep queue size reasonable (about 1 second of inputs)
                if (vehicle.inputQueue.length > 60) {
                    vehicle.inputQueue.shift();
                }
            }
        });

        // Add ping/pong handlers
        this.onMessage("ping", (client, timestamp) => {
            client.send("pong", timestamp);
        });

        // Handle player leaving
        this.onMessage('playerLeft', (client) => {
            console.log(`Player ${client.sessionId} left the game`);
            this.onLeave(client);
        });
        this.state.serverTick = this.physicsWorld.getCurrentTick();
        // Set up fixed tick rate simulation
        this.setSimulationInterval((deltaTime) => {
            // Convert deltaTime to seconds and update physics
            this.physicsWorld.update(deltaTime / 1000, this.state);
            // Update server tick in state
            this.state.serverTick = this.physicsWorld.getCurrentTick();
        });
    }

    onJoin(client: Client, options: { vehicleType: "drone" | "plane", team: number }) {
        console.log(`Client ${client.sessionId} joining with options:`, options);
        
        // Create vehicle based on type
        let vehicle;
        if (options.vehicleType === "drone") {
            vehicle = new Drone();
        } else {
            vehicle = new Plane();
        }

        // Set initial position based on team
        vehicle.team = options.team;
        // Use team-based spawn points
        vehicle.positionX = 0;
        vehicle.positionY = 10;
        vehicle.positionZ = 0;
        vehicle.vehicleType = options.vehicleType;

        // Create physics controller for the vehicle
        const config: VehiclePhysicsConfig = {
            vehicleType: options.vehicleType,
            mass: 50,
            drag: 0.8,
            angularDrag: 0.8,
            maxSpeed: 20,
            maxAngularSpeed: 0.2,
            maxAngularAcceleration: 0.05,
            angularDamping: 0.9,
            forceMultiplier: 0.005,
            thrust: options.vehicleType === "drone" ? 20 : 30,
            lift: options.vehicleType === "drone" ? 15 : 12,
            torque: options.vehicleType === "drone" ? 1 : 2,
        };
        
        // Create vehicle and add to state
        this.physicsWorld.createVehicle(client.sessionId, vehicle);
        this.state.vehicles.set(client.sessionId, vehicle);
        
        console.log(`Vehicle created for ${client.sessionId}:`, {
            type: options.vehicleType,
            team: options.team,
            position: { x: vehicle.positionX, y: vehicle.positionY, z: vehicle.positionZ }
        });
    }

    onLeave(client: Client) {
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
        console.log(`Vehicle left: ${client.sessionId}`);
    }

    onDispose() {
        // Clean up physics world
        this.physicsWorld.dispose();
    }
}