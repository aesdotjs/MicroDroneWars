
import { TransformNode } from "babylonjs";

import { Actor } from "../../types";
import { Quat, Vec3, quat, vec3 } from "../math/exports";
import { assert_babylon_quaternion } from "../tools/assert_babylon_quaternion";

/** a synchronized partnership between a rapier object and a babylon object. */
export class Bond<A extends Actor = any, M extends TransformNode = any> {
	constructor(public actor: A, public mimic: M) {
		this.move_babylon_mimic_to_rapier_coordinates()
	}

	get position() {
		return vec3.from.xyz(this.actor.translation())
	}

	set position(v: Vec3) {
		this.actor.setTranslation(vec3.to.xyz(v), true)
		this.mimic.position.set(...v)
	}

	get rotation() {
		return quat.from.xyzw(this.actor.rotation())
	}

	set rotation(q: Quat) {
		this.actor.setRotation(quat.to.xyzw(q), true)
		assert_babylon_quaternion(this.mimic).set(...q)
	}

	move_babylon_mimic_to_rapier_coordinates() {
		this.mimic.position.set(...vec3.from.xyz(
			this.actor.translation()
		))
		assert_babylon_quaternion(this.mimic).set(...quat.from.xyzw(
			this.actor.rotation()
		))
	}
}
