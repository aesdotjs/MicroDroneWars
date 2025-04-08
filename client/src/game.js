import { State } from './State.js';
import { Drone } from './Drone.js';
import { Plane } from './Plane.js';
import { Flag } from './Flag.js';
import * as Colyseus from 'colyseus.js';
import { Engine } from '@babylonjs/core';
import { GameScene } from './GameScene';

class Game {
    constructor() {
        // Get the canvas element
        this.canvas = document.getElementById('renderCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }

        // Initialize the engine
        this.engine = new Engine(this.canvas, true);
        
        // Create the game scene
        this.gameScene = new GameScene(this.engine);

        // Connect to the server
        this.client = new Colyseus.Client('ws://localhost:2567');
        this.room = null;

        // Join the game room
        this.joinRoom();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        // Start the render loop
        this.engine.runRenderLoop(() => {
            this.gameScene.scene.render();
        });
    }

    async joinRoom() {
        try {
            this.room = await this.client.joinOrCreate("microdrone_room", { 
                vehicleType: "drone", 
                team: 0 
            });
            console.log("Joined room:", this.room);
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
            this.gameScene.createVehicle(
                vehicle.vehicleType,
                vehicle.team,
                isLocalPlayer
            );

            // Listen for vehicle updates
            vehicle.onChange(() => {
                this.gameScene.updateVehicle(sessionId, vehicle);
            });
        });

        // Handle vehicle removal
        this.room.state.vehicles.onRemove((vehicle, sessionId) => {
            console.log('Vehicle removed:', sessionId);
            this.gameScene.removeVehicle(sessionId);
        });

        // Handle flag updates
        this.room.state.flags.onAdd((flag, flagId) => {
            console.log('Flag added:', flagId);
            this.gameScene.createFlag(flagId, flag);
            
            flag.onChange(() => {
                this.gameScene.updateFlag(flagId, flag);
            });
        });

        // Handle flag removal
        this.room.state.flags.onRemove((flag, flagId) => {
            console.log('Flag removed:', flagId);
            this.gameScene.removeFlag(flagId);
        });
    }

    sendMovementUpdate(vehicle) {
        if (!this.room) return;

        this.room.send('movement', {
            x: vehicle.mesh.position.x,
            y: vehicle.mesh.position.y,
            z: vehicle.mesh.position.z,
            rotationX: vehicle.mesh.rotation.x,
            rotationY: vehicle.mesh.rotation.y,
            rotationZ: vehicle.mesh.rotation.z
        });
    }
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
    new Game();
});
