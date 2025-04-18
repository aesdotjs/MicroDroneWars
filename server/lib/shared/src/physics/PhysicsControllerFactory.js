"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsControllerFactory = void 0;
const DronePhysicsController_1 = require("./DronePhysicsController");
const PlanePhysicsController_1 = require("./PlanePhysicsController");
/**
 * Factory class for creating physics controllers for different vehicle types.
 * Provides a centralized way to instantiate the appropriate physics controller
 * based on the vehicle configuration.
 */
class PhysicsControllerFactory {
    /**
     * Creates a physics controller based on the vehicle type specified in the configuration.
     * @param world - The CANNON.js physics world instance
     * @param config - The vehicle physics configuration
     * @returns A new physics controller instance
     * @throws Error if the vehicle type is unknown
     */
    static createController(world, config) {
        switch (config.vehicleType) {
            case 'drone':
                return new DronePhysicsController_1.DronePhysicsController(world, config);
            case 'plane':
                return new PlanePhysicsController_1.PlanePhysicsController(world, config);
            default:
                throw new Error(`Unknown vehicle type: ${config.vehicleType}`);
        }
    }
}
exports.PhysicsControllerFactory = PhysicsControllerFactory;
