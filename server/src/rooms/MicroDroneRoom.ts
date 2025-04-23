import { Room, Client } from "colyseus";
import { ArraySchema } from "@colyseus/schema";
import { State, Drone, Plane, Flag, Weapon, Projectile, Vehicle } from "../schemas/index";
import { ServerPhysicsWorld } from "../physics/ServerPhysicsWorld";
import { VehiclePhysicsConfig, PhysicsInput } from "@shared/physics/types";
import { DefaultWeapons } from "@shared/physics/WeaponSystem";
import { Vector3, Quaternion } from "babylonjs";

/**
 * Represents a game room for MicroDroneWars multiplayer matches.
 * Handles player connections, game state, and physics simulation.
 * @extends Room<State>
 */
export class MicroDroneRoom extends Room<State> {
    private physicsWorld!: ServerPhysicsWorld;
    private readonly TICK_RATE = 60;
    private readonly MAX_LATENCY = 1000; // 1 second max latency
    private readonly MAX_INPUTS_PER_TICK = 3;
    private clientLatencies: Map<string, number> = new Map();

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

        // Initialize physics world
        this.physicsWorld = new ServerPhysicsWorld();
        this.state.serverTick = this.physicsWorld.getCurrentTick();

         // Set room options for faster connection
         this.patchRate = 1000 / this.TICK_RATE; // 60 updates per second
         this.setSimulationInterval((deltaTime) =>  {
            this.update(deltaTime);
            this.broadcastPatch();
        }, 1000 / this.TICK_RATE);

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
        this.onMessage("command", (client, input: PhysicsInput) => {
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

                // Handle weapon switching
                if (input.nextWeapon) {
                    vehicle.activeWeaponIndex = (vehicle.activeWeaponIndex + 1) % vehicle.weapons.length;
                } else if (input.previousWeapon) {
                    vehicle.activeWeaponIndex = (vehicle.activeWeaponIndex - 1 + vehicle.weapons.length) % vehicle.weapons.length;
                } else if (input.weapon1) {
                    vehicle.activeWeaponIndex = 0;
                } else if (input.weapon2) {
                    vehicle.activeWeaponIndex = 1;
                } else if (input.weapon3) {
                    vehicle.activeWeaponIndex = 2;
                }

                // Handle weapon firing
                if (input.fire) {
                    this.handleFire(vehicle, client);
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
        vehicle.lastProcessedInputTimestamp = Date.now();
        vehicle.lastProcessedInputTick = this.physicsWorld.getCurrentTick();
        vehicle.tick = this.physicsWorld.getCurrentTick();
        
        // Initialize weapons
        const weapons = new ArraySchema<Weapon>();
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
            weapons.push(w);
        });
        vehicle.weapons = weapons;
        vehicle.activeWeaponIndex = 0;
        
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
    onLeave(client: Client) {
        // If vehicle was carrying a flag, return it to base
        const vehicle = this.state.vehicles.get(client.sessionId);
        if (vehicle && vehicle.hasFlag) {
            const flag = Array.from(this.state.flags.values()).find((f: Flag) => f.carriedBy === client.sessionId);
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

    private update(deltaTime: number) {
        // Convert deltaTime to seconds and update physics
        this.physicsWorld.update(deltaTime, this.state);
        // Update server tick in state
        this.state.serverTick = this.physicsWorld.getCurrentTick();

        // Update weapon cooldowns
        this.state.vehicles.forEach((vehicle: Vehicle) => {
            vehicle.weapons.forEach((weapon: Weapon) => {
                if (weapon.isOnCooldown) {
                    const timeSinceLastFire = Date.now() - weapon.lastFireTime;
                    if (timeSinceLastFire >= weapon.cooldown * 1000) {
                        weapon.isOnCooldown = false;
                    }
                }
            });
        });

        // Update projectiles
        this.state.projectiles.forEach((projectile: Projectile, id: string) => {
            // Convert deltaTime to seconds
            const deltaTimeSeconds = deltaTime / 1000;
            
            // Move projectile
            const direction = new Vector3(
                projectile.directionX,
                projectile.directionY,
                projectile.directionZ
            ).normalize();
            
            projectile.positionX += direction.x * projectile.speed * deltaTimeSeconds;
            projectile.positionY += direction.y * projectile.speed * deltaTimeSeconds;
            projectile.positionZ += direction.z * projectile.speed * deltaTimeSeconds;
            
            // Update distance traveled
            projectile.distanceTraveled += projectile.speed * deltaTimeSeconds;
            
            // Remove projectile if it exceeds range
            if (projectile.distanceTraveled >= projectile.range) {
                this.state.projectiles.delete(id);
            }
        });
    }

    private handleFire(vehicle: Vehicle, client: Client): void {
        const activeWeapon = vehicle.weapons[vehicle.activeWeaponIndex];
        if (activeWeapon && !activeWeapon.isOnCooldown) {
            // Calculate spread based on weapon type
            const spread = activeWeapon.projectileType === 'bullet' ? 0.01 : 0;
            const spreadX = (Math.random() - 0.5) * spread;
            const spreadY = (Math.random() - 0.5) * spread;
            const spreadZ = (Math.random() - 0.5) * spread;

            // Get vehicle's forward direction from quaternion
            const forward = new Vector3(0, 0, 1);
            const rotation = new Quaternion(
                vehicle.quaternionX,
                vehicle.quaternionY,
                vehicle.quaternionZ,
                vehicle.quaternionW
            );
            forward.rotateByQuaternionToRef(rotation, forward);

            // Create projectile
            const projectile = new Projectile();
            projectile.id = `${client.sessionId}_${Date.now()}`;
            projectile.type = activeWeapon.projectileType;
            projectile.positionX = vehicle.positionX;
            projectile.positionY = vehicle.positionY;
            projectile.positionZ = vehicle.positionZ;
            projectile.directionX = forward.x + spreadX;
            projectile.directionY = forward.y + spreadY;
            projectile.directionZ = forward.z + spreadZ;
            projectile.speed = activeWeapon.projectileSpeed;
            projectile.damage = activeWeapon.damage;
            projectile.range = activeWeapon.range;
            projectile.sourceId = client.sessionId;
            projectile.timestamp = Date.now();
            projectile.tick = this.physicsWorld.getCurrentTick();

            // Add projectile to state
            this.state.projectiles.set(projectile.id, projectile);

            // Set weapon cooldown
            activeWeapon.isOnCooldown = true;
            activeWeapon.lastFireTime = Date.now();
        }
    }
}