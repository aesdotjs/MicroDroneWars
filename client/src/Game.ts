import { State } from './schemas/State';
import { Drone as DroneSchema } from './schemas/Drone';
import { Plane as PlaneSchema } from './schemas/Plane';
import { Flag as FlagSchema } from './schemas/Flag';
import { Vehicle as VehicleSchema } from './schemas/Vehicle';
import { PhysicsState as SchemaPhysicsState } from './schemas/PhysicsState';
import { PhysicsState } from '@shared/physics/types';
import * as Colyseus from 'colyseus.js';
import { Engine, Vector3, Color3, Quaternion, Scene } from 'babylonjs';
import { GameScene } from './GameScene';
import { PhysicsInput } from '@shared/physics/types';
import { Drone } from './Drone';
import { Plane } from './Plane';
import { Flag } from './Flag';

interface GameOptions {
    team: number;
    vehicleType: 'drone' | 'plane';
}

export class Game {
    private canvas!: HTMLCanvasElement;
    private engine!: Engine;
    private gameScene!: GameScene;
    private client!: Colyseus.Client;
    private room: Colyseus.Room<State> | null = null;
    private team!: number;
    private vehicleType!: 'drone' | 'plane';

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
        
        // Create the game scene
        this.gameScene = new GameScene(this.canvas);

        // Connect to the server
        this.client = new Colyseus.Client('ws://localhost:2567');

        // Join the game room
        this.joinRoom();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        // Start the render loop
        this.engine.runRenderLoop(() => {
            this.gameScene.render();
        });
    }

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

    private setupRoomHandlers(): void {
        if (!this.room) return;

        // Handle vehicle updates
        this.room.state.vehicles.onAdd((vehicle: VehicleSchema, sessionId: string) => {
            console.log('Vehicle added:', sessionId);
            
            // Create vehicle in the game scene
            const isLocalPlayer = sessionId === this.room?.sessionId;
            let gameVehicle;
            
            if (vehicle instanceof DroneSchema) {
                gameVehicle = new Drone(this.gameScene.getScene(), vehicle.vehicleType, vehicle.team, this.canvas, isLocalPlayer);
            } else if (vehicle instanceof PlaneSchema) {
                gameVehicle = new Plane(this.gameScene.getScene(), vehicle.vehicleType, vehicle.team, this.canvas, isLocalPlayer);
            }
            
            if (gameVehicle) {
                this.gameScene.addVehicle(sessionId, gameVehicle);

                // Set initial position and rotation from server state
                const physicsState: PhysicsState = {
                    position: new Vector3(vehicle.positionX, vehicle.positionY, vehicle.positionZ),
                    quaternion: new Quaternion(vehicle.quaternionX, vehicle.quaternionY, vehicle.quaternionZ, vehicle.quaternionW),
                    linearVelocity: new Vector3(vehicle.linearVelocityX, vehicle.linearVelocityY, vehicle.linearVelocityZ),
                    angularVelocity: new Vector3(vehicle.angularVelocityX, vehicle.angularVelocityY, vehicle.angularVelocityZ)
                };
                gameVehicle.updateState(physicsState);

                // Listen for vehicle updates
                vehicle.onChange(() => {
                    if (!isLocalPlayer) {
                        const updatedState: PhysicsState = {
                            position: new Vector3(vehicle.positionX, vehicle.positionY, vehicle.positionZ),
                            quaternion: new Quaternion(vehicle.quaternionX, vehicle.quaternionY, vehicle.quaternionZ, vehicle.quaternionW),
                            linearVelocity: new Vector3(vehicle.linearVelocityX, vehicle.linearVelocityY, vehicle.linearVelocityZ),
                            angularVelocity: new Vector3(vehicle.angularVelocityX, vehicle.angularVelocityY, vehicle.angularVelocityZ)
                        };
                        gameVehicle.updateState(updatedState);
                    }
                });

                vehicle.onRemove(() => {
                    console.log('Vehicle removed:', sessionId);
                    this.gameScene.removeVehicle(sessionId);
                });
            }
        });

        // Handle flag updates
        this.room.state.flags.onAdd((flag: FlagSchema, flagId: string) => {
            console.log('Flag added:', flagId);
            const gameFlag = new Flag(this.gameScene.getScene(), flag.team);
            gameFlag.setPosition(new Vector3(flag.x, flag.y, flag.z));
            gameFlag.carriedBy = flag.carriedBy;
            gameFlag.atBase = flag.atBase;
            this.gameScene.addFlag(flag.team, gameFlag);
            
            flag.onChange(() => {
                const existingFlag = this.gameScene.getFlag(flag.team);
                if (existingFlag) {
                    existingFlag.setPosition(new Vector3(flag.x, flag.y, flag.z));
                    existingFlag.carriedBy = flag.carriedBy;
                    existingFlag.atBase = flag.atBase;
                }
            });

            flag.onRemove(() => {
                console.log('Flag removed:', flagId);
                this.gameScene.removeFlag(flag.team);
            });
        });

        // Handle initial flags
        this.room.state.flags.forEach((flag: FlagSchema, flagId: string) => {
            console.log('Initial flag state:', flagId);
            const gameFlag = new Flag(this.gameScene.getScene(), flag.team);
            gameFlag.setPosition(new Vector3(flag.x, flag.y, flag.z));
            gameFlag.carriedBy = flag.carriedBy;
            gameFlag.atBase = flag.atBase;
            this.gameScene.addFlag(flag.team, gameFlag);
        });
    }

    public sendMovementUpdate(vehicle: any): void {
        if (!this.room || !vehicle || !vehicle.mesh || !vehicle.physics) return;
        
        // Only send updates for local player
        if (vehicle.isLocalPlayer) {
            const quaternion = vehicle.mesh.rotationQuaternion || new Quaternion();
            const input: PhysicsInput = {
                forward: vehicle.input.forward,
                backward: vehicle.input.backward,
                left: vehicle.input.left,
                right: vehicle.input.right,
                up: vehicle.input.up,
                down: vehicle.input.down,
                pitchUp: vehicle.input.pitchUp,
                pitchDown: vehicle.input.pitchDown,
                yawLeft: vehicle.input.yawLeft,
                yawRight: vehicle.input.yawRight,
                rollLeft: vehicle.input.rollLeft,
                rollRight: vehicle.input.rollRight,
                mouseDelta: vehicle.input.mouseDelta
            };
            this.room.send('movement', input);
        }
    }
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
    new Game();
}); 