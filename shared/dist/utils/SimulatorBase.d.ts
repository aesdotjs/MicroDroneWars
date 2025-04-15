export interface SimulationFrame {
    position: number;
    velocity: number;
}
export declare class SimulatorBase {
    protected fps: number;
    protected mass: number;
    protected damping: number;
    protected frameTime: number;
    protected offset: number;
    protected cache: SimulationFrame[];
    constructor(fps: number, mass: number, damping: number);
    protected init(): void;
    protected generateFrames(timeStep: number): void;
    protected lastFrame(): SimulationFrame;
    protected getFrame(isLastFrame: boolean): SimulationFrame;
    simulate(timeStep: number): void;
    protected onSimulate(position: number, velocity: number): void;
}
