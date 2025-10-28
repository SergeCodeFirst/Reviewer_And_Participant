import type { RedisClientType } from "redis";
import type WebSocket from "ws";

interface ReadAllMissMessageProps {
    lastFollowupId: string;
    lastQuestionsId: string;
    redis: RedisClientType;
    ws: WebSocket;
}


export const ReadAllMissMessage = async ({lastFollowupId, lastQuestionsId, redis, ws}: ReadAllMissMessageProps ) => {
    // Optionally: the client could send lastSeen IDs in a query param or first message

    // 1️⃣ Read all reviewer messages
    const followups = await redis.xRead(
        [{ key: "followups:stream", id: lastFollowupId }],
        { COUNT: 100 }
    );

    if (followups) {
        for (const stream of followups) {
            for (const reviewerMsg of stream.messages) {
                const reviewerStreamId = reviewerMsg.id;
                // Send reviewer a message first
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
}
