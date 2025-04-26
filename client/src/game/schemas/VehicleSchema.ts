// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.33
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { WeaponSchema } from './WeaponSchema'

export class VehicleSchema extends Schema {
    @type("string") public vehicleType!: string;
    @type([ WeaponSchema ]) public weapons: ArraySchema<WeaponSchema> = new ArraySchema<WeaponSchema>();
    @type("number") public activeWeaponIndex!: number;
}
