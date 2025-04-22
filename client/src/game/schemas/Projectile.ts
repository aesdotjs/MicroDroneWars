// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.33
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class Projectile extends Schema {
    @type("string") public id!: string;
    @type("string") public type!: string;
    @type("number") public positionX!: number;
    @type("number") public positionY!: number;
    @type("number") public positionZ!: number;
    @type("number") public directionX!: number;
    @type("number") public directionY!: number;
    @type("number") public directionZ!: number;
    @type("number") public speed!: number;
    @type("number") public damage!: number;
    @type("number") public range!: number;
    @type("number") public distanceTraveled!: number;
    @type("string") public sourceId!: string;
    @type("number") public timestamp!: number;
    @type("number") public tick!: number;
}
