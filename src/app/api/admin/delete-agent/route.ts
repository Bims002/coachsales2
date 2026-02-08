import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
    try {
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

        // 3. Récupérer l'ID de l'agent à supprimer
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('id');

        if (!agentId) {
            return NextResponse.json({ error: 'ID de l\'agent manquant' }, { status: 400 });
        }

        // Empêcher l'admin de se supprimer lui-même via cette route par précaution
        if (agentId === session.user.id) {
            return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même' }, { status: 400 });
        }

        // 4. Supprimer l'utilisateur via l'API Admin
        const adminClient = createAdminClient();
        const { error } = await adminClient.auth.admin.deleteUser(agentId);

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
