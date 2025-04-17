
export type Quat = [number, number, number, number]
export type Xyzw = {x: number, y: number, z: number, w: number}

export const to = Object.freeze({
	xyzw: ([x, y, z, w]: Quat): Xyzw => ({x, y, z, w}),
})

export const from = Object.freeze({
	xyzw: ({x, y, z, w}: Xyzw): Quat => [x, y, z, w]
})

export function identity(): Quat {
	return [0, 0, 0, 1]
}

export function multiply(quat: Quat, ...quats: Quat[]): Quat {
	let [x, y, z, w] = quat
	for (const [x2, y2, z2, w2] of quats) {
		x = w * x2 + x * w2 + y * z2 - z * y2
		y = w * y2 - x * z2 + y * w2 + z * x2
		z = w * z2 + x * y2 - y * x2 + z * w2
		w = w * w2 - x * x2 - y * y2 - z * z2
	}
	return [x, y, z, w]
}

