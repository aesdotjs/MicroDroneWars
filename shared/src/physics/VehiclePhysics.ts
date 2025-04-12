import * as CANNON from 'cannon';
import { PhysicsInput, VehicleConfig } from '../types';

export class VehiclePhysics {
    private body: CANNON.Body;
    private config: VehicleConfig;
    private enginePower: number = 0;
    private maxEnginePower: number = 1.0;
    private enginePowerChangeRate: number = 0.2;

    constructor(body: CANNON.Body, config: VehicleConfig) {
        this.body = body;
        this.config = config;
    }

    public update(deltaTime: number, input: PhysicsInput) {
        // Update engine power
        if (input.up) {
            this.enginePower = Math.min(this.enginePower + deltaTime * this.enginePowerChangeRate, this.maxEnginePower);
        } else if (input.down) {
            this.enginePower = Math.max(this.enginePower - deltaTime * this.enginePowerChangeRate, 0);
        }

        // Get orientation vectors
        const right = new CANNON.Vec3(1, 0, 0);
        const up = new CANNON.Vec3(0, 1, 0);
        const forward = new CANNON.Vec3(0, 0, 1);
        this.body.vectorToWorldFrame(right, right);
        this.body.vectorToWorldFrame(up, up);
        this.body.vectorToWorldFrame(forward, forward);

        // Apply vehicle-specific physics
        if (this.config.vehicleType === 'drone') {
            this.applyDronePhysics(deltaTime, input, right, up, forward);
        } else {
            this.applyPlanePhysics(deltaTime, input, right, up, forward);
        }
    }

    private applyDronePhysics(deltaTime: number, input: PhysicsInput, right: CANNON.Vec3, up: CANNON.Vec3, forward: CANNON.Vec3) {
        // Vertical stabilization
        const gravityCompensation = 9.81 * deltaTime * 0.98;
        const vertStab = up.clone();
        vertStab.scale(gravityCompensation * this.enginePower, vertStab);

        this.body.velocity.x += vertStab.x;
        this.body.velocity.y += vertStab.y;
        this.body.velocity.z += vertStab.z;

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
        if (input.mouseX !== 0) {
            const mouseXEffect = input.mouseX * 0.005;
            this.body.angularVelocity.x += up.x * mouseXEffect;
            this.body.angularVelocity.y += up.y * mouseXEffect;
            this.body.angularVelocity.z += up.z * mouseXEffect;
        }
        if (input.mouseY !== 0) {
            const mouseYEffect = input.mouseY * 0.005;
            this.body.angularVelocity.x += right.x * mouseYEffect;
            this.body.angularVelocity.y += right.y * mouseYEffect;
            this.body.angularVelocity.z += right.z * mouseYEffect;
        }

        // Angular damping
        this.body.angularVelocity.x *= 0.97;
        this.body.angularVelocity.y *= 0.97;
        this.body.angularVelocity.z *= 0.97;
    }

    private applyPlanePhysics(deltaTime: number, input: PhysicsInput, right: CANNON.Vec3, up: CANNON.Vec3, forward: CANNON.Vec3) {
        // Calculate current speed
        const velocity = new CANNON.Vec3().copy(this.body.velocity);
        const currentSpeed = velocity.dot(forward);

        // Flight mode influence based on speed
        let flightModeInfluence = currentSpeed / 10;
        flightModeInfluence = Math.min(Math.max(flightModeInfluence, 0), 1);

        // Apply pitch control
        if (input.pitchUp) {
            this.body.angularVelocity.x -= right.x * 0.04 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y -= right.y * 0.04 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z -= right.z * 0.04 * flightModeInfluence * this.enginePower;
        } else if (input.pitchDown) {
            this.body.angularVelocity.x += right.x * 0.04 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y += right.y * 0.04 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z += right.z * 0.04 * flightModeInfluence * this.enginePower;
        }

        // Apply yaw control
        if (input.left) {
            this.body.angularVelocity.x -= up.x * 0.02 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y -= up.y * 0.02 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z -= up.z * 0.02 * flightModeInfluence * this.enginePower;
        } else if (input.right) {
            this.body.angularVelocity.x += up.x * 0.02 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y += up.y * 0.02 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z += up.z * 0.02 * flightModeInfluence * this.enginePower;
        }

        // Apply roll control
        if (input.rollLeft) {
            this.body.angularVelocity.x += forward.x * 0.055 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y += forward.y * 0.055 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z += forward.z * 0.055 * flightModeInfluence * this.enginePower;
        } else if (input.rollRight) {
            this.body.angularVelocity.x -= forward.x * 0.055 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y -= forward.y * 0.055 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z -= forward.z * 0.055 * flightModeInfluence * this.enginePower;
        }

        // Apply thrust
        let speedModifier = 0.02;
        if (input.up && !input.down) {
            speedModifier = 0.06;
        } else if (!input.up && input.down) {
            speedModifier = -0.05;
        }

        this.body.velocity.x += (currentSpeed * 0.003 + speedModifier) * forward.x * this.enginePower;
        this.body.velocity.y += (currentSpeed * 0.003 + speedModifier) * forward.y * this.enginePower;
        this.body.velocity.z += (currentSpeed * 0.003 + speedModifier) * forward.z * this.enginePower;

        // Apply lift
        let lift = Math.pow(currentSpeed, 1) * 0.005 * this.enginePower;
        lift = Math.min(Math.max(lift, 0), 0.05);
        this.body.velocity.x += up.x * lift;
        this.body.velocity.y += up.y * lift;
        this.body.velocity.z += up.z * lift;

        // Angular damping
        this.body.angularVelocity.x *= (1 - 0.02 * flightModeInfluence);
        this.body.angularVelocity.y *= (1 - 0.02 * flightModeInfluence);
        this.body.angularVelocity.z *= (1 - 0.02 * flightModeInfluence);
    }
} 