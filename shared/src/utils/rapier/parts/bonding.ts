
import { Bond } from "../bond";
import { Actor } from "../../../types";
import { TransformNode } from "babylonjs";

export class PhysicsBonding {
	#bonds = new Set<Bond>;

	create<A extends Actor, M extends TransformNode>(actor: A, mimic: M) {
		return this.add(new Bond(actor, mimic));
	}

	add<B extends Bond>(bond: B) {
		this.#bonds.add(bond);
		return bond;
	}

	remove(bond: Bond) {
		this.#bonds.delete(bond);
	}

	synchronize() {
		for (const bond of this.#bonds)
			bond.move_babylon_mimic_to_rapier_coordinates();
	}
}