import { WebSocketServer } from "ws";

// Create a WebSocket server on port 3000
const wss = new WebSocketServer({ port: 3000 });
console.log("WebSocket server running on ws://localhost:3000");

// Event: a client connects
wss.on("connection", (ws) => {
    console.log("📡 New client connected");

    // Send a welcome message to the client
    ws.send("Hello from the backend!");

    // Event: receive a message from the client
    ws.on("message", (message) => {
        console.log("💬 Received from client:", message.toString());

        // Echo the message back to the client
        ws.send(`You said: ${message}`);
    });

    // Event: a client disconnects
    ws.on("close", () => {
        console.log("❌ Client disconnected");
    });
});
