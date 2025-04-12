import { State } from './State.js';
import { Drone } from './Drone.js';
import { Plane } from './Plane.js';
import { Flag } from './Flag.js';
import * as Colyseus from 'colyseus.js';
import { Engine, Vector3, Color3, Quaternion } from '@babylonjs/core';
import { GameScene } from './GameScene';

class Game {
    constructor() {
        // Get the canvas element
        this.canvas = document.getElementById('renderCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }

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
        this.gameScene = new GameScene(this.engine, this);

        // Connect to the server
        this.client = new Colyseus.Client('ws://localhost:2567');
        this.room = null;

        // Join the game room
        this.joinRoom();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        // Handle page unload (refresh/close)
        // window.addEventListener('beforeunload', () => {
        //     if (this.room) {
        //         this.room.send('playerLeft');
        //         this.room.leave();
        //     }
        // });

        // Start the render loop
        this.engine.runRenderLoop(() => {
            if (this.gameScene && this.gameScene.scene) {
                this.gameScene.scene.render();
            }
        });
    }

    async joinRoom() {
        try {
            this.room = await this.client.joinOrCreate("microdrone_room", { 
                vehicleType: this.vehicleType, 
                team: this.team 
            });
            console.log("Joined room:", this.room, "Team:", this.team, "Vehicle Type:", this.vehicleType);
            this.setupRoomHandlers();
        } catch (err) {
            console.error("Error joining room:", err);
        }
    }

    setupRoomHandlers() {
        // Handle vehicle updates
        this.room.state.vehicles.onAdd((vehicle, sessionId) => {
            console.log('Vehicle added:', sessionId);
            
            // Create vehicle in the game scene
            const isLocalPlayer = sessionId === this.room.sessionId;
            const gameVehicle = this.gameScene.createVehicle(
                vehicle.vehicleType,
                vehicle.team,
                isLocalPlayer,
                sessionId
            );
            if (gameVehicle) {
                // Set initial position and rotation from server state
                gameVehicle.updatePosition(
                    { x: vehicle.x, y: vehicle.y, z: vehicle.z },
                    { x: vehicle.quaternionX, y: vehicle.quaternionY, z: vehicle.quaternionZ, w: vehicle.quaternionW },
                    { x: vehicle.velocityX, y: vehicle.velocityY, z: vehicle.velocityZ },
                    false,
                );

                // Listen for vehicle updates
                vehicle.onChange(() => {
                    if (gameVehicle && gameVehicle.mesh && !gameVehicle.isLocalPlayer) {
                        // Update position, rotation, and velocity using interpolation
                        gameVehicle.updatePosition(
                            { x: vehicle.x, y: vehicle.y, z: vehicle.z },
                            { x: vehicle.quaternionX, y: vehicle.quaternionY, z: vehicle.quaternionZ, w: vehicle.quaternionW },
                            { x: vehicle.velocityX, y: vehicle.velocityY, z: vehicle.velocityZ }
                        );
                    }
                });

                vehicle.onRemove(() => {
                    console.log('Vehicle removed:', sessionId);
                    this.gameScene.removeVehicle(sessionId);
                });

                // Log vehicle creation details
                console.log('Vehicle created:', {
                    id: gameVehicle.id,
                    type: gameVehicle.type,
                    team: gameVehicle.team,
                    position: gameVehicle.mesh?.position,
                    isLocalPlayer,
                    hasScene: !!gameVehicle.scene,
                    hasMesh: !!gameVehicle.mesh,
                    meshVisible: gameVehicle.mesh?.isVisible
                });
            }
        });


        // Handle flag updates
        this.room.state.flags.onAdd((flag, flagId) => {
            console.log('Flag added:', flagId);
            const gameFlag = this.gameScene.createFlag(flagId, flag);
            
            if (gameFlag) {
                flag.onChange(() => {
                    if (gameFlag) {
                        gameFlag.position = new Vector3(flag.x, flag.y, flag.z);
                        if (flag.captured) {
                            gameFlag.material.diffuseColor = new Color3(0, 1, 0);
                        }
                    }
                });
                flag.onRemove(() => {
                    console.log('Flag removed:', flagId);
                    this.gameScene.removeFlag(flagId);
                });
            }
        });


        this.room.state.flags.forEach((flag, flagId) => {
            console.log('Initial flag state:', flagId);
            this.gameScene.createFlag(flagId, flag);
        });
    }

    sendMovementUpdate(vehicle) {
        if (!this.room || !vehicle || !vehicle.mesh || !vehicle.physics) return;
        // Only send updates for local player
        if (vehicle.isLocalPlayer) {
            const quaternion = vehicle.mesh.rotationQuaternion || new Quaternion();
            this.room.send('movement', {
                x: vehicle.mesh.position.x,
                y: vehicle.mesh.position.y,
                z: vehicle.mesh.position.z,
                quaternionX: quaternion.x,
                quaternionY: quaternion.y,
                quaternionZ: quaternion.z,
                quaternionW: quaternion.w,
                velocityX: vehicle.physics.body.velocity.x,
                velocityY: vehicle.physics.body.velocity.y,
                velocityZ: vehicle.physics.body.velocity.z
            });
        }
    }
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
    new Game();
});
