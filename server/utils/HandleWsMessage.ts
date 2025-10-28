import type { RedisClientType } from "redis";
import OpenAI from "openai";
import WebSocket, { WebSocketServer } from "ws";
import { RateLimit } from "./RateLimiting.js";
import { GetClarification } from "./GetClarification.js";

interface HandleWsMessageProps {
    message: string;
    ws: WebSocket;
    redis: RedisClientType;
    openai: OpenAI;
    wss: WebSocketServer;
}

export const HandleWsMessage = async ({message, ws, redis, openai, wss}: HandleWsMessageProps) => {
    console.log("Message Received from client:", message);
    try {
        const parsed = JSON.parse(message.toString());

        // Flatten the message so a Participant can display it nicely
        if (parsed.event === 'followup:create' && parsed.data?.items) {
            const items = parsed.data.items.join(" ");
            console.log("Generating clarification questions...");

            // Rate limiting (max 1 message per 5s per reviewer)
            const rateLimitOptions = {ws, redis}
            await RateLimit(rateLimitOptions)

            // Deduplication (avoid duplicate reviewer messages)
            const hashKey = `hash:${items}`;
            const exists = await redis.exists(hashKey);
            if (exists) return;
            await redis.set(hashKey, "1", { EX: 3600 }); // cache 1h

            // Save reviewer message to Redis stream
            const reviewerId = await redis.xAdd(
                "followups:stream",
                "*",
                {
                    sender: "Reviewer",
                    text: items
                }
            );

            // Publish Reviewer messages to the live channel
            await redis.publish(
                "questions:live",
                JSON.stringify({
                    sender: "Reviewer",
                    message: items,
                    streamId: reviewerId,
                    event: "followup:create",
                })
            );

            // Call OpenAI to generate clarification questions
            const getClarificationOptions = {openai, items}
            await GetClarification(getClarificationOptions)
            const aiText = await GetClarification(getClarificationOptions)

            // Save AI questions to Redis stream
            const aiId = await redis.xAdd(
                "questions:stream",
                "*",
                {
                    sender: "Agent",
                    text: aiText,
                    reviewerId,
                }
            );

            // Publish AI questions via Redis Pub/Sub (real-time)
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
};
