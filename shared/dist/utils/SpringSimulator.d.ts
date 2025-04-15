import { SimulatorBase, SimulationFrame } from './SimulatorBase';
export declare class SpringSimulator extends SimulatorBase {
    protected position: number;
    protected velocity: number;
    protected target: number;
    protected damping: number;
    protected frequency: number;
    constructor(frequency: number, damping: number, initialPosition?: number);
    protected getFrame(isLastFrame: boolean): SimulationFrame;
    protected onSimulate(position: number, velocity: number): void;
    setTarget(target: number): void;
    getPosition(): number;
    reset(position?: number): void;
}
