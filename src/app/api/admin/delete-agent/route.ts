import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { z } from 'zod';

// Schéma de validation pour l'ID
const deleteAgentSchema = z.object({
    id: z.string().uuid('ID invalide'),
});

export async function DELETE(request: NextRequest) {
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

        // 3. Récupérer et valider l'ID de l'agent à supprimer
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('id');

        // Validation avec Zod
        const validationResult = deleteAgentSchema.safeParse({ id: agentId });
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'ID invalide',
                details: validationResult.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            }, { status: 400 });
        }

        const validatedId = validationResult.data.id;

        // Empêcher l'admin de se supprimer lui-même
        if (validatedId === session.user.id) {
            return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même' }, { status: 400 });
        }

        // 4. Supprimer l'utilisateur via l'API Admin
        const adminClient = createAdminClient();
        const { error } = await adminClient.auth.admin.deleteUser(validatedId);

        if (error) {
            console.error('Erreur suppression agent:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // La table profiles est normalement en CASCADE sur la suppression de auth.users
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Erreur API delete-agent:', error);
        return NextResponse.json({ error: 'Erreur interne au serveur' }, { status: 500 });
    }
}
