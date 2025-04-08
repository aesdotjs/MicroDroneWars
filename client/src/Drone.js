import { Schema, type } from "@colyseus/schema";
import { Vehicle } from "./Vehicle.js";

export class Drone extends Vehicle {
    constructor() {
        super();
        this.maxSpeed = 5; // Slower than planes
        this.acceleration = 0.2;
        this.turnRate = 0.05;
        this.maxHealth = 150; // More health than planes
        this.vehicleType = "drone";
    }
}

// Define schema types
type("number")(Drone.prototype, "maxSpeed");
type("number")(Drone.prototype, "acceleration");
type("number")(Drone.prototype, "turnRate");
type("number")(Drone.prototype, "maxHealth");
type("string")(Drone.prototype, "vehicleType"); 