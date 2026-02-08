import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "");

export async function generateProspectResponse(
    conversationHistory: Array<{ role: string; content: string }>,
    systemPrompt: string
) {
    try {
        console.log('--- [DEBUG] Initialisation du modèle gemini-2.0-flash');

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 8192,
            },
        });

        // Gemini requiert que l'historique commence par un message 'user'.
        // Si l'historique est vide ou commence par 'model', on ajoute une instruction système discrète.
        let history = conversationHistory.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        if (history.length > 0 && history[0].role === 'model') {
            history.unshift({
                role: 'user',
                parts: [{ text: "[L'appel commence]" }]
            });
        }

        console.log('--- [DEBUG] Démarrage du chat avec Gemini');

        const chat = model.startChat({
            history,
            systemInstruction: {
                role: 'system',
                parts: [{ text: systemPrompt }]
            },
        });

        const lastMessage = conversationHistory[conversationHistory.length - 1].content;

        console.log('--- [AI] Envoi du message à Gemini 2.5 Flash...');
        const result = await chat.sendMessage(lastMessage);

        return result.response.text();

    } catch (error: any) {
        console.error('--- [GEMINI ERROR] Détails:', {
            status: error.status,
            message: error.message,
            statusText: error.statusText,
        });
        throw error;
    }
}
