const express = require('express');
const { Server } = require('colyseus');
const { createServer } = require('http');
const { MicroDroneRoom } = require('./rooms/MicroDroneRoom');

const port = process.env.PORT || 2567;
const app = express();

// Create HTTP & WebSocket server
const gameServer = new Server({
    server: createServer(app)
});

// Register room handlers
gameServer.define('microdrone_room', MicroDroneRoom);

// Start the server
gameServer.listen(port);
console.log(`Server is listening on port ${port}`); 