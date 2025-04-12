export interface SimulationFrame {
    position: number;
    velocity: number;
}

export class SimulatorBase {
    protected fps: number;
    protected mass: number;
    protected damping: number;
    protected frameTime: number;
    protected offset: number = 0;
    protected cache: SimulationFrame[] = [];

    constructor(fps: number, mass: number, damping: number) {
        this.fps = fps;
        this.mass = mass;
        this.damping = damping;
        this.frameTime = 1 / fps;
        this.init();
    }

    protected init(): void {
        this.cache = [];
        for (let i = 0; i < 2; i++) {
            this.cache.push({
                position: 0,
                velocity: 0
            });
        }
    }

    protected generateFrames(timeStep: number): void {
        this.offset += timeStep;

        while (this.offset >= this.frameTime) {
            this.cache.shift();
            this.cache.push(this.getFrame(false));
            this.offset -= this.frameTime;
        }
    }

    protected lastFrame(): SimulationFrame {
        return this.cache[this.cache.length - 1];
    }

    protected getFrame(isLastFrame: boolean): SimulationFrame {
        throw new Error('getFrame must be implemented by derived class');
    }

    public simulate(timeStep: number): void {
        this.generateFrames(timeStep);
        const position = this.cache[0].position + (this.cache[1].position - this.cache[0].position) * (this.offset / this.frameTime);
        const velocity = this.cache[0].velocity + (this.cache[1].velocity - this.cache[0].velocity) * (this.offset / this.frameTime);
        this.onSimulate(position, velocity);
    }

    protected onSimulate(position: number, velocity: number): void {
        // Override in derived class if needed
    }
} 