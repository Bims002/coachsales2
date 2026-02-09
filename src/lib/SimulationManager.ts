import { synthesizeSpeech } from './google-ai';
import { generateProspectResponse } from './gemini';

export interface SimulationState {
    history: Array<{ role: string; content: string }>;
    productContext: string;
    turnCount: number;
    objections?: string[];
    resistance?: string;
}

export class SimulationManager {
    // Cette classe est maintenant une pure "Utility" pour rester stateless

    static async generateResponse(state: SimulationState) {
        const personalities = [
            'Tu es légèrement sceptique mais poli.',
            'Tu es occupé et pressé de raccrocher.',
            'Tu es curieux et poses des questions.',
            'Tu compares avec ce que tu as déjà.',
            'Tu cherches à savoir le prix.',
        ];
        const personality = personalities[state.turnCount % personalities.length];

        const contextPrompt = `Tu es une personne réelle au téléphone, pas une IA.
        
        🎭 TON ÉTAT D'ESPRIT ACTUEL: ${personality}
        📞 PRODUIT DONT ON TE PARLE: ${state.productContext}
        🛡️ TES OBJECTIONS (si pertinent uniquement): ${state.objections?.join(', ') || 'Néant'}
        🔥 RÉSISTANCE: ${state.resistance || 'Moyenne'}

        ⚠️ DIRECTIVES DE CONVERSATION (CRUCIAL):
        1. RÉPONDS DIRECTEMENT: Si l'agent pose une question, réponds. S'il argumente, réagis.
        2. SOIS ULTRA-COURT: Max 10-15 mots. Parfois un simple "Oui", "Allô ?", "D'accord" suffit.
        3. SI TU N'AS RIEN COMPRIS: (Transcription vide ou incohérente), dis simplement "Allô ? Vous m'entendez ?" ou "Euh... oui ?".
        4. NATUREL: Utilise des "euh", "ben", fais des pauses. 
        5. RACCROCHAGE: Si l'appel doit finir, annonce-le et mets hangUp: true.
        
        STRUCTURE JSON:
        {
            "text": "ta réponse directe",
            "hangUp": true/false
        }`;

        // Si le dernier message utilisateur est trop court ou vide, on force une réaction de type "présence"
        const lastUserMsg = state.history[state.history.length - 1]?.content || "";
        if (lastUserMsg.length < 2) {
            return { text: "Oui ? Je vous écoute...", hangUp: false };
        }

        const rawResponse = await generateProspectResponse(state.history, contextPrompt);

        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : rawResponse;

            const parsed = JSON.parse(jsonStr);
            const rawText = (parsed.text || "D'accord, je vous écoute.").trim();

            // On enveloppe dans du SSML pour une meilleure intonation
            // On ajoute un peu d'emphase sur le début et un débit naturel
            let ssmlText = `<speak><prosody rate="1.05" pitch="+0st">${rawText}</prosody></speak>`;

            // Si la phrase contient une question, on peut ajuster (optionnel, mais SSML de base suffit souvent si le texte est bon)
            // On s'assure que le texte ne contient pas déjà des balises pour ne pas doubler
            if (rawText.includes('?')) {
                ssmlText = `<speak><prosody rate="1.0" pitch="+1st">${rawText}</prosody></speak>`;
            }

            return {
                text: ssmlText,
                hangUp: !!parsed.hangUp
            };
        } catch (e) {
            console.warn('--- [SimulationManager] ⚠️ Échec du parsing JSON, nettoyage manuel du texte');
            // Nettoyage agressif pour éviter de lire du code
            const cleanText = rawResponse
                .replace(/```json\n?|```/g, '') // Supprime les backticks
                .replace(/\{"text":\s*"|"hangUp":\s*(true|false)\}/g, '') // Supprime les clés JSON si le modèle a foiré
                .replace(/"\}?$/, '') // Supprime les guillemets de fin
                .trim();

            return {
                text: `<speak><prosody rate="1.05">${cleanText || "Allô ? Je n'ai pas bien compris."}</prosody></speak>`,
                hangUp: cleanText.toLowerCase().includes('raccroche') || cleanText.toLowerCase().includes('au revoir')
            };
        }
    }

    static async getAudio(text: string) {
        return await synthesizeSpeech(text);
    }
}
