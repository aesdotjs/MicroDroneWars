// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 2.0.36
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vehicle } from './Vehicle'
import { Flag } from './Flag'

export class State extends Schema {
    @type({ map: Vehicle }) public vehicles: MapSchema<Vehicle> = new MapSchema<Vehicle>();
    @type({ map: Flag }) public flags: MapSchema<Flag> = new MapSchema<Flag>();
}
