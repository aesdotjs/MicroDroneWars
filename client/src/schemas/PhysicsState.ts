// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 2.0.36
// 

import { Schema, type } from '@colyseus/schema';


export class PhysicsState extends Schema {
    @type("number") public positionX: number = 0;
    @type("number") public positionY: number = 0;
    @type("number") public positionZ: number = 0;
    @type("number") public quaternionX: number = 0;
    @type("number") public quaternionY: number = 0;
    @type("number") public quaternionZ: number = 0;
    @type("number") public quaternionW: number = 1;
    @type("number") public linearVelocityX: number = 0;
    @type("number") public linearVelocityY: number = 0;
    @type("number") public linearVelocityZ: number = 0;
    @type("number") public angularVelocityX: number = 0;
    @type("number") public angularVelocityY: number = 0;
    @type("number") public angularVelocityZ: number = 0;
}
