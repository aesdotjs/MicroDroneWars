// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.32
// 

import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }
}

type("number")(Player.prototype, "x");
type("number")(Player.prototype, "y");
type("number")(Player.prototype, "z");
