import { Server } from "colyseus";
import express from "express";
import http from "http";
import path from "path";
import { MicroDroneRoom } from "./rooms/MicroDroneRoom";

// Setup server
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 2567;
const app = express();

// Serve static files (client-side)
app.use(express.static(path.join(__dirname, "../../client/dist")));

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

const server = http.createServer(app);
const gameServer = new Server({ server });

// Register room handlers
gameServer.define('microdrone_room', MicroDroneRoom);

// Start server
gameServer.listen(port)
  .then(() => {
    console.log(`Server running on port ${port}`);
    console.log('Physics system initialized');
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// Handle graceful shutdown
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


