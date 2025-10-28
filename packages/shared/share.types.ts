type FollowUpPayload = {
    items: string[];
    createdAt: number
};

type AgentQuestions = {
    text: string;
    createdAt: number;
    streamId?: string
};

interface ClientToServerEvents {
    "followup:create": (payload: FollowUpPayload) => void;
}

interface ServerToClientEvents {
    "agent:questions": (data: AgentQuestions) => void;
}