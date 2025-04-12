// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 2.0.36
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vehicle } from './Vehicle'
import { PhysicsState } from './PhysicsState'

export class Plane extends Vehicle {
    @type("number") public maxSpeed!: number;
    @type("number") public acceleration!: number;
    @type("number") public turnRate!: number;
    @type("number") public maxHealth!: number;
}
