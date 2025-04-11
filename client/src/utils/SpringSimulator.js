import { SimulatorBase } from './SimulatorBase';

export class SpringSimulator extends SimulatorBase {
    constructor(fps, mass, damping) {
        super(fps, mass, damping);
        this.position = 0;
        this.velocity = 0;
        this.target = 0;
        this.init();
    }

    init() {
        super.init();
        this.position = 0;
        this.velocity = 0;
        this.target = 0;
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
} 