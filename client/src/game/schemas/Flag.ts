// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 2.0.36
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';

/**
 * Represents a flag object in the game.
 * Used for capture-the-flag gameplay mechanics.
 * Tracks position, team ownership, and carrier information.
 */
export class Flag extends Schema {
    /** X-coordinate of the flag in world space */
    @type("number") public x!: number;
    /** Y-coordinate of the flag in world space */
    @type("number") public y!: number;
    /** Z-coordinate of the flag in world space */
    @type("number") public z!: number;
    /** Team number that owns this flag (0 or 1) */
    @type("number") public team!: number;
    /** Session ID of the player currently carrying the flag, or null if not carried */
    @type("string") public carriedBy!: string;
    /** Whether the flag is currently at its base position */
    @type("boolean") public atBase!: boolean;
}
