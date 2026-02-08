import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cette route permet de promouvoir un utilisateur en admin
// À utiliser uniquement en développement pour configurer le premier admin
// URL: /api/make-admin?email=votre@email.com&secret=coachsales2024

const ADMIN_SECRET = 'coachsales2024'; // Clé secrète pour sécuriser l'endpoint

export async function GET(req: Request) {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    const secret = url.searchParams.get('secret');

    // Vérification de la clé secrète
    if (secret !== ADMIN_SECRET) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (!email) {
        return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Utiliser le client admin Supabase
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Mettre à jour le rôle
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('email', email)
        .select();

    if (error) {
        console.error('Erreur promotion admin:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
        return NextResponse.json({
            error: 'Aucun profil trouvé pour cet email. Vérifiez que l\'utilisateur s\'est inscrit.'
        }, { status: 404 });
    }

    return NextResponse.json({
        success: true,
        message: `${email} est maintenant administrateur`,
        profile: data[0]
    });
}
