import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ScoringResult {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
}

export async function calculateScore(
    transcript: Array<{ role: string; content: string }>,
    productContext: string
): Promise<ScoringResult> {

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const conversationText = transcript
        .map(t => `${t.role === 'user' ? 'AGENT' : 'PROSPECT'}: ${t.content}`)
        .join('\n');

    const prompt = `Tu es un coach expert en vente par téléphone. Analyse cette conversation commerciale et attribue un score.

CONTEXTE DU PRODUIT: ${productContext}

CONVERSATION:
${conversationText}

Réponds UNIQUEMENT au format JSON suivant (sans markdown, juste le JSON):
{
    "score": <nombre entre 0 et 100>,
    "feedback": "<résumé en 2-3 phrases de la performance globale>",
    "strengths": ["<point fort 1>", "<point fort 2>"],
    "improvements": ["<axe d'amélioration 1>", "<axe d'amélioration 2>"]
}

CRITÈRES DE NOTATION:
- Accroche et présentation (20%)
- Écoute active et reformulation (20%)
- Argumentation et bénéfices client (30%)
- Gestion des objections (20%)
- Conclusion et appel à l'action (10%)`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Nettoyer le JSON (enlever les backticks markdown si présents)
        const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('[SCORING] Erreur:', error);
        return {
            score: 50,
            feedback: "Impossible d'analyser la conversation.",
            strengths: [],
            improvements: ["Veuillez réessayer"]
        };
    }
}
