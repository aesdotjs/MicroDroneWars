export const CollisionGroups = {
    Default: 1,
    Drones: 2,
    Planes: 4,
    Environment: 8,
    Projectiles: 16,
    Flags: 32,
    TrimeshColliders: 64
};

export const CollisionMasks = {
    Drone: CollisionGroups.Environment | CollisionGroups.Projectiles | CollisionGroups.Flags,
    Plane: CollisionGroups.Environment | CollisionGroups.Projectiles | CollisionGroups.Flags,
    Projectile: CollisionGroups.Drones | CollisionGroups.Planes | CollisionGroups.Environment,
    Flag: CollisionGroups.Drones | CollisionGroups.Planes
}; 