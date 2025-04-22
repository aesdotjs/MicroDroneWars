// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.33
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class PhysicsState extends Schema {
    @type("number") public positionX!: number;
    @type("number") public positionY!: number;
    @type("number") public positionZ!: number;
    @type("number") public quaternionX!: number;
    @type("number") public quaternionY!: number;
    @type("number") public quaternionZ!: number;
    @type("number") public quaternionW!: number;
    @type("number") public linearVelocityX!: number;
    @type("number") public linearVelocityY!: number;
    @type("number") public linearVelocityZ!: number;
    @type("number") public angularVelocityX!: number;
    @type("number") public angularVelocityY!: number;
    @type("number") public angularVelocityZ!: number;
    @type("number") public tick!: number;
    @type("number") public timestamp!: number;
    @type("number") public lastProcessedInputTimestamp!: number;
    @type("number") public lastProcessedInputTick!: number;
}
