import { Schema, MapSchema, type } from "@colyseus/schema";

export class Vehicle extends Schema {
    @type("number") x = 0;
    @type("number") y = 0;
    @type("number") z = 0;
    @type("number") rotationX = 0;
    @type("number") rotationY = 0;
    @type("number") rotationZ = 0;
    @type("number") velocityX = 0;
    @type("number") velocityY = 0;
    @type("number") velocityZ = 0;
    @type("number") health = 100;
    @type("boolean") hasFlag = false;
    @type("number") team = 0;
}

export class Drone extends Vehicle {
    @type("number") maxSpeed = 5;
    @type("number") acceleration = 0.2;
    @type("number") turnRate = 0.05;
    @type("number") maxHealth = 150;
    @type("string") vehicleType = "drone";
}

export class Plane extends Vehicle {
    @type("number") maxSpeed = 10;
    @type("number") acceleration = 0.3;
    @type("number") turnRate = 0.03;
    @type("number") maxHealth = 100;
    @type("string") vehicleType = "plane";
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
