const { Schema, MapSchema, ArraySchema, type } = require('@colyseus/schema');

class Vehicle extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.rotationX = 0;
        this.rotationY = 0;
        this.rotationZ = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;
        this.health = 100;
        this.hasFlag = false;
        this.team = 0;
        this.vehicleType = 'drone';
    }
}

class Flag extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.team = 0;
        this.captured = false;
        this.capturedBy = null;
    }
}

class State extends Schema {
    constructor() {
        super();
        this.vehicles = new MapSchema();
        this.flags = new MapSchema();
        this.scores = {
            teamA: 0,
            teamB: 0
        };
    }

    initialize() {
        // Create flags for each team
        const flagA = new Flag();
        flagA.team = 0;
        flagA.x = -30;
        flagA.y = 2;
        flagA.z = 0;
        this.flags.set('flagA', flagA);

        const flagB = new Flag();
        flagB.team = 1;
        flagB.x = 30;
        flagB.y = 2;
        flagB.z = 0;
        this.flags.set('flagB', flagB);
    }
}

// Define schema types
type("number")(Vehicle.prototype, "x");
type("number")(Vehicle.prototype, "y");
type("number")(Vehicle.prototype, "z");
type("number")(Vehicle.prototype, "rotationX");
type("number")(Vehicle.prototype, "rotationY");
type("number")(Vehicle.prototype, "rotationZ");
type("number")(Vehicle.prototype, "velocityX");
type("number")(Vehicle.prototype, "velocityY");
type("number")(Vehicle.prototype, "velocityZ");
type("number")(Vehicle.prototype, "health");
type("boolean")(Vehicle.prototype, "hasFlag");
type("number")(Vehicle.prototype, "team");
type("string")(Vehicle.prototype, "vehicleType");

type("number")(Flag.prototype, "x");
type("number")(Flag.prototype, "y");
type("number")(Flag.prototype, "z");
type("number")(Flag.prototype, "team");
type("boolean")(Flag.prototype, "captured");
type("number")(Flag.prototype, "capturedBy");

type("map")(State.prototype, "vehicles");
type("map")(State.prototype, "flags");
type("object")(State.prototype, "scores");

module.exports = { State, Vehicle, Flag }; 