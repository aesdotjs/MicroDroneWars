const { Room, Client } = require('colyseus');
const { State, Vehicle, Flag } = require('../schema/State');

class MicroDroneRoom extends Room {
    onCreate(options) {
        this.setState(new State());

        // Set up the game loop
        this.setSimulationInterval((deltaTime) => this.update(deltaTime));

        // Initialize game state
        this.state.initialize();
    }

    onJoin(client, options) {
        console.log(`Client ${client.sessionId} joined with options:`, options);
        
        // Create a new vehicle for the player
        const vehicle = new Vehicle();
        vehicle.team = options.team || 0;
        vehicle.vehicleType = options.vehicleType || 'drone';
        
        // Set initial position based on team
        const spawnPoint = this.getTeamSpawnPoint(vehicle.team);
        vehicle.x = spawnPoint.x;
        vehicle.y = spawnPoint.y;
        vehicle.z = spawnPoint.z;
        
        // Add vehicle to state
        this.state.vehicles.set(client.sessionId, vehicle);
    }

    onLeave(client) {
        console.log(`Client ${client.sessionId} left`);
        this.state.vehicles.delete(client.sessionId);
    }

    onMessage(client, message) {
        const vehicle = this.state.vehicles.get(client.sessionId);
        if (!vehicle) return;

        // Handle different message types
        switch (message.type) {
            case 'movement':
                this.handleMovement(vehicle, message);
                break;
            case 'fire':
                this.handleFire(vehicle, message);
                break;
            case 'capture':
                this.handleCapture(vehicle, message);
                break;
        }
    }

    handleMovement(vehicle, message) {
        // Update vehicle position and rotation
        vehicle.x = message.x;
        vehicle.y = message.y;
        vehicle.z = message.z;
        vehicle.rotationX = message.rotationX;
        vehicle.rotationY = message.rotationY;
        vehicle.rotationZ = message.rotationZ;
    }

    handleFire(vehicle, message) {
        // Implement firing logic here
        // This would include creating projectiles and checking for hits
    }

    handleCapture(vehicle, message) {
        // Implement flag capture logic here
        const flag = this.state.flags.get(message.flagId);
        if (flag && !flag.captured) {
            flag.captured = true;
            flag.capturedBy = vehicle.team;
            // Add score or other game logic here
        }
    }

    getTeamSpawnPoint(team) {
        // Return different spawn points based on team
        return team === 0 
            ? { x: -20, y: 5, z: 0 }  // Team A spawn
            : { x: 20, y: 5, z: 0 };  // Team B spawn
    }

    update(deltaTime) {
        // Update game state
        // This could include:
        // - Moving AI vehicles
        // - Updating projectile positions
        // - Checking for collisions
        // - Updating scores
    }
}

module.exports = { MicroDroneRoom }; 