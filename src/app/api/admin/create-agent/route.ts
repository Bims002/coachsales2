import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { createAgentSchema } from '@/lib/validation';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting : 10 requêtes par minute
        const rateLimitResponse = rateLimit(request, RateLimitPresets.STRICT);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const supabase = await createClient();

        // 1. Vérifier la session de l'administrateur
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        // 2. Vérifier si l'utilisateur est bien un admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (!profile || profile.role?.toLowerCase() !== 'admin') {
            return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
        }

        // 3. Récupérer et valider les données du nouvel agent
        const body = await request.json();

        // Validation avec Zod
        const validationResult = createAgentSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Données invalides',
                details: validationResult.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            }, { status: 400 });
        }

        const { email, password, name } = validationResult.data;

        // 4. Créer l'utilisateur via l'API Admin
        const adminClient = createAdminClient();
        const { data, error } = await adminClient.auth.admin.createUser({
            email,
            password,
            user_metadata: { full_name: name },
            email_confirm: true
        });

        if (error) {
            console.error('Erreur création agent:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Le profil sera créé automatiquement par le trigger Supabase
        return NextResponse.json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                name: name
            }
        });

    } catch (error) {
        console.error('Erreur API create-agent:', error);
        return NextResponse.json({ error: 'Erreur interne au serveur' }, { status: 500 });
    }
}
