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

        return completion.choices[0]?.message?.content?.trim() ?? "No response";
    } catch (error) {
        console.error("⚠️ Error generating clarification:", error);
        return "Sorry, I can't at this time. Please try again later.";
    }
}