import rapier from "@dimforge/rapier3d-deterministic-compat";

export default async function initRapier3D() {
    await rapier.init();
}