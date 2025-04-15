// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 2.0.36
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vehicle } from './Vehicle'
import { PhysicsState } from './PhysicsState'

/**
 * Represents a drone vehicle in the game.
 * Extends the base Vehicle class with drone-specific properties.
 * Used for network synchronization of drone state.
 */
export class Drone extends Vehicle {
    /** Maximum speed of the drone in m/s */
    @type("number") public maxSpeed!: number;
    /** Acceleration rate of the drone in m/s² */
    @type("number") public acceleration!: number;
    /** Turn rate of the drone in rad/s */
    @type("number") public turnRate!: number;
    /** Maximum health points of the drone */
    @type("number") public maxHealth!: number;
}
