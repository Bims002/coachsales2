import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "",
});

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
        console.log('[SCORING] Calcul du score avec Groq...');

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 1024,
        });

        const text = completion.choices[0]?.message?.content?.trim() || "";

        // Nettoyer le JSON (enlever les backticks markdown si présents)
        const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        console.log('[SCORING] Score calculé avec succès');
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
