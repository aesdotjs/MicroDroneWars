"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpringSimulator = void 0;
const SimulatorBase_1 = require("./SimulatorBase");
class SpringSimulator extends SimulatorBase_1.SimulatorBase {
    constructor(frequency, damping, initialPosition = 0) {
        super(frequency, 1, damping);
        this.position = 0;
        this.velocity = 0;
        this.target = 0;
        this.frequency = frequency;
        this.damping = damping;
        this.position = initialPosition;
        this.target = initialPosition;
    }
    getFrame(isLastFrame) {
        const newSpring = {
            position: this.lastFrame().position,
            velocity: this.lastFrame().velocity
        };
        // Calculate spring force
        const springForce = -this.damping * newSpring.velocity - this.mass * (newSpring.position - this.target);
        // Update velocity and position
        newSpring.velocity += springForce * this.frameTime;
        newSpring.position += newSpring.velocity * this.frameTime;
        return newSpring;
    }
    onSimulate(position, velocity) {
        this.position = position;
        this.velocity = velocity;
    }
    setTarget(target) {
        this.target = target;
    }
    getPosition() {
        return this.position;
    }
    reset(position = 0) {
        this.position = position;
        this.velocity = 0;
        this.target = position;
        this.init();
    }
}
exports.SpringSimulator = SpringSimulator;
