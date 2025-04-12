import { Scene, Engine, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3, Mesh } from '@babylonjs/core';
import { Vehicle } from './Vehicle';
import { Flag } from './Flag';
import { PhysicsState } from '@shared/physics/types';

export class GameScene {
    private scene: Scene;
    private engine: Engine;
    private camera!: ArcRotateCamera;
    private vehicles: Map<string, Vehicle> = new Map();
    private flags: Map<number, Flag> = new Map();
    private ground!: Mesh;

    constructor(canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        this.setupCamera();
        this.setupLights();
        this.setupGround();
    }

    private setupCamera(): void {
        this.camera = new ArcRotateCamera(
            "camera",
            -Math.PI / 2,
            Math.PI / 2.5,
            10,
            new Vector3(0, 0, 0),
            this.scene
        );
        this.camera.attachControl(this.engine.getRenderingCanvas(), true);
    }

    private setupLights(): void {
        const light = new HemisphericLight(
            "light",
            new Vector3(0, 1, 0),
            this.scene
        );
        light.intensity = 0.7;
    }

    private setupGround(): void {
        this.ground = MeshBuilder.CreateGround(
            "ground",
            { width: 100, height: 100 },
            this.scene
        );
        const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
        this.ground.material = groundMaterial;
    }

    public addVehicle(id: string, vehicle: Vehicle): void {
        this.vehicles.set(id, vehicle);
    }

    public removeVehicle(id: string): void {
        const vehicle = this.vehicles.get(id);
        if (vehicle) {
            vehicle.dispose();
            this.vehicles.delete(id);
        }
    }

    public addFlag(team: number, flag: Flag): void {
        this.flags.set(team, flag);
    }

    public updateFlagState(team: number, flag: Flag): void {
        const existingFlag = this.flags.get(team);
        if (existingFlag) {
            existingFlag.setPosition(new Vector3(flag.x, flag.y, flag.z));
            existingFlag.carriedBy = flag.carriedBy;
            existingFlag.atBase = flag.atBase;
        }
    }

    public removeFlag(team: number): void {
        const flag = this.flags.get(team);
        if (flag) {
            this.flags.delete(team);
        }
    }

    public getFlag(team: number): Flag | undefined {
        return this.flags.get(team);
    }

    public render(): void {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    public dispose(): void {
        this.scene.dispose();
        this.engine.dispose();
    }

    public getScene(): Scene {
        return this.scene;
    }
} 