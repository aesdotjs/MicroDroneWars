
export type Random = () => number

/** utility for generating and using random numbers. */
export class Rand {
	constructor(public readonly random: Random) {}

	/** make a pseudo-random number generator function that produces numbers between 0 and 1. */
	static random(seed: number): Random {
		seed = 1_234 + Math.floor(seed * 1_234)
		function random() {
			seed = Math.imul(48271, seed) | 0 % 2147483647
			return (seed & 2147483647) / 2147483648
		}
		random() // discard first value
		return random
	}

	/** create a Rand instance with the given seed number. */
	static seed(seed: number): Rand {
		return new this(this.random(seed))
	}

	/** return true or false, given a 0 to 1 probability fraction. */
	roll(chance: number) {
		return this.random() <= chance
	}

	/** generate a random number in between two numbers. */
	between(a: number, b: number) {
		const difference = b - a
		const value = difference * this.random()
		return a + value
	}

	/** randomly choose an index given an array length. */
	index(length: number) {
		return Math.floor(this.random() * length)
	}

	/** return a random item from the given array. */
	choose<T>(array: T[]) {
		return array[this.index(array.length)]
	}

	/** remove and return a random item from the given array. */
	yoink<T>(array: T[]) {
		const index = this.index(array.length)
		const [item] = array.splice(index, 1)
		return item
	}

	/** remove and return multiple items from the given array. */
	extract<T>(count: number, array: T[]) {
		const copy = [...array]

		if (count >= array.length)
			return copy

		const selection: T[] = []

		for (let i = 0; i < count; i++)
			selection.push(this.yoink(copy))

		return selection
	}
}

