import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/google-ai';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { z } from 'zod';

// Schéma de validation
const startSimulationSchema = z.object({
    productId: z.string().uuid('ID de produit invalide'),
});

export async function POST(req: NextRequest) {
    try {
        // Rate limiting : 30 requêtes par minute (modéré car utilisé fréquemment)
        const rateLimitResponse = rateLimit(req, RateLimitPresets.MODERATE);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const body = await req.json();

        // Validation avec Zod
        const validationResult = startSimulationSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Données invalides',
                details: validationResult.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            }, { status: 400 });
        }

        const { productId } = validationResult.data;

        // Pour le MVP, on simule le premier message "Allô ?" pré-généré
        // En production, on pourrait générer dynamiquement selon le produit
        const audioContent = await synthesizeSpeech("Allô ?");

        // On pourrait sauvegarder la simulation en BDD ici avec productId

        return new NextResponse(new Uint8Array(audioContent as Buffer), {
            headers: { 'Content-Type': 'audio/mpeg' }
        });
    } catch (error) {
        console.error('Simulation start error:', error);
        return NextResponse.json({ error: 'Failed to start simulation' }, { status: 500 });
    }
}
