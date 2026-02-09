import Groq from "groq-sdk";

export const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "",
});

export async function generateProspectResponse(
    conversationHistory: Array<{ role: string; content: string }>,
    systemPrompt: string
) {
    try {
        console.log('--- [DEBUG] Initialisation de Groq avec Llama 3.3 70B');

        // Convertir l'historique au format Groq/OpenAI
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: systemPrompt }
        ];

        for (const msg of conversationHistory) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        }

        console.log('--- [AI] Envoi du message à Groq Llama 3 8B...');

        const completion = await groq.chat.completions.create({
            model: "llama3-8b-8192",
            messages,
            temperature: 0.9,
            max_tokens: 1024,
            response_format: { type: "json_object" }
        });

        const response = completion.choices[0]?.message?.content || "";
        console.log('--- [AI] Réponse reçue de Groq');

        return response;

    } catch (error: any) {
        console.error('--- [GROQ ERROR] Détails:', {
            status: error.status,
            message: error.message,
        });
        throw error;
    }
}
