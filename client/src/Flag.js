import { Schema, type } from "@colyseus/schema";

export class Flag extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.team = 0; // 0 for team A, 1 for team B
        this.carriedBy = null; // Session ID of vehicle carrying the flag
        this.atBase = true;
    }
}

// Define schema types
type("number")(Flag.prototype, "x");
type("number")(Flag.prototype, "y");
type("number")(Flag.prototype, "z");
type("number")(Flag.prototype, "team");
type("string")(Flag.prototype, "carriedBy");
type("boolean")(Flag.prototype, "atBase"); 