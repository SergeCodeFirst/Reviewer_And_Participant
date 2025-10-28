import Fastify from "fastify";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { createClient } from "redis";
import type { RedisClientType } from "redis";

import OpenAI from "openai";
import dotenv from "dotenv";

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
fastify.get("/", async () => ({ status: "Fastify + WS server running 🚀" }));
fastify.get("/health", async () => ({ ok: true }));

// Create a server from Fastify and attach WebSocket
const server = createServer(fastify.server);
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

    (async () => {
        // Optionally: the client could send lastSeen IDs in a query param or first message
        const lastFollowupId = "0"; // fetch from client if available
        const lastQuestionsId = "0";

        // 1️⃣ Read all reviewer messages
        const followups = await redis.xRead(
            [{ key: "followups:stream", id: lastFollowupId }],
            { COUNT: 100 }
        );

        if (followups) {
            for (const stream of followups) {
                for (const reviewerMsg of stream.messages) {
                    const reviewerStreamId = reviewerMsg.id;
                    // Send reviewer message first
                    ws.send(JSON.stringify({
                        sender: "Reviewer",
                        message: reviewerMsg.message.text,
                        streamId: reviewerStreamId,
                        event: "followup:create"
                    }));

                    // 2️⃣ Send all AI messages that belong to this reviewer
                    const questions = await redis.xRead(
                        [{ key: "questions:stream", id: lastQuestionsId }],
                        { COUNT: 100 }
                    );

                    if (questions) {
                        for (const qStream of questions) {
                            for (const aiMsg of qStream.messages) {
                                if (aiMsg.message.reviewerId === reviewerStreamId) {
                                    ws.send(JSON.stringify({
                                        sender: "Agent",
                                        message: aiMsg.message.text,
                                        streamId: aiMsg.id,
                                        event: "agent:questions"
                                    }));
                                }
                            }
                        }
                    }
                }
            }
        }
    })();

    // Handle Incoming messages from the client
    ws.on("message", async (message) => {
        console.log("💬 Received from client:", message.toString());

        try {
            const parsed = JSON.parse(message.toString());

            // Flatten the message so a Participant can display it nicely
            if (parsed.event === 'followup:create' && parsed.data?.items) {
                const items = parsed.data.items.join(" ");
                console.log("🧠 Generating clarification questions for:", items);

                // ✅ Rate limiting (max 1 message per 5s per reviewer)
                const rateKey = `rate:${ws}`;
                const count = await redis.incr(rateKey);
                if (count === 1) await redis.expire(rateKey, 3);
                if (count > 1) {
                    ws.send(JSON.stringify({ error: "Rate limit exceeded" }));
                    return;
                }

                // ✅ Deduplication (avoid duplicate reviewer messages)
                const hashKey = `hash:${items}`;
                const exists = await redis.exists(hashKey);
                if (exists) return;
                await redis.set(hashKey, "1", { EX: 3600 }); // cache 1h

                // 1️⃣ Save reviewer message to Redis stream
                const reviewerId = await redis.xAdd(
                    "followups:stream",
                    "*",
                    {
                        sender: "Reviewer",
                        text: items
                    }
                );

                // 2️⃣ Publish Reviewer messages to the live channel
                await redis.publish(
                    "questions:live",
                    JSON.stringify({
                        sender: "Reviewer",
                        message: items,
                        streamId: reviewerId,
                        event: "followup:create",
                    })
                );

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
                            content: `The reviewer said: "${items}". Generate 2 or 4 short, polite clarification questions a participant might ask.`,
                        },
                    ],
                });

                const aiText = completion.choices[0]?.message?.content?.trim() ?? "No response";

                // 4️⃣ Save AI questions to Redis stream
                const aiId = await redis.xAdd(
                    "questions:stream",
                    "*",
                    {
                        sender: "Agent",
                        text: aiText,
                        reviewerId,
                    }
                );

                // 5️⃣ Publish AI questions via Redis Pub/Sub (real-time)
                await redis.publish(
                    "questions:live",
                    JSON.stringify({
                        sender: "Agent",
                        message: aiText,
                        streamId: aiId,
                        event: "agent:questions",
                    })
                );
            } else {
                // Normal Message from Participant (Not in Blob)
                const broadcast = JSON.stringify({
                    sender: parsed.event ? "Reviewer" : "Participant",
                    message: message.toString(),
                });

                // Broadcast participant messages in real-time
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) client.send(broadcast);
                });
            }
        } catch (e) {
            console.error("⚠️ Error parsing message:", e);
            const broadcast = JSON.stringify({ sender: "Unknown", message: message.toString() });
            if (broadcast && ws.readyState === WebSocket.OPEN) ws.send(broadcast);
        }
    });

    ws.on("close", () => console.log("Client disconnected"));
});

// Start both Fastify + WebSocket on the same port
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Fastify running on http://localhost:${PORT}`);
    console.log(`WebSocket running on ws://localhost:${PORT}`);
});
