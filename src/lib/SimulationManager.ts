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

        const contextPrompt = `Tu es un PROSPECT (client potentiel) au téléphone avec un commercial.
        TON RÔLE: Tu es la personne qui reçoit l'appel. TU N'ES PAS LE VENDEUR.
        
        CONTEXTE DU PRODUIT DONT ON TE PARLE: ${state.productContext}
        TES OBJECTIONS POSSIBLES: ${state.objections?.join(', ') || 'Aucune particulière'}
        TON ÉTAT D'ESPRIT: ${personality}
        RÉSISTANCE FACE À LA VENTE: ${state.resistance || 'Moyenne'}

        RÈGLES D'OR (Non-négociables):
        1. ⛔ NE FAIS JAMAIS LE TRAVAIL DU VENDEUR. Ne pose jamais de questions de "découverte" (ex: "Quels sont vos besoins ?", "En quoi puis-je vous aider ?"). C'est à LUI de te convaincre.
        2. 🤐 SOIS BREF ET NATUREL. Tes réponses doivent faire 1 phrase maximum (10-15 mots). Parle comme un vrai humain ("Ouais...", "Hmm, je sais pas trop", "C'est combien ?").
        3. 👂 SOIS RÉACTIF, PAS PROACTIF. Contente-toi de répondre aux questions du vendeur ou de soulever tes objections. Ne relance pas la conversation si le vendeur ne dit rien (dis juste "Allô ?").
        4. 🛡️ RESTE DANS LE PERSONNAGE. Si le vendeur parle d'autre chose que ton contexte, ramène-le au sujet ou dis que tu ne comprends pas.
        5. 🚫 ANTI-HALLUCINATION. Si tu entends du charabia ou des phrases hors contexte ("Sous-titres...", bruits), réponds par une phatique d'incompréhension ("Pardon ?", "Allô ?", "J'ai pas entendu").
        
        SI LE VENDEUR EST CONVAINCANT: Accepte le rendez-vous/l'achat.
        SI LE VENDEUR EST DÉCEVANT: Raccroche ou dis que tu n'es pas intéressé.

        RÈGLE DE FIN: Avant de mettre "hangUp": true, tu DOIS formuler une phrase de conclusion (ex: "Bon, je dois y aller", "Merci, au revoir", "Ça ne m'intéresse pas, bonne journée"). Ne coupe jamais la parole sans prévenir.
        
        FORMAT DE RÉPONSE ATTENDU (JSON):
        {
            "text": "ta réponse courte et orale",
            "hangUp": false (mets true uniquement si tu décides de mettre fin à l'appel)
        }`;

        // Si le dernier message utilisateur est trop court ou vide, on force une réaction de type "présence"
        const lastUserMsg = state.history[state.history.length - 1]?.content || "";
        if (lastUserMsg.length < 2) {
            return { text: "Oui ? Je vous écoute...", ssml: `<speak><prosody rate="1.05">Oui ? Je vous écoute...</prosody></speak>`, hangUp: false };
        }

        const rawResponse = await generateProspectResponse(state.history, contextPrompt);

        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : rawResponse;

            const parsed = JSON.parse(jsonStr);
            const rawText = (parsed.text || "D'accord, je vous écoute.").trim();

            // On enveloppe dans du SSML pour une meilleure intonation
            // Studio voices ne supportent PAS "pitch", on garde uniquement "rate"
            let ssmlText = `<speak><prosody rate="1.05">${rawText}</prosody></speak>`;

            // Si la phrase contient une question, on peut juste jouer sur le rate
            if (rawText.includes('?')) {
                ssmlText = `<speak><prosody rate="1.0">${rawText}</prosody></speak>`;
            }

            return {
                text: rawText,
                ssml: ssmlText,
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

            const fallbackText = cleanText || "Allô ? Je n'ai pas bien compris.";

            return {
                text: fallbackText,
                ssml: `<speak><prosody rate="1.05">${fallbackText}</prosody></speak>`,
                hangUp: cleanText.toLowerCase().includes('raccroche') || cleanText.toLowerCase().includes('au revoir')
            };
        }
    }

    static async getAudio(text: string) {
        return await synthesizeSpeech(text);
    }
}
