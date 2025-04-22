// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.33
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Weapon } from './Weapon'
import { PhysicsState } from './PhysicsState'

export class Vehicle extends PhysicsState {
    @type("number") public health!: number;
    @type("boolean") public hasFlag!: boolean;
    @type("number") public team!: number;
    @type("string") public vehicleType!: string;
    @type([ Weapon ]) public weapons: ArraySchema<Weapon> = new ArraySchema<Weapon>();
    @type("number") public activeWeaponIndex!: number;
}
