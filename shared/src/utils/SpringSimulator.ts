import { SimulatorBase, SimulationFrame } from './SimulatorBase';

export class SpringSimulator extends SimulatorBase {
    protected position: number = 0;
    protected velocity: number = 0;
    protected target: number = 0;
    protected damping: number;
    protected frequency: number;

    constructor(frequency: number, damping: number, initialPosition: number = 0) {
        super(frequency, 1, damping);
        this.frequency = frequency;
        this.damping = damping;
        this.position = initialPosition;
        this.target = initialPosition;
    }

    protected getFrame(isLastFrame: boolean): SimulationFrame {
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

    protected onSimulate(position: number, velocity: number): void {
        this.position = position;
        this.velocity = velocity;
    }

    public setTarget(target: number): void {
        this.target = target;
    }

    public getPosition(): number {
        return this.position;
    }

    public reset(position: number = 0): void {
        this.position = position;
        this.velocity = 0;
        this.target = position;
        this.init();
    }
} 