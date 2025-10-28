import Fastify from "fastify";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const fastify = Fastify();

// ROUTES
fastify.get("/", async () => ({ status: "Fastify + WS server running 🚀" }));
fastify.get("/health", async () => ({ ok: true }));


// Create a server from Fastify and attach WebSocket
const server = createServer(fastify.server);
const wss = new WebSocketServer({ server });
console.log("WebSocket attached to Fastify server Successfully!!!");

// Websocket logic
wss.on("connection", (ws) => {
    console.log("📡 New client connected");

    ws.send(JSON.stringify({ sender: "Server", message: "Hello from the backend!" }));

    ws.on("message", async (message) => {
        console.log("💬 Received from client:", message.toString());

        let broadcast: string | undefined = undefined;
        let aiBroadcast: string | undefined = undefined;

        try {
            const parsed = JSON.parse(message.toString());

            // Flatten the message so a Participant can display it nicely
            if (parsed.event === 'followup:create' && parsed.data?.items) {
                const items = parsed.data.items.join(" ");
                console.log("🧠 Generating clarification questions for:", items);

                // Call OpenAI to generate questions
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content:
                                `You are a helpful assistant that generates polite, natural clarification questions.
                                The questions should sound conversational, not like a numbered list.
                                Do NOT include numbering, bullet points, or prefixes like "1.", "2.", "-", or "*".
                                Just output each question on a new line, separated by line breaks`
                        },
                        {
                            role: "user",
                            content: `The reviewer said: "${items}". Generate 4 short, polite clarification questions a participant might ask.`,
                        },
                    ],
                });

                const text = completion.choices[0]?.message?.content?.trim() ?? "No response";

                // Send questions to all clients
                aiBroadcast = JSON.stringify({
                    sender: "Agent",
                    message: text,
                    event: "agent:questions",
                });

                // Broadcast original reviewer message
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
                if (broadcast) client.send(broadcast);
                if (aiBroadcast) client.send(aiBroadcast);
            }
        });
    });

    ws.on("close", () => console.log("Client disconnected"));
});

// Start both Fastify + WebSocket on the same port
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Fastify running on http://localhost:${PORT}`);
    console.log(`WebSocket running on ws://localhost:${PORT}`);
});
