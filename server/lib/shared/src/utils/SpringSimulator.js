"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpringSimulator = void 0;
const SimulatorBase_1 = require("./SimulatorBase");
/**
 * Simulates spring-like behavior for smooth movement and transitions.
 * Implements a damped spring system that can be used for various physics effects
 * such as camera movement, control surface animation, and vehicle stabilization.
 */
class SpringSimulator extends SimulatorBase_1.SimulatorBase {
    /**
     * Creates a new SpringSimulator instance.
     * @param frequency - Natural frequency of the spring in Hz
     * @param damping - Damping coefficient (0-1)
     * @param initialPosition - Initial position of the spring
     */
    constructor(frequency, damping, initialPosition = 0) {
        super(frequency, 1, damping);
        /** Current position of the spring */
        this.position = 0;
        /** Current velocity of the spring */
        this.velocity = 0;
        /** Target position the spring is trying to reach */
        this.target = 0;
        this.frequency = frequency;
        this.damping = damping;
        this.position = initialPosition;
        this.target = initialPosition;
    }
    /**
     * Calculates the next simulation frame using spring physics.
     * Implements Hooke's law with damping for realistic spring behavior.
     * @param isLastFrame - Whether this is the last frame in the simulation
     * @returns The next simulation frame
     */
    getFrame(isLastFrame) {
        const newSpring = {
            position: this.lastFrame().position,
            velocity: this.lastFrame().velocity
        };
        // Calculate spring force using Hooke's law
        const springForce = -this.damping * newSpring.velocity - this.mass * (newSpring.position - this.target);
        // Update velocity and position using Euler integration
        newSpring.velocity += springForce * this.frameTime;
        newSpring.position += newSpring.velocity * this.frameTime;
        return newSpring;
    }
    /**
     * Updates the current position and velocity after simulation.
     * @param position - The interpolated position
     * @param velocity - The interpolated velocity
     */
    onSimulate(position, velocity) {
        this.position = position;
        this.velocity = velocity;
    }
    /**
     * Sets the target position for the spring to move towards.
     * @param target - The new target position
     */
    setTarget(target) {
        this.target = target;
    }
    /**
     * Gets the current position of the spring.
     * @returns The current position
     */
    getPosition() {
        return this.position;
    }
    /**
     * Resets the spring to a new position.
     * Clears velocity and sets both position and target to the new value.
     * @param position - The new position to reset to
     */
    reset(position = 0) {
        this.position = position;
        this.velocity = 0;
        this.target = position;
        this.init();
    }
}
exports.SpringSimulator = SpringSimulator;
