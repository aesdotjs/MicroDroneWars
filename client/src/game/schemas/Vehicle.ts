// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 2.0.36
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { PhysicsState } from './PhysicsState'

/**
 * Base class for all vehicles in the game.
 * Extends PhysicsState with vehicle-specific properties.
 * Used for network synchronization of vehicle state.
 */
export class Vehicle extends PhysicsState {
    /** Current health points of the vehicle */
    @type("number") public health!: number;
    /** Whether the vehicle is currently carrying a flag */
    @type("boolean") public hasFlag!: boolean;
    /** Team number the vehicle belongs to (0 or 1) */
    @type("number") public team!: number;
    /** Type of vehicle ('drone' or 'plane') */
    @type("string") public vehicleType!: string;
}
