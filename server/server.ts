import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3000 });
console.log("WebSocket server running on ws://localhost:3000");
// Add Fastify
wss.on("connection", (ws) => {
    console.log("📡 New client connected");

    ws.send(JSON.stringify({ sender: "Server", message: "Hello from the backend!" }));

    ws.on("message", (message) => {
        console.log("💬 Received from client:", message.toString());

        let broadcast;
        try {
            const parsed = JSON.parse(message.toString());

            // Flatten the message so Participant can display it nicely
            if (parsed.event === 'followup:create' && parsed.data?.items) {
                broadcast = JSON.stringify({
                    sender: "Reviewer",
                    message: parsed.data.items.join(" "), // convert array to plain string
                });
            } else {
                broadcast = JSON.stringify({
                    sender: parsed.event ? "Reviewer" : "Participant",
                    message: message.toString(),
                });
            }
        } catch (e) {
            broadcast = JSON.stringify({ sender: "Unknown", message: message.toString() });
        }

        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(broadcast);
            }
        });
    });

    ws.on("close", () => console.log("❌ Client disconnected"));
});
