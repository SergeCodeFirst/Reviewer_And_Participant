import OpenAI from "openai";

interface GetClarificationProps {
    openai: OpenAI;
    items: string;
}

export const GetClarification = async ({openai, items} : GetClarificationProps) => {
    try{
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        `You are a helpful assistant. Your goal is to provide clear, concise answers to user questions.  
                            - Before giving a final answer, ask exactly 2 short, polite clarification questions if the user’s request is ambiguous.
                            - Wait for the user to answer both clarification questions.
                            - Once both clarification answers are received, provide a concise, direct answer to the original question.
                            - The final answer should be clear, informative, and include just enough detail to address the question.
                            - Avoid repeating the clarification questions in your final answer.
                            - Questions and answers should be polite and conversational.`
                },
                {
                    role: "user",
                    content: `The reviewer said: "${items}". Generate 2 or 4 short, polite clarification questions a participant might ask.`,
                },
            ],
        });

        return completion.choices[0]?.message?.content?.trim() ?? "No response";
    } catch (error) {
        console.error("⚠️ Error generating clarification:", error);
        return "Sorry, I can't at this time. Please try again later.";
    }
}