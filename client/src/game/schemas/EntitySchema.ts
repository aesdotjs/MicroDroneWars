// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.34
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Weapon } from './Weapon'

export class EntitySchema extends Schema {
    @type("string") public id!: string;
    @type("string") public type!: string;
    @type("number") public team!: number;
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
    @type("number") public health!: number;
    @type("number") public maxHealth!: number;
    @type("boolean") public hasFlag!: boolean;
    @type("string") public carriedBy!: string;
    @type("boolean") public atBase!: boolean;
    @type("string") public vehicleType!: string;
    @type([ Weapon ]) public weapons: ArraySchema<Weapon> = new ArraySchema<Weapon>();
    @type("number") public activeWeaponIndex!: number;
    @type("string") public projectileType!: string;
    @type("number") public damage!: number;
    @type("number") public range!: number;
    @type("number") public distanceTraveled!: number;
    @type("string") public sourceId!: string;
    @type("number") public speed!: number;
    @type("number") public tick!: number;
    @type("number") public timestamp!: number;
    @type("number") public lastProcessedInputTimestamp!: number;
    @type("number") public lastProcessedInputTick!: number;
}
