
import {Vec2} from "./vec2.js"

//
// units and conversions
//

export const pi = Math.PI
export const circle = 2 * Math.PI

export const radians = {
	circle,
	to: {
		degrees(r: number) {
			return r * (180 / pi)
		},
		arcseconds(r: number) {
			return radians.to.degrees(r) * 3600
		},
		turns(r: number) {
			return r / circle
		}
	},
	from: {
		turns(t: number) {
			return t * circle
		},
		degrees(d: number) {
			return d * (pi / 180)
		},
		arcseconds(a: number) {
			return radians.from.degrees(a / 3600)
		},
	},
}

//
// constraints and boundaries
//

// TODO rename to `under`
/** clip a number so it "bottoms-out" (eg, return min if n is less than min). */
export function bottom(n: number, min: number = 0) {
	return n < min
		? min
		: n
}

// TODO rename to `over`
/** clip a number so it "tops-out" (eg, return max if n is more than max). */
export function top(n: number, max: number = 1) {
	return n > max
		? max
		: n
}

/** clamp a number within a range. */
export function clamp(n: number, min: number = 0, max: number = 1) {
	const amin = Math.min(min, max)
	const amax = Math.max(min, max)
	return n < amin
		? amin
		: n > amax
			? amax
			: n
}

/** linear interpolate between two numbers. */
export function lerp(fraction: number, a: number, b: number) {
	const difference = b - a
	const value = difference * fraction
	return a + value
}

/** return true is n is between a and b, otherwise return false. */
export function within(n: number, a: number = 0, b: number = 1) {
	const min = Math.min(a, b)
	const max = Math.max(a, b)
	return (n >= min) && (n <= max)
}

/** if the number exceeds the range, it wraps around to the other side. */
export function wrap(n: number, a: number = 0, b: number = 1) {
	const min = Math.min(a, b)
	const max = Math.max(a, b)
	const span = max - min
	const adjusted = n - min
	const wrapped = (adjusted < 0)
		? span - (-adjusted % span)
		: adjusted % span
	return min + wrapped
}

export function proximal(a: number, b: number, epsilon: number = 0.01) {
	return Math.abs(a - b) <= epsilon
}

// TODO rename to "nearclamp"
/** enforce that a proposed number is near the base number. */
export function nearby(base: number, proposal: number, maxDiff: number) {
	const trueDiff = proposal - base
	const positiveDiff = Math.abs(trueDiff)
	const cappedDiff = (positiveDiff > maxDiff) ? maxDiff : positiveDiff
	const newDiff = (trueDiff < 0) ? -cappedDiff : cappedDiff
	return base + newDiff
}

//
// transformations and mappings
//

/** flip a number between 0 and 1 to the other side (eg, 0.9 returns 0.1). */
export function inverse(n: number) {
	return 1 - n
}

/** remap a number from [0,1] range to [-1,1] (making 0.0 the centerpoint). */
export function center(x: number) {
	return (x * 2) - 1
}

/** remap a number from [-1,1] range to [0,1] (making 0.5 the centerpoint). */
export function uncenter(x: number) {
	return (x + 1) / 2
}

/** linear interpolate between two numbers in a vector. */
export function map(fraction: number, [a, b]: Vec2) {
	const difference = b - a
	const value = difference * fraction
	return a + value
}

/** remap a number from one range to another. */
export function remap(n: number, [a1, a2]: Vec2, [b1, b2]: Vec2 = [0, 1]) {
	const fraction = (n - a1) / (a2 - a1)
	return (fraction * (b2 - b1)) + b1
}

/** make values near 0.5 more likely. */
export function magnify(x: number) {
	return 4 * Math.pow(x - 0.5, 3) + 0.5
}

