import { Schema, type } from "@colyseus/schema";
import { Vehicle } from "./Vehicle.js";

export class Plane extends Vehicle {
    constructor() {
        super();
        this.maxSpeed = 10; // Faster than drones
        this.acceleration = 0.3;
        this.turnRate = 0.03; // Less maneuverable than drones
        this.maxHealth = 100; // Less health than drones
        this.vehicleType = "plane";
    }
}

// Define schema types
type("number")(Plane.prototype, "maxSpeed");
type("number")(Plane.prototype, "acceleration");
type("number")(Plane.prototype, "turnRate");
type("number")(Plane.prototype, "maxHealth");
type("string")(Plane.prototype, "vehicleType"); 