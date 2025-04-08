// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.32
// 

import { Schema, MapSchema, type } from "@colyseus/schema";
import { Drone } from "./Drone.js";
import { Plane } from "./Plane.js";

export class State extends Schema {
    constructor() {
        super();
        this.vehicles = new MapSchema();
        this.flags = new MapSchema();
    }
}

type({ map: "any" })(State.prototype, "vehicles");
type({ map: "any" })(State.prototype, "flags");
