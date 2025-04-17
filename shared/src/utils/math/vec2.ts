
import {clamp as scalarClamp} from "./scalar.js"

export type Vec2 = [number, number]

export function as(v: Vec2) {
	return v
}

export function zero(): Vec2 {
	return [0, 0]
}

export function equal(a: Vec2, b: Vec2, ...c: Vec2[]) {
	const [x, y] = a
	for (const d of [b, ...c]) {
		const [x2, y2] = d
		if (x !== x2 || y !== y2)
			return false
	}
	return true
}

export function rotate([x, y]: Vec2, radians: number): Vec2 {
	return [
		(x * Math.cos(radians)) - (y * Math.sin(radians)),
		(x * Math.sin(radians)) + (y * Math.cos(radians)),
	]
}

export function dot(a: Vec2, b: Vec2): number {
	return (a[0] * b[0]) + (a[1] * b[1])
}

export function distance([x1, y1]: Vec2, [x2, y2]: Vec2): number {
	const x = x1 - x2
	const y = y1 - y2
	return Math.sqrt((x * x) + (y * y))
}

export function atan2([ax, ay]: Vec2, [bx, by]: Vec2): number {
	return Math.atan2(by, bx) - Math.atan2(ay, ax)
}

export function magnitude([x, y]: Vec2): number {
	return Math.sqrt(
		x * x +
		y * y
	)
}

export function add([x, y]: Vec2, ...vectors: Vec2[]): Vec2 {
	for (const vector of vectors) {
		x += vector[0]
		y += vector[1]
	}
	return [x, y]
}

export function multiply(a: Vec2, b: Vec2): Vec2 {
	return [
		a[0] * b[0],
		a[1] * b[1],
	]
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
	return [
		a[0] - b[0],
		a[1] - b[1],
	]
}

export function normalize(vector: Vec2): Vec2 {
	const length = magnitude(vector)
	const [x, y] = vector
	return length === 0
		? vector
		: [
			x / length,
			y / length,
		]
}

export function applyBy(vector: Vec2, change: (a: number) => number): Vec2 {
	return [
		change(vector[0]),
		change(vector[1]),
	]
}

export function clamp(vector: Vec2, min: number, max: number) {
	return applyBy(vector, a => scalarClamp(a, min, max))
}

export function negate(vector: Vec2): Vec2 {
	return applyBy(vector, a => a * -1)
}

export function multiplyBy(vector: Vec2, factor: number): Vec2 {
	return applyBy(vector, a => a * factor)
}

export const scale = multiplyBy

export function divideBy(vector: Vec2, factor: number): Vec2 {
	return applyBy(vector, a => a / factor)
}

export function addBy(vector: Vec2, amount: number): Vec2 {
	return applyBy(vector, a => a + amount)
}

