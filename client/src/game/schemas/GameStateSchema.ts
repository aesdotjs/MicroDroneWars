// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.33
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class GameStateSchema extends Schema {
    @type("number") public health!: number;
    @type("number") public maxHealth!: number;
    @type("number") public team!: number;
    @type("boolean") public hasFlag!: boolean;
    @type("boolean") public carryingFlag!: boolean;
    @type("string") public carriedBy!: string;
    @type("boolean") public atBase!: boolean;
}
