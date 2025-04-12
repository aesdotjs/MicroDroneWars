import { Room, Client } from "colyseus";
import { State, Drone, Plane, Flag } from "../schemas";
export class MicroDroneRoom extends Room<State> {
    onCreate(options: Record<string, any>) {
      this.setState(new State());
      console.log("MicroDrone room created");
  
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
      this.onMessage("movement", (client, data) => {
        const vehicle = this.state.vehicles.get(client.sessionId);
        if (vehicle) {
          // Update position
          vehicle.x = data.x;
          vehicle.y = data.y;
          vehicle.z = data.z;
          
          // Update rotation using quaternion
          vehicle.quaternionX = data.quaternionX;
          vehicle.quaternionY = data.quaternionY;
          vehicle.quaternionZ = data.quaternionZ;
          vehicle.quaternionW = data.quaternionW;
          
          // Update velocity
          vehicle.velocityX = data.velocityX;
          vehicle.velocityY = data.velocityY;
          vehicle.velocityZ = data.velocityZ;
        }
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
  
    onJoin(client: Client, options: { vehicleType: string, team: number }) {
      // Create vehicle based on type
      let vehicle;
      if (options.vehicleType === "drone") {
        vehicle = new Drone();
      } else {
        vehicle = new Plane();
      }
      
      // Set initial position based on team
      vehicle.team = options.team;
      vehicle.x = options.team === 0 ? -15 : 15;
      vehicle.z = 0;
      
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
      
      this.state.vehicles.delete(client.sessionId);
      console.log(`Vehicle left: ${client.sessionId}`);
    }
  
    update() {
      // Update vehicle positions based on velocity
      this.state.vehicles.forEach((vehicle, sessionId) => {
        // Only apply velocity-based updates for non-active players
        // Active players send their own updates
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (!client) {
          vehicle.x += vehicle.velocityX * (1/50); // deltaTime = 1/50
          vehicle.y += vehicle.velocityY * (1/50);
          vehicle.z += vehicle.velocityZ * (1/50);
        }
      });
  
      // Update flag positions if carried
      this.state.flags.forEach(flag => {
        if (flag.carriedBy) {
          const carrier = this.state.vehicles.get(flag.carriedBy);
          if (carrier) {
            flag.x = carrier.x;
            flag.y = carrier.y;
            flag.z = carrier.z;
          }
        }
      });
    }
  }