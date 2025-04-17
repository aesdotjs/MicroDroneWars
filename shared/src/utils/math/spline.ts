
import {Vec2} from "./vec2.js"
import {clamp} from "./scalar.js"

/** resolve a number within a linear spline. */
export function linear(x: number, points: Vec2[]): number {
	if (points.length < 2)
		throw new Error("need at least two points, come on")

	const [first] = points.at(0)!
	const [last] = points.at(-1)!

	x = clamp(x, first, last)

	for (let i = 0; i < points.length - 1; i++) {
		const [x0, y0] = points[i]
		const [x1, y1] = points[i + 1]

		if (x >= x0 && x <= x1) {
			const t = (x - x0) / (x1 - x0)
			return y0 + t * (y1 - y0)
		}
	}

	throw new Error("x is out of bounds, what are you even doing")
}

/** resolve a number within a catmull-rom spline, that's all smooth-like. */
export function catmullRom(x: number, points: Vec2[]) {
	if (points.length < 4)
		throw new Error("need at least four points for this magic")

	x = clamp(x)

	// find the segment where 'x' fits
	for (let i = 1; i < points.length - 2; i++) {
		const [x1, ] = points[i]
		const [x2, ] = points[i + 1]

		if (x >= x1 && x <= x2) {
			const t = (x - x1) / (x2 - x1)
			return helpers.catmullRom(t, points[i - 1], points[i], points[i + 1], points[i + 2])
		}
	}

	throw new Error("x is out of bounds, try again")
}

export const ez = {

	/** simple linear spline where the control points are equally-spaced based on their array indices (x is expected to be between 0 and 1). */
	linear(x: number, points: number[]) {
		if (points.length < 2)
			throw new Error("need at least two points, come on")

		const points2 = points.map(
			(p, index): Vec2 =>
				[clamp(index / (points.length - 1)), p]
		)

		return linear(clamp(x), points2)
	}
}

namespace helpers {

	/** internal big-brain maths for the catmull-rom implementation */
	export function catmullRom(
			t: number,
			[,p0]: Vec2,
			[,p1]: Vec2,
			[,p2]: Vec2,
			[,p3]: Vec2,
		) {

		const t2 = t * t
		const t3 = t2 * t

		// coefficients for the cubic polynomial (Catmull-Rom)
		const a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3
		const b = p0 - 2.5 * p1 + 2 * p2 - 0.5 * p3
		const c = -0.5 * p0 + 0.5 * p2
		const d = p1

		return a * t3 + b * t2 + c * t + d
	}
}

