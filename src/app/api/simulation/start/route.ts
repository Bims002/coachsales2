import { NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/google-ai';

export async function POST(req: Request) {
    try {
        const { productId } = await req.json();

        // Pour le MVP, on simule le premier message "Allô ?" pré-généré
        // En production, on pourrait générer dynamiquement selon le produit
        const audioContent = await synthesizeSpeech("Allô ?");

        // On pourrait sauvegarder la simulation en BDD ici

        return new NextResponse(new Uint8Array(audioContent as Buffer), {
            headers: { 'Content-Type': 'audio/mpeg' }
        });
    } catch (error) {
        console.error('Simulation start error:', error);
        return NextResponse.json({ error: 'Failed to start simulation' }, { status: 500 });
    }
}
