import * as CANNON from 'cannon';
import { Vector3, Quaternion } from 'babylonjs';
import { PhysicsState, PhysicsConfig, PhysicsInput } from './types';
import { SpringSimulator } from '../utils/SpringSimulator';

export abstract class BasePhysicsController {
    protected body: CANNON.Body;
    protected world: CANNON.World;
    protected config: PhysicsConfig;
    protected springSimulator: SpringSimulator;
    protected aileronSimulator: SpringSimulator;
    protected elevatorSimulator: SpringSimulator;
    protected rudderSimulator: SpringSimulator;
    protected steeringSimulator: SpringSimulator;
    protected enginePower: number = 0;
    protected maxEnginePower: number = 1.0;
    protected enginePowerChangeRate: number = 0.2;
    protected lastDrag: number = 0;

    constructor(world: CANNON.World, config: PhysicsConfig) {
        this.world = world;
        this.config = config;
        
        // Initialize physics body
        this.body = new CANNON.Body({
            mass: config.mass,
            material: new CANNON.Material('vehicleMaterial')
        });
        
        // Add body to world
        this.world.addBody(this.body);
        
        // Initialize spring simulators
        this.springSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.aileronSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.elevatorSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.rudderSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.steeringSimulator = new SpringSimulator(60, 0.1, 0.3);
    }

    abstract update(deltaTime: number, input: PhysicsInput): void;

    getState(): PhysicsState | null {
        if (!this.body) return null;
        
        return {
            position: new Vector3(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            ),
            quaternion: new Quaternion(
                this.body.quaternion.x,
                this.body.quaternion.y,
                this.body.quaternion.z,
                this.body.quaternion.w
            ),
            linearVelocity: new Vector3(
                this.body.velocity.x,
                this.body.velocity.y,
                this.body.velocity.z
            ),
            angularVelocity: new Vector3(
                this.body.angularVelocity.x,
                this.body.angularVelocity.y,
                this.body.angularVelocity.z
            )
        };
    }

    setState(state: PhysicsState): void {
        if (!this.body) return;
        
        this.body.position.set(
            state.position.x,
            state.position.y,
            state.position.z
        );
        
        this.body.quaternion.set(
            state.quaternion.x,
            state.quaternion.y,
            state.quaternion.z,
            state.quaternion.w
        );
        
        this.body.velocity.set(
            state.linearVelocity.x,
            state.linearVelocity.y,
            state.linearVelocity.z
        );
        
        this.body.angularVelocity.set(
            state.angularVelocity.x,
            state.angularVelocity.y,
            state.angularVelocity.z
        );
    }

    cleanup(): void {
        if (this.body) {
            this.world.remove(this.body);
        }
    }

    protected updateEnginePower(input: PhysicsInput): void {
        if (input.up) {
            this.enginePower = Math.min(this.enginePower + this.enginePowerChangeRate, this.maxEnginePower);
        } else if (input.down) {
            this.enginePower = Math.max(this.enginePower - this.enginePowerChangeRate, 0);
        }
    }

    protected getOrientationVectors(): { forward: Vector3; right: Vector3; up: Vector3 } {
        const forward = new Vector3(0, 0, 1);
        const right = new Vector3(1, 0, 0);
        const up = new Vector3(0, 1, 0);
        
        const quaternion = new Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
        
        forward.rotateByQuaternionAroundPointToRef(quaternion, Vector3.Zero(), forward);
        right.rotateByQuaternionAroundPointToRef(quaternion, Vector3.Zero(), right);
        up.rotateByQuaternionAroundPointToRef(quaternion, Vector3.Zero(), up);
        
        return { forward, right, up };
    }

    protected applyMouseControl(input: PhysicsInput, right: Vector3, up: Vector3): void {
        if (input.mouseDelta) {
            if (input.mouseDelta.x !== 0) {
                const mouseXEffect = input.mouseDelta.x * 0.005;
                this.body.angularVelocity.x += up.x * mouseXEffect;
                this.body.angularVelocity.y += up.y * mouseXEffect;
                this.body.angularVelocity.z += up.z * mouseXEffect;
            }
            if (input.mouseDelta.y !== 0) {
                const mouseYEffect = input.mouseDelta.y * 0.005;
                this.body.angularVelocity.x += right.x * mouseYEffect;
                this.body.angularVelocity.y += right.y * mouseYEffect;
                this.body.angularVelocity.z += right.z * mouseYEffect;
            }
        }
    }

    protected applyAngularDamping(damping: number = 0.97): void {
        this.body.angularVelocity.x *= damping;
        this.body.angularVelocity.y *= damping;
        this.body.angularVelocity.z *= damping;
    }

    getBody(): CANNON.Body {
        return this.body;
    }
} 