import { Room, Client } from "colyseus";
import { State, Drone, Plane, Flag } from "../schemas";
import { ServerPhysicsWorld } from "../physics/ServerPhysicsWorld";
import { VehiclePhysicsConfig, PhysicsInput } from "@shared/physics/types";

export class MicroDroneRoom extends Room<State> {
    private physicsWorld!: ServerPhysicsWorld;

    onCreate(options: Record<string, any>) {
        this.setState(new State());
        console.log("MicroDrone room created");

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
            this.physicsWorld.applyInput(client.sessionId, data);
        });

        // Handle player leaving
        this.onMessage('playerLeft', (client) => {
            console.log(`Player ${client.sessionId} left the game`);
            this.onLeave(client);
        });

        this.patchRate = 1000 / 60;

        // Set update interval (60fps)
        this.setSimulationInterval(() => this.update(), 1000 / 60);
    }

    onJoin(client: Client, options: { vehicleType: "drone" | "plane", team: number }) {
        // Create vehicle based on type
        let vehicle;
        if (options.vehicleType === "drone") {
            vehicle = new Drone();
        } else {
            vehicle = new Plane();
        }

        // Set initial position based on team
        vehicle.team = options.team;
        vehicle.positionX = options.team === 0 ? -15 : 15;
        vehicle.positionZ = 0;

        // Create physics controller for the vehicle
        const config: VehiclePhysicsConfig = {
            vehicleType: options.vehicleType,
            mass: 50,
            gravity: 9.81,
            drag: 0.8,
            angularDrag: 0.8,
            maxSpeed: 20,
            maxAngularSpeed: 0.2,
            maxAngularAcceleration: 0.05,
            angularDamping: 0.9,
            forceMultiplier: 0.005,
            thrust: options.vehicleType === "drone" ? 20 : 30,
            lift: options.vehicleType === "drone" ? 15 : 12,
            torque: options.vehicleType === "drone" ? 1 : 2
        };
        this.physicsWorld.createVehicle(client.sessionId, config);

        this.state.vehicles.set(client.sessionId, vehicle);
        console.log(`Vehicle joined: ${client.sessionId} (${options.vehicleType}, team ${options.team})`);
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

    update() {
        // Update physics world
        this.physicsWorld.update(1/60);

        // Update vehicle states from physics
        this.state.vehicles.forEach((vehicle, sessionId) => {
            const state = this.physicsWorld.getVehicleState(sessionId);
            if (state) {
                vehicle.positionX = state.position.x;
                vehicle.positionY = state.position.y;
                vehicle.positionZ = state.position.z;
                vehicle.quaternionX = state.quaternion.x;
                vehicle.quaternionY = state.quaternion.y;
                vehicle.quaternionZ = state.quaternion.z;
                vehicle.quaternionW = state.quaternion.w;
                vehicle.linearVelocityX = state.linearVelocity.x;
                vehicle.linearVelocityY = state.linearVelocity.y;
                vehicle.linearVelocityZ = state.linearVelocity.z;
            }
        });

        // Update flag positions if carried
        this.state.flags.forEach(flag => {
            if (flag.carriedBy) {
                const carrier = this.state.vehicles.get(flag.carriedBy);
                if (carrier) {
                    flag.x = carrier.positionX;
                    flag.y = carrier.positionY;
                    flag.z = carrier.positionZ;
                }
            }
        });
    }

    onDispose() {
        // Clean up physics world
        this.physicsWorld.dispose();
    }
}