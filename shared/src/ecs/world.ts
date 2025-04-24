import { World } from "miniplex";
import type { GameEntity } from "./types";

/**
 * Optional: Create a default world instance if you want to use a singleton pattern.
 * Note: You might want to create separate worlds for client and server instead.
 */
export const world = new World<GameEntity>(); 