import * as CANNON from 'cannon';
import { Vector3, Quaternion } from 'babylonjs';
import { VehiclePhysicsConfig, PhysicsInput } from './types';
import { BasePhysicsController } from './BasePhysicsController';

/**
 * Physics controller for plane vehicles.
 * Implements plane-specific physics including flight dynamics, lift, drag, and control surfaces.
 * Handles realistic flight behavior with features like:
 * - Aerodynamic lift and drag
 * - Flight mode transitions
 * - Control surface simulation
 * - Engine power management
 * - Rotation stabilization
 */
export class PlanePhysicsController extends BasePhysicsController {
    protected config: VehiclePhysicsConfig;
    protected enginePower: number = 0;
    protected lastDrag: number = 0;

    /**
     * Creates a new PlanePhysicsController instance.
     * @param world - The CANNON.js physics world
     * @param config - Configuration for the plane physics
     */
    constructor(world: CANNON.World, config: VehiclePhysicsConfig) {
        super(world, config);
        this.config = config;
    }

    /**
     * Updates the plane physics based on input.
     * Handles flight dynamics including:
     * - Engine power management
     * - Flight mode transitions
     * - Control surface simulation
     * - Aerodynamic forces (lift, drag)
     * - Rotation stabilization
     * @param deltaTime - Time elapsed since last update in seconds
     * @param input - Physics input from the player
     */
    public update(deltaTime: number, input: PhysicsInput): void {
        this.currentTick++;
        this.updateEnginePower(input);
        const { right, up, forward } = this.getOrientationVectors();
        
        // Calculate velocity and speed
        const velocity = new Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
        const currentSpeed = Vector3.Dot(velocity, new Vector3(forward.x, forward.y, forward.z));

        // Flight mode influence based on speed
        let flightModeInfluence = currentSpeed / 10;
        flightModeInfluence = Math.min(Math.max(flightModeInfluence, 0), 1);

        // Mass adjustment based on speed
        let lowerMassInfluence = currentSpeed / 10;
        lowerMassInfluence = Math.min(Math.max(lowerMassInfluence, 0), 1);
        this.body.mass = this.config.mass * (1 - (lowerMassInfluence * 0.6));

        // Scale control inputs by deltaTime and 60fps for consistent behavior
        const controlScale = deltaTime * 60;

        // Rotation stabilization
        let lookVelocity = velocity.clone();
        const velLength = lookVelocity.length();
        
        if (velLength > 0.1) {
            lookVelocity.normalize();
            
            const rotStabVelocity = new Quaternion();
            const axis = new Vector3();
            const dot = Vector3.Dot(new Vector3(forward.x, forward.y, forward.z), lookVelocity);
            
            const clampedDot = Math.max(-1, Math.min(1, dot));
            const angle = Math.acos(clampedDot);
            
            if (angle > 0.001) {
                Vector3.CrossToRef(new Vector3(forward.x, forward.y, forward.z), lookVelocity, axis);
                const axisLength = axis.length();
                
                if (axisLength > 0.001) {
                    axis.normalize();
                    Quaternion.RotationAxisToRef(axis, angle, rotStabVelocity);
                    
                    rotStabVelocity.x *= 0.3;
                    rotStabVelocity.y *= 0.3;
                    rotStabVelocity.z *= 0.3;
                    rotStabVelocity.w *= 0.3;
                    
                    const rotStabEuler = new Vector3();
                    let euler = new Vector3();
                    euler = rotStabVelocity.toEulerAngles();
                    rotStabEuler.copyFrom(euler);
                    
                    let rotStabInfluence = Math.min(Math.max(velLength - 1, 0), 0.1);
                    let loopFix = (input.up && currentSpeed > 0 ? 0 : 1);
                    
                    this.body.angularVelocity.x += rotStabEuler.x * rotStabInfluence * loopFix;
                    this.body.angularVelocity.y += rotStabEuler.y * rotStabInfluence;
                    this.body.angularVelocity.z += rotStabEuler.z * rotStabInfluence * loopFix;
                }
            }
        }

        // Apply pitch control
        if (input.pitchUp) {
            this.body.angularVelocity.x -= right.x * 0.04 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.y -= right.y * 0.04 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.z -= right.z * 0.04 * flightModeInfluence * this.enginePower * controlScale;
        } else if (input.pitchDown) {
            this.body.angularVelocity.x += right.x * 0.04 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.y += right.y * 0.04 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.z += right.z * 0.04 * flightModeInfluence * this.enginePower * controlScale;
        }

        // Apply yaw control
        if (input.left) {
            this.body.angularVelocity.x -= up.x * 0.02 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.y -= up.y * 0.02 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.z -= up.z * 0.02 * flightModeInfluence * this.enginePower * controlScale;
        } else if (input.right) {
            this.body.angularVelocity.x += up.x * 0.02 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.y += up.y * 0.02 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.z += up.z * 0.02 * flightModeInfluence * this.enginePower * controlScale;
        }

        // Apply roll control
        if (input.rollLeft) {
            this.body.angularVelocity.x += forward.x * 0.055 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.y += forward.y * 0.055 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.z += forward.z * 0.055 * flightModeInfluence * this.enginePower * controlScale;
        } else if (input.rollRight) {
            this.body.angularVelocity.x -= forward.x * 0.055 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.y -= forward.y * 0.055 * flightModeInfluence * this.enginePower * controlScale;
            this.body.angularVelocity.z -= forward.z * 0.055 * flightModeInfluence * this.enginePower * controlScale;
        }

        // Apply mouse control
        this.applyMouseControl(input, right, up);

        // Thrust
        let speedModifier = 0.02;
        if (input.up && !input.down) {
            speedModifier = 0.06;
        } else if (!input.up && input.down) {
            speedModifier = -0.05;
        }

        // Scale thrust by deltaTime
        const thrustScale = deltaTime * 60;
        this.body.velocity.x += (velLength * this.lastDrag + speedModifier) * forward.x * this.enginePower * thrustScale;
        this.body.velocity.y += (velLength * this.lastDrag + speedModifier) * forward.y * this.enginePower * thrustScale;
        this.body.velocity.z += (velLength * this.lastDrag + speedModifier) * forward.z * this.enginePower * thrustScale;

        // Drag
        const drag = Math.pow(velLength, 1) * 0.003 * this.enginePower;
        this.body.velocity.x -= this.body.velocity.x * drag;
        this.body.velocity.y -= this.body.velocity.y * drag;
        this.body.velocity.z -= this.body.velocity.z * drag;
        this.lastDrag = drag;

        // Lift
        let lift = Math.pow(velLength, 1) * 0.005 * this.enginePower;
        lift = Math.min(Math.max(lift, 0), 0.05);
        this.body.velocity.x += up.x * lift * thrustScale;
        this.body.velocity.y += up.y * lift * thrustScale;
        this.body.velocity.z += up.z * lift * thrustScale;

        // Apply angular damping with flight mode influence
        this.applyAngularDamping(1 - 0.02 * flightModeInfluence);

        // Add extra damping to prevent continuous rotation
        this.applyAngularDamping(0.95);
    }
} 