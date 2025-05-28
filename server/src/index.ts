import { Server } from "colyseus";
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { MicroDroneRoom } from "./rooms/MicroDroneRoom";
import { uWebSocketsTransport } from "@colyseus/uwebsockets-transport"

/**
 * Main server entry point for MicroDroneWars.
 * Sets up the game server, HTTP server, and room handlers.
 * Handles both development and production environments.
 */
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 2567;
const staticPort = port + 1; // Use a different port for static files

// Debug: Log the assets path
const assetsPath = path.join(__dirname, 'assets');
console.log('Assets directory path:', assetsPath);
console.log('Assets directory exists:', fs.existsSync(assetsPath));

const mapsPath = path.join(assetsPath, 'maps');
console.log('Maps directory path:', mapsPath);
console.log('Maps directory exists:', fs.existsSync(mapsPath));

const glbPath = path.join(mapsPath, 'CTF-test.glb');
console.log('GLB file path:', glbPath);
console.log('GLB file exists:', fs.existsSync(glbPath));

const app = express();
const server = http.createServer(app);

// Create a separate Express server for static files
const staticApp = express();
const staticServer = http.createServer(staticApp);

// Add CORS headers
staticApp.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Debug middleware to log requests
staticApp.use((req, res, next) => {
  console.log(`[Static] ${req.method} ${req.url}`);
  next();
});

// Serve static assets with explicit options
staticApp.use('/assets', express.static(assetsPath, {
  dotfiles: 'allow',
  etag: true,
  index: false,
  lastModified: true,
  maxAge: 0,
}));

// Debug route to list available files
staticApp.get('/debug/assets', (req, res) => {
  const listFiles = (dir: string): string[] => {
    const files = fs.readdirSync(dir);
    return files.flatMap(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        return listFiles(filePath).map(f => path.join(file, f));
      }
      return [file];
    });
  };

  const files = listFiles(assetsPath);
  res.json({
    assetsPath,
    files
  });
});

// Start the static file server
staticServer.listen(staticPort, () => {
  console.log(`Static file server running on port ${staticPort}`);
});

// Create Colyseus server with uWebSockets transport
const gameServer = new Server({
  server,
  transport: new uWebSocketsTransport(),
  // Development settings
  pingInterval: 0, // Disable ping interval during development
  pingMaxRetries: 3,
});

/**
 * Registers the MicroDroneRoom handler with configuration options.
 */
gameServer.define('microdrone_room', MicroDroneRoom, {
  // Room options
  maxClients: 20,
  autoDispose: false
});

// Make sure to never call the `simulateLatency()` method in production.
if (process.env.NODE_ENV !== "production") {
  // simulate 200ms latency between server and client.
  gameServer.simulateLatency(400);
}

/**
 * Starts the game server and handles initialization.
 * Logs success or failure of server startup.
 */
gameServer.listen(port)
  .then(() => {
    console.log(`Game server running on port ${port}`);
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
  console.log('Shutting down servers...');
  Promise.all([
    gameServer.gracefullyShutdown(),
    new Promise((resolve) => staticServer.close(resolve))
  ])
    .then(() => {
      console.log('Servers shutdown complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error during shutdown:', error);
      process.exit(1);
    });
});


