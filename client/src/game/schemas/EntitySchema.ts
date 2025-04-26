// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.33
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { TransformSchema } from './TransformSchema'
import { VehicleSchema } from './VehicleSchema'
import { ProjectileSchema } from './ProjectileSchema'
import { TickSchema } from './TickSchema'
import { OwnerSchema } from './OwnerSchema'
import { GameStateSchema } from './GameStateSchema'

export class EntitySchema extends Schema {
    @type("string") public id!: string;
    @type("string") public type!: string;
    @type(TransformSchema) public transform: TransformSchema = new TransformSchema();
    @type(VehicleSchema) public vehicle: VehicleSchema = new VehicleSchema();
    @type(ProjectileSchema) public projectile: ProjectileSchema = new ProjectileSchema();
    @type(TickSchema) public tick: TickSchema = new TickSchema();
    @type(OwnerSchema) public owner: OwnerSchema = new OwnerSchema();
    @type(GameStateSchema) public gameState: GameStateSchema = new GameStateSchema();
}
