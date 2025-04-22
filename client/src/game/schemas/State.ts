// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.33
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vehicle } from './Vehicle'
import { Flag } from './Flag'
import { Projectile } from './Projectile'

export class State extends Schema {
    @type({ map: Vehicle }) public vehicles: MapSchema<Vehicle> = new MapSchema<Vehicle>();
    @type({ map: Flag }) public flags: MapSchema<Flag> = new MapSchema<Flag>();
    @type({ map: Projectile }) public projectiles: MapSchema<Projectile> = new MapSchema<Projectile>();
    @type("number") public serverTick!: number;
}
