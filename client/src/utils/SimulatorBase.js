export class SimulatorBase {
    constructor(fps, mass, damping) {
        this.fps = fps;
        this.mass = mass;
        this.damping = damping;
        this.frameTime = 1 / fps;
        this.offset = 0;
        this.lastTime = 0;
    }

    init() {
        this.cache = [];
        for (let i = 0; i < 2; i++) {
            this.cache.push({
                position: 0,
                velocity: 0
            });
        }
    }

    generateFrames(timeStep) {
        this.offset += timeStep;

        while (this.offset >= this.frameTime) {
            this.cache.shift();
            this.cache.push(this.getFrame(false));
            this.offset -= this.frameTime;
        }
    }

    lastFrame() {
        return this.cache[this.cache.length - 1];
    }

    simulate(timeStep) {
        this.generateFrames(timeStep);
        this.position = this.cache[0].position + (this.cache[1].position - this.cache[0].position) * (this.offset / this.frameTime);
        this.velocity = this.cache[0].velocity + (this.cache[1].velocity - this.cache[0].velocity) * (this.offset / this.frameTime);
    }
} 