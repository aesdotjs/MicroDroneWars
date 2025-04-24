// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.34
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { EntitySchema } from './EntitySchema'

export class State extends Schema {
    @type({ map: EntitySchema }) public entities: MapSchema<EntitySchema> = new MapSchema<EntitySchema>();
    @type("number") public serverTick!: number;
    @type("number") public nextEntityId!: number;
}
