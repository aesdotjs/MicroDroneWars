import { SimulatorBase, SimulationFrame } from './SimulatorBase';

/**
 * Simulates spring-like behavior for smooth movement and transitions.
 * Implements a damped spring system that can be used for various physics effects
 * such as camera movement, control surface animation, and vehicle stabilization.
 */
export class SpringSimulator extends SimulatorBase {
    /** Current position of the spring */
    protected position: number = 0;
    /** Current velocity of the spring */
    protected velocity: number = 0;
    /** Target position the spring is trying to reach */
    protected target: number = 0;
    /** Damping coefficient for the spring */
    protected damping: number;
    /** Natural frequency of the spring in Hz */
    protected frequency: number;

    /**
     * Creates a new SpringSimulator instance.
     * @param frequency - Natural frequency of the spring in Hz
     * @param damping - Damping coefficient (0-1)
     * @param initialPosition - Initial position of the spring
     */
    constructor(frequency: number, damping: number, initialPosition: number = 0) {
        super(frequency, 1, damping);
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
    protected getFrame(isLastFrame: boolean): SimulationFrame {
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
    protected onSimulate(position: number, velocity: number): void {
        this.position = position;
        this.velocity = velocity;
    }

    /**
     * Sets the target position for the spring to move towards.
     * @param target - The new target position
     */
    public setTarget(target: number): void {
        this.target = target;
    }

    /**
     * Gets the current position of the spring.
     * @returns The current position
     */
    public getPosition(): number {
        return this.position;
    }

    /**
     * Resets the spring to a new position.
     * Clears velocity and sets both position and target to the new value.
     * @param position - The new position to reset to
     */
    public reset(position: number = 0): void {
        this.position = position;
        this.velocity = 0;
        this.target = position;
        this.init();
    }
} 