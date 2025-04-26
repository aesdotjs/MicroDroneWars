// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.33
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class TickSchema extends Schema {
    @type("number") public tick!: number;
    @type("number") public timestamp!: number;
    @type("number") public lastProcessedInputTimestamp!: number;
    @type("number") public lastProcessedInputTick!: number;
}
