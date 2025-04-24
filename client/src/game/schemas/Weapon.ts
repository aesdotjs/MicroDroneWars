// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.34
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class Weapon extends Schema {
    @type("string") public id!: string;
    @type("string") public name!: string;
    @type("string") public projectileType!: string;
    @type("number") public damage!: number;
    @type("number") public fireRate!: number;
    @type("number") public projectileSpeed!: number;
    @type("number") public cooldown!: number;
    @type("number") public range!: number;
    @type("boolean") public isOnCooldown!: boolean;
    @type("number") public lastFireTime!: number;
}
