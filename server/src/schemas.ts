import { Schema, MapSchema, type } from "@colyseus/schema";
import { PhysicsInput } from "@shared/physics/types";

export class PhysicsState extends Schema {
    @type("number") positionX = 0;
    @type("number") positionY = 0;
    @type("number") positionZ = 0;
    @type("number") quaternionX = 0;
    @type("number") quaternionY = 0;
    @type("number") quaternionZ = 0;
    @type("number") quaternionW = 1;
    @type("number") linearVelocityX = 0;
    @type("number") linearVelocityY = 0;
    @type("number") linearVelocityZ = 0;
    @type("number") angularVelocityX = 0;
    @type("number") angularVelocityY = 0;
    @type("number") angularVelocityZ = 0;
}

export class Vehicle extends PhysicsState {
    @type("number") health = 100;
    @type("boolean") hasFlag = false;
    @type("number") team = 0;
    @type("string") vehicleType = "";
    inputQueue: PhysicsInput[] = [];
}

export class Drone extends Vehicle {
    @type("number") maxSpeed = 5;
    @type("number") acceleration = 0.2;
    @type("number") turnRate = 0.05;
    @type("number") maxHealth = 150;
}

export class Plane extends Vehicle {
    @type("number") maxSpeed = 10;
    @type("number") acceleration = 0.3;
    @type("number") turnRate = 0.03;
    @type("number") maxHealth = 100;
}

export class Flag extends Schema {
    @type("number") x = 0;
    @type("number") y = 0;
    @type("number") z = 0;
    @type("number") team = 0;
    @type("string") carriedBy = null;
    @type("boolean") atBase = true;
}

export class State extends Schema {
    @type({ map: Vehicle }) vehicles = new MapSchema<Vehicle>();
    @type({ map: Flag }) flags = new MapSchema<Flag>();
}
