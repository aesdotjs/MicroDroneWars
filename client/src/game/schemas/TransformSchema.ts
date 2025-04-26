// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.33
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class TransformSchema extends Schema {
    @type("float32") public positionX!: number;
    @type("float32") public positionY!: number;
    @type("float32") public positionZ!: number;
    @type("float32") public quaternionX!: number;
    @type("float32") public quaternionY!: number;
    @type("float32") public quaternionZ!: number;
    @type("float32") public quaternionW!: number;
    @type("float32") public linearVelocityX!: number;
    @type("float32") public linearVelocityY!: number;
    @type("float32") public linearVelocityZ!: number;
    @type("float32") public angularVelocityX!: number;
    @type("float32") public angularVelocityY!: number;
    @type("float32") public angularVelocityZ!: number;
}
