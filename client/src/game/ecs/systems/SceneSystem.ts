import { Scene, Engine, Vector3, HemisphericLight, UniversalCamera, Color4, Quaternion, MeshBuilder, StandardMaterial, Color3, DirectionalLight, ShadowGenerator, GlowLayer } from 'babylonjs';
import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';

/**
 * Creates a system that handles scene initialization and setup
 */
export function createSceneSystem(engine: Engine) {
    // Create scene
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.1, 0.1, 0.1, 1);

    // Initialize scene components
    const shadowGenerator = setupLights(scene);
    const camera = setupCamera(scene);
    const glowLayer = setupGlowLayer(scene);
    setupEnvironment(scene, shadowGenerator);

    return {
        getScene: () => scene,
        getCamera: () => camera,
        getShadowGenerator: () => shadowGenerator,
        getGlowLayer: () => glowLayer,
        dispose: () => {
            scene.dispose();
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
function setupCamera(scene: Scene): UniversalCamera {
    const camera = new UniversalCamera("camera", new Vector3(0, 5, 10), scene);
    
    // Configure camera settings
    camera.minZ = 0.1;
    camera.speed = 0.5;
    camera.angularSensibility = 5000;
    camera.inertia = 0.9;
    camera.fov = 1.2;
    
    // Remove default inputs and disable camera controls
    camera.inputs.clear();
    camera.detachControl();
    
    return camera;
}

/**
 * Sets up the glow layer for the scene
 */
function setupGlowLayer(scene: Scene): GlowLayer {
    const glowLayer = new GlowLayer('glow', scene);
    glowLayer.intensity = 0.5;
    return glowLayer;
}

/**
 * Sets up the game environment
 */
function setupEnvironment(scene: Scene, shadowGenerator: ShadowGenerator): void {
    // Create ground
    const ground = MeshBuilder.CreateGround("ground", {
        width: 200,
        height: 200
    }, scene);
    
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    groundMaterial.ambientColor = new Color3(0.3, 0.3, 0.3);
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    // Add some obstacles
    for (let i = 0; i < 10; i++) {
        const obstacle = MeshBuilder.CreateBox(`obstacle${i}`, { size: 5 }, scene);
        const obstacleMaterial = new StandardMaterial(`obstacleMaterial${i}`, scene);
        obstacleMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        obstacleMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        obstacleMaterial.ambientColor = new Color3(0.3, 0.3, 0.3);
        obstacle.material = obstacleMaterial;
        obstacle.position = new Vector3(
            Math.random() * 180 - 90,
            2.5,
            Math.random() * 180 - 90
        );
        obstacle.checkCollisions = true;
        
        // Add obstacles to shadow generator
        shadowGenerator.addShadowCaster(obstacle);
    }
} 