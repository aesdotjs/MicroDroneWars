"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colyseus_1 = require("colyseus");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const MicroDroneRoom_1 = require("./rooms/MicroDroneRoom");
/**
 * Main server entry point for MicroDroneWars.
 * Sets up the game server, HTTP server, and room handlers.
 * Handles both development and production environments.
 */
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 2567;
const app = (0, express_1.default)();
// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, "../../client/dist")));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, "../../client/dist/index.html"));
    });
}
/**
 * Creates the HTTP server and Colyseus game server.
 * Configures development settings and room handlers.
 */
const server = http_1.default.createServer(app);
const gameServer = new colyseus_1.Server({
    server,
    // Development settings
    pingInterval: 0, // Disable ping interval during development
    pingMaxRetries: 3,
    verifyClient: (info, next) => {
        // Accept all connections during development
        next(true);
    }
});
/**
 * Registers the MicroDroneRoom handler with configuration options.
 */
gameServer.define('microdrone_room', MicroDroneRoom_1.MicroDroneRoom, {
    // Room options
    maxClients: 20,
    autoDispose: false
});
// Make sure to never call the `simulateLatency()` method in production.
if (process.env.NODE_ENV !== "production") {
    // simulate 200ms latency between server and client.
    // gameServer.simulateLatency(200);
}
/**
 * Starts the game server and handles initialization.
 * Logs success or failure of server startup.
 */
gameServer.listen(port)
    .then(() => {
    console.log(`Server running on port ${port}`);
    console.log('Physics system initialized');
})
    .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
/**
 * Handles graceful shutdown of the server.
 * Cleans up resources and exits the process.
 */
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    gameServer.gracefullyShutdown()
        .then(() => {
        console.log('Server shutdown complete');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Error during shutdown:', error);
        process.exit(1);
    });
});
