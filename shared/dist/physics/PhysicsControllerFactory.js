"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsControllerFactory = void 0;
const DronePhysicsController_1 = require("./DronePhysicsController");
const PlanePhysicsController_1 = require("./PlanePhysicsController");
class PhysicsControllerFactory {
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
