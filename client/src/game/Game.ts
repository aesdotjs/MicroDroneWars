import { State } from './schemas/State';
import { Flag as FlagSchema } from './schemas/Flag';
import { Vehicle as VehicleSchema } from './schemas/Vehicle';
import { PhysicsState } from '@shared/physics/types';
import * as Colyseus from 'colyseus.js';
import { Engine, Vector3, Quaternion } from 'babylonjs';
import { GameScene } from './GameScene';
import { PhysicsInput } from '@shared/physics/types';
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
            this.setupRoomHandlers();
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
        // Update server tick when state changes
        $(this.room.state).onChange(() => {
            if (this.room?.state.serverTick) {
                this.gameScene.getPhysicsWorld().updateServerTick(this.room.state.serverTick);
            }
        });

        // Add latency measurement with smoothing
        let smoothedLatency = 0;
        const smoothingFactor = 0.1;
        const minLatency = 5;

        this.room.onMessage("pong", (timestamp) => {
            const rtt = performance.now() - timestamp;
            const oneWayLatency = Math.max(minLatency, rtt / 2);
            
            smoothedLatency = smoothedLatency === 0 
                ? oneWayLatency 
                : smoothingFactor * oneWayLatency + (1 - smoothingFactor) * smoothedLatency;

            this.gameScene.getPhysicsWorld().updateNetworkLatency(smoothedLatency);
        });
        this.room.send("ping", performance.now());
        // Send ping every second
        this.pingInterval = setInterval(() => {
            if (this.room) {
                this.room.send("ping", performance.now());
            }
        }, 1000);

        // Handle vehicle updates
        $(this.room.state).vehicles.onAdd((vehicle: VehicleSchema, sessionId: string) => {
            console.log('Vehicle added to room:', { vehicle,sessionId, vehicleType: vehicle.vehicleType, team: vehicle.team });
            
            this.gameScene.createVehicle(sessionId, vehicle);
            // Listen for vehicle updates
            $(vehicle).onChange(() => {
                const updatedState: PhysicsState = {
                    position: new Vector3(vehicle.positionX, vehicle.positionY, vehicle.positionZ),
                    quaternion: new Quaternion(vehicle.quaternionX, vehicle.quaternionY, vehicle.quaternionZ, vehicle.quaternionW),
                    linearVelocity: new Vector3(vehicle.linearVelocityX, vehicle.linearVelocityY, vehicle.linearVelocityZ),
                    angularVelocity: new Vector3(vehicle.angularVelocityX, vehicle.angularVelocityY, vehicle.angularVelocityZ),
                    tick: vehicle.tick,
                    timestamp: vehicle.timestamp
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