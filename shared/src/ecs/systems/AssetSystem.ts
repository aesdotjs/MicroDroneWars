import { Engine, NullEngine, Scene, AssetContainer, Mesh, Vector3, Quaternion, LoadAssetContainerAsync, TransformNode, AbstractMesh } from '@babylonjs/core';
import { world as ecsWorld } from '../world';
import { GameEntity, EntityType, AssetComponent, VehicleType } from '../types';
import { createPhysicsWorldSystem } from './PhysicsWorldSystem';

// Default asset paths
const DEFAULT_ASSETS = {
    [VehicleType.Drone]: {
        path: "http://localhost:2568/assets/models/drone.glb",
        type: "glb",
        scale: 1
    },
    [VehicleType.Plane]: {
        path: "http://localhost:2568/assets/models/drone.glb",
        type: "glb",
        scale: 1
    },
    [EntityType.Flag]: {
        path: "http://localhost:2568/assets/models/flag.glb",
        type: "glb",
        scale: 1
    }
};

interface MapData {
    container: AssetContainer;
    spawnPoints: Map<number, Vector3[]>; // Team number -> array of spawn positions
    flagPositions: Map<number, Vector3[]>; // Team number -> array of flag positions
    colliders: Mesh[];
    triggers: Mesh[];
}

/**
 * Creates an asset system for handling mesh and sound assets
 */
export function createAssetSystem(
    engine: Engine,
    scene: Scene,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    isServer: boolean
) {
    // Map to store loading promises for each entity
    const loadingPromises = new Map<string, Promise<AssetContainer>>();
    // Cache for loaded assets
    const assetCache = new Map<string, AssetContainer>();
    // Cache for loaded maps
    const mapCache = new Map<string, MapData>();

    /**
     * Gets the visible meshes from a container using !metadata?.gltf?.extras?.type (meshes who don't have a type)
     * @param container - The container to get the visible meshes from
     * @returns The visible meshes from the container
     */
    const getContainerVisibleMeshes = (container: AssetContainer) => {
        return container.meshes.filter((mesh: AbstractMesh) => !mesh.metadata?.gltf?.extras?.type) as Mesh[];
    };

    /**
     * Gets the collision meshes from a container using metadata?.gltf?.extras?.type === "collider"
     * @param container - The container to get the collision meshes from
     * @returns The collision meshes from the container
     */
    const getContainerCollisionMeshes = (container: AssetContainer) => {
        return container.meshes.filter((mesh: AbstractMesh) => {
            if (!mesh.metadata?.gltf?.extras?.type) return false;
            return mesh.metadata.gltf.extras.type === "collider";
        }) as Mesh[];
    };

    /**
     * Gets the trigger meshes from a container using metadata?.gltf?.extras?.type === "trigger"
     * @param container - The container to get the trigger meshes from
     * @returns The trigger meshes from the container
     */
    const getContainerTriggerMeshes = (container: AssetContainer) => {
        return container.meshes.filter((mesh: AbstractMesh) => {
            if (!mesh.metadata?.gltf?.extras?.type) return false;
            return ["spawn_0", "spawn_1", "flag_0", "flag_1", "bullet_0", "bullet_1", "missile"].includes(mesh.metadata.gltf.extras.type);
        }) as Mesh[];
    };

    /**
     * Parses a map asset to extract spawn points, flag positions, and colliders
     */
    const parseMapAsset = (container: AssetContainer): MapData => {
        const spawnPoints = new Map<number, Vector3[]>();
        const flagPositions = new Map<number, Vector3[]>();
        const colliders = getContainerCollisionMeshes(container);
        const triggers = getContainerTriggerMeshes(container);

        // Initialize arrays for each team
        for (let i = 0; i < 2; i++) {
            spawnPoints.set(i, []);
            flagPositions.set(i, []);
        }

        // Process trigger meshes for spawn points and flag positions
        triggers.forEach((mesh: Mesh) => {
            // Check for spawn points
            for (let team = 0; team < 2; team++) {
                const spawnKey = `spawn_${team}`;
                if (mesh.metadata?.gltf?.extras?.type === spawnKey) {
                    const teamSpawns = spawnPoints.get(team) || [];
                    teamSpawns.push(mesh.position.clone());
                    spawnPoints.set(team, teamSpawns);
                }
            }

            // Check for flag positions
            for (let team = 0; team < 2; team++) {
                const flagKey = `flag_${team}`;
                if (mesh.metadata?.gltf?.extras?.type === flagKey) {
                    const teamFlags = flagPositions.get(team) || [];
                    teamFlags.push(mesh.position.clone());
                    flagPositions.set(team, teamFlags);
                }
            }
        });

        return {
            container,
            spawnPoints,
            flagPositions,
            colliders,
            triggers
        };
    };

    /**
     * Loads a map asset
     */
    const loadMap = async (mapPath: string): Promise<MapData> => {
        if (mapCache.has(mapPath)) {
            return mapCache.get(mapPath)!;
        }

        try {
            console.log(`Loading map: ${mapPath}`);
            const container = await LoadAssetContainerAsync(mapPath, scene);
            const mapData = parseMapAsset(container);
            mapCache.set(mapPath, mapData);
            console.log(`Map loaded: ${mapPath}`);
            return mapData;
        } catch (error) {
            console.error(`Failed to load map ${mapPath}:`, error);
            throw error;
        }
    };

    /**
     * Preloads default assets
     */
    const preloadAssets = async () => {
        console.log('Preloading default assets...');
        const preloadPromises = Object.entries(DEFAULT_ASSETS).map(async ([key, asset]) => {
            try {
                console.log(`Preloading asset: ${asset.path}`);
                const container = await LoadAssetContainerAsync(asset.path, scene);
                assetCache.set(asset.path, container);
                console.log(`Successfully preloaded: ${asset.path}`);
            } catch (error) {
                console.error(`Failed to preload asset ${asset.path}:`, error);
            }
        });

        await Promise.all(preloadPromises);
        console.log('Default assets preloaded');
    };

    /**
     * Gets the default asset configuration for a vehicle type
     */
    const getDefaultAsset = (type: VehicleType | EntityType): AssetComponent => {
        const defaultAsset = DEFAULT_ASSETS[type as keyof typeof DEFAULT_ASSETS];
        if (!defaultAsset) {
            throw new Error(`No default asset found for type: ${type}`);
        }
        return {
            assetPath: defaultAsset.path,
            assetType: defaultAsset.type,
            scale: defaultAsset.scale,
            isLoaded: false
        };
    };

    /**
     * Gets the animation groups from a container
     * @param container - The container to get the animation groups from
     * @returns The animation groups from the container
     */
    const getContainerAnimationGroups = (container: AssetContainer) => {
        return container.animationGroups;
    };

    /**
     * Loads an asset for an entity
     */
    const loadAsset = async (entity: GameEntity) => {
        if (!entity.asset || entity.asset.isLoaded) return;
        const { assetPath, assetType, scale } = entity.asset;
        if (!assetPath) return;
        try {
            // Check if we're already loading this asset
            if (!loadingPromises.has(entity.id)) {
                // Check if asset is already in cache
                if (assetCache.has(assetPath)) {
                    const container = assetCache.get(assetPath)!;
                    const visibleMeshes = getContainerVisibleMeshes(container);
                    const collisionMeshes = getContainerCollisionMeshes(container);
                    const triggerMeshes = getContainerTriggerMeshes(container);    
                    const animationGroups = getContainerAnimationGroups(container);
                    // Hide collision and trigger meshes
                    collisionMeshes.forEach(mesh => {
                        mesh.isVisible = false;
                    });
                    triggerMeshes.forEach(mesh => {
                        mesh.isVisible = false;
                    });
    
                    entity.asset!.meshes = visibleMeshes;
                    entity.asset!.collisionMeshes = collisionMeshes;
                    entity.asset!.triggerMeshes = triggerMeshes;
                    entity.asset!.isLoaded = true;
                    entity.asset!.animationGroups = animationGroups;
                    if (
                        isServer ||
                        entity.type === EntityType.Environment ||
                        (entity.type === EntityType.Vehicle && entity.owner?.isLocal)
                    ) {
                        physicsWorldSystem.createMeshPhysics(entity);
                        console.log('created physics body for entity', entity.id);
                    }
                    ecsWorld.reindex(entity);
                    console.log('loaded asset for entity', entity.id);
                    return;
                }
    
                // Start loading the asset using SceneLoader
                const loadPromise = LoadAssetContainerAsync(assetPath, scene);
                loadingPromises.set(entity.id, loadPromise);
    
                // Wait for the asset to load
                const container = await loadPromise;
                
                // Cache the loaded asset
                assetCache.set(assetPath, container);
                
                // Get all meshes
                const visibleMeshes = getContainerVisibleMeshes(container);
                const collisionMeshes = getContainerCollisionMeshes(container);
                const triggerMeshes = getContainerTriggerMeshes(container);
                const animationGroups = getContainerAnimationGroups(container);

                // Hide collision and trigger meshes
                collisionMeshes.forEach(mesh => {
                    mesh.isVisible = false;
                });
                triggerMeshes.forEach(mesh => {
                    mesh.isVisible = false;
                });
    
                entity.asset!.meshes = visibleMeshes;
                entity.asset!.collisionMeshes = collisionMeshes;
                entity.asset!.triggerMeshes = triggerMeshes;
                entity.asset!.animationGroups = animationGroups;
                if (
                    isServer ||
                    entity.type === EntityType.Environment ||
                    (entity.type === EntityType.Vehicle && entity.owner?.isLocal)
                ) {
                    physicsWorldSystem.createMeshPhysics(entity);
                    console.log('created physics body for entity', entity.id);
                }
                entity.asset!.isLoaded = true;
                ecsWorld.reindex(entity);
                console.log('loaded asset for entity after promise', entity.id);
                // Clean up the loading promise
                loadingPromises.delete(entity.id);
            }
        } catch (error) {
            console.error(`Failed to load asset for entity ${entity.id}:`, error);
            loadingPromises.delete(entity.id);
        }
    };

    /**
     * Updates the asset system
     */
    const update = (deltaTime: number) => {
        // Update all entities with assets
        const entities = ecsWorld.with("asset");
        for (const entity of entities) {
            if (!entity.asset.isLoaded) {
                loadAsset(entity);
            }
        }
    };

    /**
     * Cleans up resources
     */
    const cleanup = () => {
        // Clear any pending loading promises
        loadingPromises.clear();
        // Clear asset cache
        assetCache.clear();
        // Clear map cache
        mapCache.clear();
    };

    return {
        preloadAssets,
        getDefaultAsset,
        loadAsset,
        loadMap,
        update,
        cleanup,
        getAssetCache: () => assetCache,
        getMapCache: () => mapCache
    };
} 