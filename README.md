# MicroDroneWars

A multiplayer aerial combat game featuring drones and planes with realistic physics and network synchronization.

## Overview

MicroDroneWars is a real-time multiplayer game where players control either drones or planes in aerial combat. The game features:

- Realistic physics simulation for both drones and planes
- Multiplayer support with client-server architecture
- Team-based gameplay with flag capture mechanics
- Smooth network synchronization and state interpolation
- Customizable vehicle controls and physics parameters

## Architecture

The project is built using a client-server architecture with the following key components:

### Client
- Built with Babylon.js for 3D rendering
- Custom physics implementation for vehicle control
- State interpolation for smooth multiplayer experience
- Input handling and vehicle control systems

### Server
- Built with Colyseus for multiplayer support
- Authoritative physics simulation
- Game state management
- Network synchronization

### Shared
- Common physics and game state types
- Vehicle settings and configurations
- Network message protocols

## Key Features

### Physics System
- Custom physics implementation for realistic flight dynamics
- Separate controllers for drones and planes
- Collision detection and response
- Ground interaction and terrain following

### Vehicle Types

#### Drones
- Quadcopter-style control
- Hover capability
- Precise movement control
- Particle effects for thrusters

#### Planes
- Fixed-wing aircraft physics
- Control surfaces (ailerons, elevators, rudder)
- Lift and drag simulation
- Engine thrust effects

### Multiplayer
- Real-time state synchronization
- Client-side prediction and server reconciliation
- Network latency compensation
- Smooth interpolation for remote players

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/MicroDroneWars.git
cd MicroDroneWars
```

2. Install dependencies:
```bash
# Install shared dependencies
cd shared
npm install

# Install client dependencies
cd ../client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Build the project:
```bash
# Build shared code
cd ../shared
npm run build

# Build client
cd ../client
npm run build

# Build server
cd ../server
npm run build
```

### Running the Game

1. Start the server:
```bash
cd server
npm start
```

2. Start the client:
```bash
cd client
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Development

### Project Structure
```
MicroDroneWars/
├── client/                 # Client-side code
│   ├── src/
│   │   ├── game/          # Game logic
│   │   ├── physics/       # Client physics
│   │   └── vehicles/      # Vehicle implementations
├── server/                 # Server-side code
│   ├── src/
│   │   ├── physics/       # Server physics
│   │   └── rooms/         # Game rooms
└── shared/                 # Shared code
    ├── src/
    │   ├── physics/       # Physics types and base classes
    │   └── schemas/       # Game state schemas
```

### Key Components

#### Physics System
- `BasePhysicsController`: Base class for vehicle physics
- `DronePhysicsController`: Drone-specific physics
- `PlanePhysicsController`: Plane-specific physics
- `PhysicsWorld`: Main physics simulation

#### Vehicle System
- `Vehicle`: Base vehicle class
- `Drone`: Drone implementation
- `Plane`: Plane implementation
- `CollisionManager`: Handles collision detection

#### Network System
- `ClientPhysicsWorld`: Client-side physics and state management
- `MicroDroneRoom`: Server-side game room
- State synchronization and interpolation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Babylon.js for the 3D engine
- Colyseus for multiplayer support
- Cannon.js for physics simulation
