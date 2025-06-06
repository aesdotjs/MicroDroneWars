import { State } from '@shared/schemas';
import { InputComponent, VehicleType } from '@shared/ecs/types';
import * as Colyseus from 'colyseus.js';
import { Engine } from '@babylonjs/core';
import { useGameDebug } from '@/composables/useGameDebug';
import { createGameSystems } from './ecs/systems/GameSystems';
import initRapier3D from '@shared/utils/init-rapier3d';
// import "@babylonjs/loaders/glTF";
import '@babylonjs/loaders/glTF/2.0/Extensions/ExtrasAsMetadata';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_lights_punctual';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';

const { log } = useGameDebug();

await initRapier3D();

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
    private vehicleType!: VehicleType;
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
        this.vehicleType = typeParam === 'plane' ? VehicleType.Plane : VehicleType.Drone;

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
    public getNetworkStats(): { latency: number; quality: number; jitter: number } {
        return this.gameSystems?.networkSystem.getNetworkStats() ?? {
            latency: 0,
            quality: 1.0,
            jitter: 0
        };
    }

    /**
     * Sets the debug mode
     */
    public setDebugMode(value: boolean): void {
        if (!this.gameSystems) return;
        this.gameSystems.setDebugMode(value);
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