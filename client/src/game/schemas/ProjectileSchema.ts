// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.33
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class ProjectileSchema extends Schema {
    @type("string") public projectileType!: string;
    @type("number") public damage!: number;
    @type("number") public range!: number;
    @type("number") public distanceTraveled!: number;
    @type("string") public sourceId!: string;
    @type("number") public speed!: number;
}
