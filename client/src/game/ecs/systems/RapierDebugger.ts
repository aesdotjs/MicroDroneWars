import { Scene, Vector3, Color4, MeshBuilder, LinesMesh } from '@babylonjs/core';
import RAPIER from '@dimforge/rapier3d-deterministic-compat';

export class RapierDebugger {
    private scene: Scene;
    private world: RAPIER.World;
    private lineSystem: LinesMesh | null = null;
    private lastVertexCount: number = 0;

    constructor(scene: Scene, world: RAPIER.World) {
        this.scene = scene;
        this.world = world;
    }

    update() {
        const { vertices, colors } = this.world.debugRender();
        if (!vertices || vertices.length === 0) {
            if (this.lineSystem) {
                this.lineSystem.setEnabled(false);
            }
            return;
        }
        const debugLines: Vector3[] = [];
        const debugColors: Color4[] = [];
        for (let i = 0; i < vertices.length; i += 6) {
            // Each line: (x1, y1, z1, x2, y2, z2)
            debugLines.push(new Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
            debugLines.push(new Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]));
            // Each color: (r, g, b, a) for each endpoint
            const colorIndex = (i / 3) * 2;
            if (colors && colors.length >= colorIndex + 8) {
                debugColors.push(new Color4(colors[colorIndex], colors[colorIndex + 1], colors[colorIndex + 2], colors[colorIndex + 3]));
                debugColors.push(new Color4(colors[colorIndex + 4], colors[colorIndex + 5], colors[colorIndex + 6], colors[colorIndex + 7]));
            } else {
                debugColors.push(new Color4(1, 1, 1, 1));
                debugColors.push(new Color4(1, 1, 1, 1));
            }
        }
        // Group lines into pairs for Babylon's line system
        const lines: Vector3[][] = [];
        const colorsPerLine: Color4[][] = [];
        for (let i = 0; i < debugLines.length; i += 2) {
            lines.push([debugLines[i], debugLines[i + 1]]);
            colorsPerLine.push([debugColors[i], debugColors[i + 1]]);
        }
        if (!this.lineSystem) {
            this.lineSystem = MeshBuilder.CreateLineSystem('rapierDebugLines', {
                lines,
                colors: colorsPerLine,
                updatable: true
            }, this.scene) as LinesMesh;
        } else {
            MeshBuilder.CreateLineSystem('rapierDebugLines', {
                lines,
                colors: colorsPerLine,
                instance: this.lineSystem
            });
            this.lineSystem.setEnabled(true);
        }
    }

    dispose() {
        if (this.lineSystem) {
            this.lineSystem.dispose();
            this.lineSystem = null;
        }
    }
} 