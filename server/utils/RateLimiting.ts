import type WebSocket from "ws";
import type { RedisClientType } from "redis";

interface RateLimitProps {
    ws: WebSocket;
    redis: RedisClientType;
}

export const RateLimit = async ({ws, redis} : RateLimitProps) => {
    // ✅ Rate limiting (max 1 message per 5s per reviewer)
    const rateKey = `rate:${ws}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 3);
    if (count > 1) {
        ws.send(JSON.stringify({ error: "Rate limit exceeded" }));
        return;
    }
}