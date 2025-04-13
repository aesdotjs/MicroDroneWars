import * as CANNON from 'cannon';
import { Vector3 } from 'babylonjs';
import { VehiclePhysicsConfig, PhysicsInput } from './types';
import { BasePhysicsController } from './BasePhysicsController';

export class DronePhysicsController extends BasePhysicsController {
    protected config: VehiclePhysicsConfig;
    private motorPositions: { [key: string]: Vector3 };
    private motorThrust: { [key: string]: number };
    private motorSpeed: { [key: string]: number };
    private hoverForce: number = 9.81;

    constructor(world: CANNON.World, config: VehiclePhysicsConfig) {
        super(world, config);
        this.config = config;

        // Initialize motor properties
        this.motorPositions = {
            frontLeft: new Vector3(-1.2, 0, 1.2),
            frontRight: new Vector3(1.2, 0, 1.2),
            backLeft: new Vector3(-1.2, 0, -1.2),
            backRight: new Vector3(1.2, 0, -1.2)
        };

        this.motorThrust = {
            frontLeft: 0,
            frontRight: 0,
            backLeft: 0,
            backRight: 0
        };

        this.motorSpeed = {
            frontLeft: this.hoverForce,
            frontRight: this.hoverForce,
            backLeft: this.hoverForce,
            backRight: this.hoverForce
        };
    }

    public update(deltaTime: number, input: PhysicsInput): void {
        // // Log only if there's any active input
        // if (Object.values(input).some(value => 
        //     value === true || 
        //     (typeof value === 'object' && value.x !== 0 && value.y !== 0)
        // )) {
        //     console.log('DronePhysicsController Update - Input:', {
        //         input,
        //         currentPosition: this.body.position,
        //         currentVelocity: this.body.velocity
        //     });
        // }

        this.updateEnginePower(input);
        const { right, up, forward } = this.getOrientationVectors();

        // Calculate velocity and speed
        const velocity = new Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
        const speed = velocity.length();

        // Vertical stabilization with gravity compensation
        const gravity = this.world.gravity;
        let gravityCompensation = new Vector3(-gravity.x, -gravity.y, -gravity.z).normalize();
        gravityCompensation.scaleInPlace(deltaTime);
        gravityCompensation.scaleInPlace(0.98);
        
        // Calculate dot product for gravity compensation
        const globalUp = new Vector3(0, 1, 0);
        const dot = Vector3.Dot(globalUp, up);
        gravityCompensation.scaleInPlace(Math.sqrt(Math.max(0, Math.min(dot, 1))));

        // Vertical damping
        const vertDamping = new Vector3(0, this.body.velocity.y, 0).scale(-0.01);
        const vertStab = up.clone();
        vertStab.scaleInPlace(gravityCompensation.length());
        vertStab.addInPlace(vertDamping);
        vertStab.scaleInPlace(this.enginePower);

        this.body.velocity.x += vertStab.x;
        this.body.velocity.y += vertStab.y;
        this.body.velocity.z += vertStab.z;

        // Positional damping
        this.body.velocity.x *= 0.995;
        this.body.velocity.z *= 0.995;

        // Apply main thrust
        if (input.up) {
            this.body.velocity.x += up.x * 0.15 * this.enginePower;
            this.body.velocity.y += up.y * 0.15 * this.enginePower;
            this.body.velocity.z += up.z * 0.15 * this.enginePower;
        } else if (input.down) {
            this.body.velocity.x -= up.x * 0.15 * this.enginePower;
            this.body.velocity.y -= up.y * 0.15 * this.enginePower;
            this.body.velocity.z -= up.z * 0.15 * this.enginePower;
        }

        // Apply pitch control
        if (input.pitchUp) {
            this.body.angularVelocity.x += right.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y += right.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z += right.z * 0.07 * this.enginePower;
        } else if (input.pitchDown) {
            this.body.angularVelocity.x -= right.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y -= right.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z -= right.z * 0.07 * this.enginePower;
        }

        // Apply roll control
        if (input.rollLeft) {
            this.body.angularVelocity.x += forward.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y += forward.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z += forward.z * 0.07 * this.enginePower;
        } else if (input.rollRight) {
            this.body.angularVelocity.x -= forward.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y -= forward.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z -= forward.z * 0.07 * this.enginePower;
        }

        // Apply yaw control
        if (input.left) {
            this.body.angularVelocity.x -= up.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y -= up.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z -= up.z * 0.07 * this.enginePower;
        } else if (input.right) {
            this.body.angularVelocity.x += up.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y += up.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z += up.z * 0.07 * this.enginePower;
        }

        // Apply mouse control
        this.applyMouseControl(input, right, up);

        // Apply angular damping
        this.applyAngularDamping();
    }
} 