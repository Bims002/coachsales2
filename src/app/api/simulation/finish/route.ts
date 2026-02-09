import { NextResponse } from 'next/server';
// Utilisation d'un chemin relatif pour forcer la résolution hors alias
import { createClient } from '../../../../lib/supabase-server';
import { calculateScore } from '../../../../lib/scoring';

console.log('--- [API/END] 🚀 Route chargée (v2 - Relative Paths)');

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { history, productId, userId } = body;

        console.log(`--- [API/END] 📊 Début requête: user=${userId}, product=${productId}`);

        if (!history || history.length === 0) {
            return NextResponse.json({ error: 'No history provided' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Récupérer le produit
        const { data: product, error: pErr } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (pErr) {
            console.error('--- [API/END] ❌ Erreur produit:', pErr);
            throw new Error("Produit introuvable");
        }

        // 2. Score
        console.log('--- [API/END] 🤖 Calcul du score...');
        const analysis = await calculateScore(history, product?.description || '');

        // 3. Insert
        const { data: simulation, error: iErr } = await supabase
            .from('simulations')
            .insert({
                user_id: userId,
                product_id: productId,
                transcript: history,
                score: Number(analysis.score) || 0,
                feedback: analysis.feedback,
                strengths: analysis.strengths,
                improvements: analysis.improvements,
                duration: history.length * 5
            })
            .select()
            .single();

        if (iErr) {
            console.error('--- [API/END] ❌ Erreur BDD:', iErr);
            throw iErr;
        }

        return NextResponse.json({
            success: true,
            simulationId: simulation.id
        });

    } catch (error: any) {
        console.error('--- [API/END] ❌ Erreur fatale:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
