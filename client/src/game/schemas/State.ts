// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 2.0.36
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vehicle } from './Vehicle'
import { Flag } from './Flag'

/**
 * Represents the complete game state.
 * Contains all vehicles, flags, and server synchronization information.
 * Used for network synchronization between server and clients.
 */
export class State extends Schema {
    /** Map of all vehicles in the game, keyed by player session ID */
    @type({ map: Vehicle }) public vehicles: MapSchema<Vehicle> = new MapSchema<Vehicle>();
    /** Map of all flags in the game, keyed by flag ID */
    @type({ map: Flag }) public flags: MapSchema<Flag> = new MapSchema<Flag>();
    /** Current server simulation tick number */
    @type("number") public serverTick: number = 0;
}
