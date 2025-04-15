/**
 * Interface representing a single frame of simulation data.
 * Contains position and velocity information for a simulated object.
 */
export interface SimulationFrame {
    /** Current position of the simulated object */
    position: number;
    /** Current velocity of the simulated object */
    velocity: number;
}

/**
 * Base class for physics simulators.
 * Provides common functionality for simulating physical systems with spring-like behavior.
 * Implements frame-based simulation with interpolation for smooth movement.
 */
export class SimulatorBase {
    /** Target frames per second for the simulation */
    protected fps: number;
    /** Mass of the simulated object */
    protected mass: number;
    /** Damping coefficient for the simulation */
    protected damping: number;
    /** Time per frame in seconds */
    protected frameTime: number;
    /** Time offset for interpolation */
    protected offset: number = 0;
    /** Cache of recent simulation frames */
    protected cache: SimulationFrame[] = [];

    /**
     * Creates a new SimulatorBase instance.
     * @param fps - Target frames per second for the simulation
     * @param mass - Mass of the simulated object
     * @param damping - Damping coefficient for the simulation
     */
    constructor(fps: number, mass: number, damping: number) {
        this.fps = fps;
        this.mass = mass;
        this.damping = damping;
        this.frameTime = 1 / fps;
        this.init();
    }

    /**
     * Initializes the simulation cache with default frames.
     * Creates two initial frames with zero position and velocity.
     */
    protected init(): void {
        this.cache = [];
        for (let i = 0; i < 2; i++) {
            this.cache.push({
                position: 0,
                velocity: 0
            });
        }
    }

    /**
     * Generates new simulation frames based on the time step.
     * Maintains a cache of recent frames for interpolation.
     * @param timeStep - Time elapsed since last update in seconds
     */
    protected generateFrames(timeStep: number): void {
        this.offset += timeStep;

        while (this.offset >= this.frameTime) {
            this.cache.shift();
            this.cache.push(this.getFrame(false));
            this.offset -= this.frameTime;
        }
    }

    /**
     * Gets the most recent simulation frame.
     * @returns The last frame in the cache
     */
    protected lastFrame(): SimulationFrame {
        return this.cache[this.cache.length - 1];
    }

    /**
     * Calculates the next simulation frame.
     * Must be implemented by derived classes.
     * @param isLastFrame - Whether this is the last frame in the simulation
     * @returns The next simulation frame
     * @throws Error if not implemented by derived class
     */
    protected getFrame(isLastFrame: boolean): SimulationFrame {
        throw new Error('getFrame must be implemented by derived class');
    }

    /**
     * Simulates the physical system for a given time step.
     * Generates frames and interpolates between them for smooth movement.
     * @param timeStep - Time elapsed since last update in seconds
     */
    public simulate(timeStep: number): void {
        this.generateFrames(timeStep);
        const position = this.cache[0].position + (this.cache[1].position - this.cache[0].position) * (this.offset / this.frameTime);
        const velocity = this.cache[0].velocity + (this.cache[1].velocity - this.cache[0].velocity) * (this.offset / this.frameTime);
        this.onSimulate(position, velocity);
    }

    /**
     * Callback method called after simulation.
     * Can be overridden by derived classes to handle simulation results.
     * @param position - The interpolated position
     * @param velocity - The interpolated velocity
     */
    protected onSimulate(position: number, velocity: number): void {
        // Override in derived class if needed
    }
} 