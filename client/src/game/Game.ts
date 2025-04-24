import { State } from './schemas/';
import { PhysicsInput } from '@shared/ecs/types';
import * as Colyseus from 'colyseus.js';
import { Engine } from 'babylonjs';
import { useGameDebug } from '@/composables/useGameDebug';
import { createGameSystems } from './ecs/systems/GameSystems';

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
    /** The game systems */
    private gameSystems: ReturnType<typeof createGameSystems> | null = null;
    private readonly PING_INTERVAL = 1000;

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
            if (this.gameSystems) {
                const deltaTime = this.engine.getDeltaTime() / 1000; // Convert to seconds
                this.gameSystems.update(deltaTime);
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
                this.initializeGameSystems();
                this.startPingInterval();
            });
        } catch (err) {
            console.error("Error joining room:", err);
        }
    }

    /**
     * Initializes the game systems
     */
    private initializeGameSystems(): void {
        if (!this.room) return;

        this.gameSystems = createGameSystems(
            this.engine,
            this.room,
            this.canvas
        );

        // Initialize game mode
        this.gameSystems.gameModeSystem.initialize();
    }

    /**
     * Starts the ping interval
     */
    private startPingInterval(): void {
        if (!this.gameSystems) return;
        
        // Send initial ping
        this.gameSystems.networkSystem.sendPing();
        
        // Set up interval
        this.pingInterval = setInterval(() => {
            if (this.gameSystems) {
                this.gameSystems.networkSystem.sendPing();
            }
        }, this.PING_INTERVAL);
    }

    /**
     * Sends a command update to the server
     */
    public sendCommandUpdate(input: PhysicsInput): void {
        if (this.gameSystems) {
            this.gameSystems.networkSystem.sendCommand(input);
        }
    }

    /**
     * Stops the ping interval
     */
    public stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Gets the current game room
     */
    public getRoom(): Colyseus.Room<State> | null {
        return this.room;
    }

    /**
     * Gets the canvas element
     */
    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * Gets the current network stats
     */
    public getNetworkStats() {
        return this.gameSystems?.networkSystem.getNetworkStats() ?? {
            latency: 0,
            quality: 1.0,
            jitter: 0
        };
    }

    /**
     * Cleans up resources
     */
    public async cleanup(): Promise<void> {
        this.stopPing();
        if (this.gameSystems) {
            this.gameSystems.cleanup();
        }
        if (this.room) {
            await this.room.leave();
        }
    }
}