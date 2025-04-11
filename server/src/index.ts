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

gameServer.define('microdrone_room', MicroDroneRoom);

gameServer.listen(port);
console.log(`Server running on port ${port}`);


