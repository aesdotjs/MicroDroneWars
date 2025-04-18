import { State } from './schemas/State';
import { Flag as FlagSchema } from './schemas/Flag';
import { Vehicle as VehicleSchema } from './schemas/Vehicle';
import { PhysicsState, PhysicsInput } from '@shared/physics/types';
import * as Colyseus from 'colyseus.js';
import { Engine, Vector3, Quaternion } from 'babylonjs';
import { GameScene } from './GameScene';
import { Flag } from './Flag';
import { useGameDebug } from '@/composables/useGameDebug';

const { log } = useGameDebug();

/**
 * Main game class that manages the game loop, networking, and scene.
 * Handles connection to the server, vehicle creation, and game state updates.
 */
export class Game {
    /** The canvas element for rendering */
    private canvas!: HTMLCanvasElement;
    /** The Babylon.js engine */
    private engine!: Engine;
    /** The game scene */
    private gameScene!: GameScene;
    /** The Colyseus client for networking */
    private client!: Colyseus.Client;
    /** The current game room */
    private room: Colyseus.Room<State> | null = null;
    /** The player's team number */
    private team!: number;
    /** The player's vehicle type */
    private vehicleType!: 'drone' | 'plane';
    /** The interval for sending ping messages */
    private pingInterval: NodeJS.Timeout | null = null;
    private networkStats = {
        latency: 0,
        jitter: 0,
        quality: 1.0
    };
    private readonly PING_INTERVAL = 1000;
    private readonly MIN_LATENCY = 5;
    private readonly LATENCY_SMOOTHING = 0.1;
    private readonly QUALITY_SAMPLES = 20;
    private qualitySamples: number[] = [];

    /**
     * Creates a new Game instance.
     * Initializes the engine, scene, and connects to the server.
     */
    constructor() {
        // Get the canvas element
        const canvasElement = document.getElementById('renderCanvas');
        if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
            console.error('Canvas element not found or is not a canvas!');
            return;
        }
        this.canvas = canvasElement;

        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const teamParam = urlParams.get('team');
        const typeParam = urlParams.get('type');
        
        // Set team (default to team 0 if not specified)
        this.team = teamParam === '1' ? 1 : 0;
        
        // Set vehicle type (default to drone if not specified)
        this.vehicleType = typeParam === 'plane' ? 'plane' : 'drone';

        // Initialize the engine
        this.engine = new Engine(this.canvas, true);
        
        // Create the game scene with the engine
        this.gameScene = new GameScene(this.engine, this);

        // Connect to the server
        this.client = new Colyseus.Client('ws://localhost:2567');
        // Join the game room
        this.joinRoom();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        // Start the render loop
        console.log('Starting render loop...');
        this.engine.runRenderLoop(() => {
            if (this.gameScene) {
                this.gameScene.render();
            }
        });
    }

    /**
     * Joins or creates a game room.
     * Sets up room handlers after successful connection.
     */
    private async joinRoom(): Promise<void> {
        try {
            this.room = await this.client.joinOrCreate<State>("microdrone_room", { 
                vehicleType: this.vehicleType, 
                team: this.team 
            });
            console.log("Joined room:", this.room, "Team:", this.team, "Vehicle Type:", this.vehicleType);
            this.room.onStateChange.once(() => {
                console.log("Got initial serverTick:", this.room!.state.serverTick);
                this.setupRoomHandlers();
            });
        } catch (err) {
            console.error("Error joining room:", err);
        }
    }

    /**
     * Sets up handlers for room events and state changes.
     * Handles vehicle and flag updates, and network latency measurement.
     */
    private setupRoomHandlers(): void {
        if (!this.room) return;
        const $ = Colyseus.getStateCallbacks(this.room);
        this.gameScene.getPhysicsWorld().initializeTick(this.room.state.serverTick);
        // Handle network quality measurements
        this.room.onMessage("pong", (data: { clientTime: number, serverTime: number, latency: number }) => {
            const now = Date.now();
            const rtt = now - data.clientTime;
            const oneWayLatency = Math.max(this.MIN_LATENCY, rtt / 2); // Divide by 2 for one-way latency
            const jitter = Math.abs(rtt/2 - oneWayLatency);
            
            // Update network stats with smoothing
            this.networkStats.latency = this.networkStats.latency === 0 
                ? oneWayLatency 
                : this.LATENCY_SMOOTHING * oneWayLatency + (1 - this.LATENCY_SMOOTHING) * this.networkStats.latency;
            
            this.networkStats.jitter = this.networkStats.jitter === 0
                ? jitter
                : this.LATENCY_SMOOTHING * jitter + (1 - this.LATENCY_SMOOTHING) * this.networkStats.jitter;


            // Update network quality
            const latencyScore = Math.max(0, 1 - (oneWayLatency / 500));
            const jitterScore = Math.max(0, 1 - (jitter / 100));
            const qualityScore = (latencyScore + jitterScore) / 2;

            this.qualitySamples.push(qualityScore);
            if (this.qualitySamples.length > this.QUALITY_SAMPLES) {
                this.qualitySamples.shift();
            }

            this.networkStats.quality = this.qualitySamples.reduce((a, b) => a + b, 0) / 
                                      this.qualitySamples.length;

            // Update physics world with network stats
            this.gameScene.getPhysicsWorld().updateNetworkLatency(this.networkStats.latency);
            this.gameScene.getPhysicsWorld().updateNetworkQuality(this.networkStats.quality);
            this.gameScene.getPhysicsWorld().updateNetworkJitter(this.networkStats.jitter);

            log('Network Stats', {
                latency: this.networkStats.latency.toFixed(2),
                jitter: this.networkStats.jitter.toFixed(2),
                quality: this.networkStats.quality.toFixed(2)
            });
        });

        // Start ping measurements
        this.room.send("ping", Date.now());
        this.pingInterval = setInterval(() => {
            if (this.room) {
                this.room.send("ping", Date.now());
            }
        }, this.PING_INTERVAL);

        // Handle vehicle updates
        $(this.room.state).vehicles.onAdd((vehicle: VehicleSchema, sessionId: string) => {
            console.log('Vehicle added to room:', { vehicle, sessionId, vehicleType: vehicle.vehicleType, team: vehicle.team });
            
            this.gameScene.createVehicle(sessionId, vehicle);
            // Listen for vehicle updates
            $(vehicle).onChange(() => {
                const updatedState: PhysicsState = {
                    position: new Vector3(vehicle.positionX, vehicle.positionY, vehicle.positionZ),
                    quaternion: new Quaternion(vehicle.quaternionX, vehicle.quaternionY, vehicle.quaternionZ, vehicle.quaternionW),
                    linearVelocity: new Vector3(vehicle.linearVelocityX, vehicle.linearVelocityY, vehicle.linearVelocityZ),
                    angularVelocity: new Vector3(vehicle.angularVelocityX, vehicle.angularVelocityY, vehicle.angularVelocityZ),
                    tick: vehicle.tick,
                    timestamp: vehicle.timestamp,
                    lastProcessedInputTimestamp: vehicle.lastProcessedInputTimestamp,
                    lastProcessedInputTick: vehicle.lastProcessedInputTick
                };
                // Add vehicle state to the physics world
                this.gameScene.getPhysicsWorld().addVehicleState(sessionId, updatedState);
            });
        });

        $(this.room.state).vehicles.onRemove((_vehicle: VehicleSchema, sessionId: string) => {
            console.log('Vehicle removed:', sessionId);
            this.gameScene.removeVehicle(sessionId);
        });

        // Handle flag updates
        $(this.room.state).flags.onAdd((flag: FlagSchema, flagId: string) => {
            console.log('Flag added:', flagId);
            const gameFlag = new Flag(this.gameScene.getScene(), flag.team);
            gameFlag.setPosition(new Vector3(flag.x, flag.y, flag.z));
            gameFlag.carriedBy = flag.carriedBy;
            gameFlag.atBase = flag.atBase;
            this.gameScene.addFlag(flag.team, gameFlag);
            
            $(flag).onChange(() => {
                const existingFlag = this.gameScene.getFlag(flag.team);
                if (existingFlag) {
                    existingFlag.setPosition(new Vector3(flag.x, flag.y, flag.z));
                    existingFlag.carriedBy = flag.carriedBy;
                    existingFlag.atBase = flag.atBase;
                }
            });
        });

        $(this.room.state).flags.onRemove((flag: FlagSchema, flagId: string) => {
            console.log('Flag removed:', flagId);
            this.gameScene.removeFlag(flag.team);
        });
    }

    /**
     * Sends movement input to the server.
     * @param input - The physics input to send
     */
    public sendMovementUpdate(input: PhysicsInput): void {
        if (!this.room) return;
        input.timestamp = Date.now();
        this.room.send('movement', input);
    }

    /**
     * Stops the ping interval.
     */
    public stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Gets the current game room.
     * @returns The current game room
     */
    public getRoom(): Colyseus.Room<State> | null {
        return this.room;
    }

    /**
     * Gets the game scene.
     * @returns The game scene
     */
    public getGameScene(): GameScene {
        return this.gameScene;
    }

    /**
     * Gets the canvas element.
     * @returns The canvas element
     */
    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    public getNetworkStats() {
        return this.networkStats;
    }

    /**
     * Cleans up resources.
     */
    public async cleanup(): Promise<void> {
        console.log('Cleaning up game');
        this.stopPing();
        this.gameScene.dispose();
        await this.room?.leave();
    }
}