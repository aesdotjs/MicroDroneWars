// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 2.0.36
// 

import { type } from '@colyseus/schema';
import { Vehicle } from './Vehicle'

/**
 * Represents a plane vehicle in the game.
 * Extends the base Vehicle class with plane-specific properties.
 * Used for network synchronization of plane state.
 */
export class Plane extends Vehicle {
    /** Maximum speed of the plane in m/s */
    @type("number") public maxSpeed!: number;
    /** Acceleration rate of the plane in m/s² */
    @type("number") public acceleration!: number;
    /** Turn rate of the plane in rad/s */
    @type("number") public turnRate!: number;
    /** Maximum health points of the plane */
    @type("number") public maxHealth!: number;
}
