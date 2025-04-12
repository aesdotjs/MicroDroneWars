// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.32
// 

import { Schema, MapSchema, type } from "@colyseus/schema";
import { Drone } from "./Drone.js";
import { Plane } from "./Plane.js";
import { Flag } from "./Flag.js";

export class State extends Schema {
    constructor() {
        super();
        this.vehicles = new MapSchema();
        this.flags = new MapSchema();
    }
}

// Define the types for the schema properties
type({ map: Drone })(State.prototype, "vehicles");
type({ map: Flag })(State.prototype, "flags");

// Add methods for vehicle management
State.prototype.addVehicle = function(sessionId, vehicle) {
    this.vehicles.set(sessionId, vehicle);
};

State.prototype.removeVehicle = function(sessionId) {
    this.vehicles.delete(sessionId);
};

State.prototype.getVehicle = function(sessionId) {
    return this.vehicles.get(sessionId);
};

// Add methods for flag management
State.prototype.addFlag = function(teamId, flag) {
    this.flags.set(teamId, flag);
};

State.prototype.removeFlag = function(teamId) {
    this.flags.delete(teamId);
};

State.prototype.getFlag = function(teamId) {
    return this.flags.get(teamId);
};
