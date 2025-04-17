import { Quaternion, TransformNode } from "babylonjs"

export function assert_babylon_quaternion(transform: TransformNode) {
	return transform.rotationQuaternion ?? (
		transform.rotationQuaternion = Quaternion.RotationYawPitchRoll(
			transform.rotation.y,
			transform.rotation.x,
			transform.rotation.z,
		)
	)
}