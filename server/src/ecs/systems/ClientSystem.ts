import { Client } from "colyseus";
import { Vector3, Quaternion } from "babylonjs";
import { world as ecsWorld } from "@shared/ecs/world";
import { createVehicleEntity } from "@shared/ecs/utils/EntityHelpers";
import { createPhysicsWorldSystem } from "@shared/ecs/systems/PhysicsWorldSystem";
import { createStateSyncSystem } from "./StateSyncSystem";
import { createInputSystem } from "./InputSystems";

export function createClientSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    stateSyncSystem: ReturnType<typeof createStateSyncSystem>,
    inputSystem: ReturnType<typeof createInputSystem>,
    generateEntityId: () => string
) {
    return {
        handleJoin: (client: Client, options: { vehicleType: "drone" | "plane", team: number }) => {
            console.log(`Client ${client.sessionId} joining with options:`, options);
            
            // Create vehicle entity in ECS world
            const spawnPos = new Vector3(0, 10, 0);
            const vehicleId = generateEntityId();
            const vehicleEntity = createVehicleEntity(
                vehicleId,
                options.vehicleType,
                spawnPos,
                new Quaternion(),
                options.team
            );
            vehicleEntity.owner = {
                id: client.sessionId,
                isLocal: false
            };
            // Initialize tick component
            vehicleEntity.tick!.tick = physicsWorldSystem.getCurrentTick();
            vehicleEntity.tick!.timestamp = Date.now();
            vehicleEntity.tick!.lastProcessedInputTimestamp = Date.now();
            vehicleEntity.tick!.lastProcessedInputTick = physicsWorldSystem.getCurrentTick();
            ecsWorld.add(vehicleEntity);

            // Add physics body to world
            physicsWorldSystem.addBody(vehicleEntity);

            // Add vehicle to state
            stateSyncSystem.addEntity(vehicleEntity);
            
            console.log(`Vehicle created for ${client.sessionId}:`, {
                id: vehicleId,
                type: options.vehicleType,
                team: options.team,
                position: { 
                    x: vehicleEntity.transform!.position.x, 
                    y: vehicleEntity.transform!.position.y, 
                    z: vehicleEntity.transform!.position.z 
                }
            });
            console.log(ecsWorld.entities);
        },

        handleLeave: (client: Client) => {
            console.log(`Client ${client.sessionId} leaving`);
            
            // Clean up input system
            inputSystem.cleanup(client.sessionId);

            // Remove all entities owned by this client
            const ecsEntities = ecsWorld.with("owner").where(({owner}) => owner.id === client.sessionId);
            console.log('Cleaning up entities for client:', client.sessionId, ecsEntities.size);
            console.log(ecsWorld.entities);
            for (const entity of ecsEntities) {
                physicsWorldSystem.removeBody(entity.id);
                ecsWorld.remove(entity);
                stateSyncSystem.removeEntity(entity);
            }
        }
    };
} 