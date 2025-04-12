"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulatorBase = void 0;
class SimulatorBase {
    constructor(fps, mass, damping) {
        this.offset = 0;
        this.cache = [];
        this.fps = fps;
        this.mass = mass;
        this.damping = damping;
        this.frameTime = 1 / fps;
        this.init();
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
    getFrame(isLastFrame) {
        throw new Error('getFrame must be implemented by derived class');
    }
    simulate(timeStep) {
        this.generateFrames(timeStep);
        const position = this.cache[0].position + (this.cache[1].position - this.cache[0].position) * (this.offset / this.frameTime);
        const velocity = this.cache[0].velocity + (this.cache[1].velocity - this.cache[0].velocity) * (this.offset / this.frameTime);
        this.onSimulate(position, velocity);
    }
    onSimulate(position, velocity) {
        // Override in derived class if needed
    }
}
exports.SimulatorBase = SimulatorBase;
