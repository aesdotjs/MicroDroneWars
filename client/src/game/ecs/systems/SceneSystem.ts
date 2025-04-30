import { Scene, Engine, Vector3, HemisphericLight, ArcRotateCamera, Color4, Quaternion, MeshBuilder, StandardMaterial, Color3, DirectionalLight, ShadowGenerator, GlowLayer, Vector2 } from '@babylonjs/core';

import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';

/**
 * Creates a system that handles scene initialization, setup, and rendering
 */
export function createSceneSystem(engine: Engine) {
    console.log('Creating scene system...');
    // Create scene
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.1, 0.1, 0.1, 1);
    console.log('Scene created');

    // Initialize scene components
    console.log('Setting up lights...');
    const shadowGenerator = setupLights(scene);
    console.log('Lights setup complete');

    console.log('Setting up camera...');
    const camera = setupCamera(scene, engine);
    console.log('Camera setup complete');

    console.log('Setting up glow layer...');
    const glowLayer = setupGlowLayer(scene);
    console.log('Glow layer setup complete');

    console.log('Setting up environment...');
    console.log('Environment setup complete');

    // Find entities that need rendering (either with assets or with direct mesh creation)
    const renderables = ecsWorld.with("transform").where(entity => 
        Boolean(
            (entity.asset && !entity.render) || // Entities with assets that need mesh creation
            (entity.render && entity.render.mesh) // Entities with existing meshes
        )
    );

    return {
        getScene: () => scene,
        getCamera: () => camera,
        getShadowGenerator: () => shadowGenerator,
        getGlowLayer: () => glowLayer,
        update: () => {
            // Update entity positions and rotations
            for (const entity of renderables) {
                if (!entity.transform) continue;
                // Handle asset-based mesh creation
                if (entity.asset?.isLoaded && entity.asset.meshes && !entity.render) {
                    console.log('Creating mesh for entity:', entity.id);
                    console.log('Entity asset:', entity.asset.meshes);
                    const mainMesh = entity.asset.meshes[0].clone(`${entity.id}_mesh`, null);
                    
                    // Apply transformations
                    mainMesh.scaling = new Vector3(entity.asset.scale, entity.asset.scale, entity.asset.scale);
                    mainMesh.rotationQuaternion = entity.transform.rotation;
                    mainMesh.position = entity.transform.position;
                    entity.render = { mesh: mainMesh };
                    ecsWorld.reindex(entity);
                    // Add to shadow generator
                    shadowGenerator.addShadowCaster(mainMesh);
                }

                // Update position and rotation for all entities with meshes
                if (entity.render?.mesh) {
                    entity.render.mesh.position.copyFrom(entity.transform.position);
                    if (entity.transform.rotation) {
                        entity.render.mesh.rotationQuaternion = entity.transform.rotation;
                    }
                }
            }
        },
        render: () => {
            scene.render();
        },
        dispose: () => {
            console.log('Disposing scene...');
            scene.dispose();
            console.log('Scene disposed');
        }
    };
}

/**
 * Sets up the lighting for the scene
 */
function setupLights(scene: Scene): ShadowGenerator {
    // Main hemispheric light for ambient lighting
    const hemiLight = new HemisphericLight(
        "hemiLight",
        new Vector3(0, 1, 0),
        scene
    );
    hemiLight.intensity = 1.0;
    hemiLight.groundColor = new Color3(0.2, 0.2, 0.2);
    
    // Directional light for shadows and directional lighting
    const dirLight = new DirectionalLight(
        "dirLight",
        new Vector3(-1, -2, -1),
        scene
    );
    dirLight.position = new Vector3(20, 40, 20);
    dirLight.intensity = 0.7;
    
    // Enable shadows
    const shadowGenerator = new ShadowGenerator(1024, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurScale = 2;
    shadowGenerator.setDarkness(0.2);

    return shadowGenerator;
}

/**
 * Sets up the camera for the scene
 */
function setupCamera(scene: Scene, engine: Engine): ArcRotateCamera {
    try {
        console.log('Setting up camera...');
        // Create an ArcRotateCamera with initial position
        const camera = new ArcRotateCamera(
            "camera",
            0, // alpha
            1, // beta
            10, // radius
            Vector3.Zero(),
            scene
        );
        
        // Configure camera settings
        camera.minZ = 0.1;
        camera.speed = 0.5;
        camera.angularSensibilityX = 5000;
        camera.angularSensibilityY = 5000;
        camera.inertia = 0.9;
        camera.fov = 1.2;
        
        // Set target offset
        camera.targetScreenOffset = new Vector2(-0.5, -1);
        
        // Remove default inputs and disable camera controls
        camera.inputs.clear();
        camera.detachControl();
        
        console.log('Camera setup complete:', {
            position: camera.position,
            target: camera.target,
            fov: camera.fov
        });

        return camera;
    } catch (error) {
        console.error('Camera setup error:', error);
        throw error;
    }
}

/**
 * Sets up the glow layer for the scene
 */
function setupGlowLayer(scene: Scene): GlowLayer {
    const glowLayer = new GlowLayer('glow', scene);
    glowLayer.intensity = 0.5;
    return glowLayer;
}