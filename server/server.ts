import Fastify from "fastify";
import OpenAI from "openai";
import dotenv from "dotenv";
import { createServer } from "http";
import { createClient } from "redis";
import { WebSocketServer } from "ws";
import type { RedisClientType } from "redis";
import { ReadAllMissMessage } from "./utils/ReadAllMissMessage.js";
import {HandleWsMessage} from "./utils/HandleWsMessage.js";


// Load environment variables from .env file
dotenv.config();

// Initialize Fastify
const fastify = Fastify();

// Redis client
const redis: RedisClientType = createClient();
redis.on("error", (err) => console.error("Redis error:", err));
await redis.connect();

// OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ROUTES
fastify.get("/health", async () => ({ ok: true }));

// Create a server from Fastify and attach WebSocket
const server = createServer((req, res) => fastify.server.emit('request', req, res));
const wss = new WebSocketServer({ server });
console.log("WebSocket attached to Fastify server Successfully!!!");

// Pub/Sub subscriber for live question updates
const sub = redis.duplicate();
await sub.connect();
await sub.subscribe("questions:live", (msg) => {
    // Broadcast to all WS clients
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
});

// Websocket logic
wss.on("connection", (ws) => {
    // Send a welcome message to a new client
    console.log("📡 New client connected");
    ws.send(JSON.stringify({ sender: "Server", message: "Hello from the backend!" }));

    // Read all messages from Redis stream and send to the client
    (async () => {
        const readAllMissMessageOptions = { lastFollowupId: "0", lastQuestionsId: "0", redis, ws};
        await ReadAllMissMessage(readAllMissMessageOptions)
    })();

    // Handle Incoming messages from the client
    ws.on("message", async (message) => {
        await HandleWsMessage({message: message.toString(), ws, redis, openai, wss,});
    });

    ws.on("close", () => console.log("Client disconnected"));
});

// Start both Fastify + WebSocket on the same port
await fastify.ready();
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Fastify running on http://localhost:${PORT}`);
    console.log(`WebSocket running on ws://localhost:${PORT}`);
});
