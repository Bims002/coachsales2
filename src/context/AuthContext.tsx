"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-browser';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: { name: string; role: string } | null;
    isAdmin: boolean;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null; role: string | null }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<{ name: string; role: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('name, role')
                .eq('id', userId)
                .single();

            if (data) {
                setProfile(data);
            } else if (error) {
                console.warn('[AUTH] ⚠️ Profil non trouvé:', error.message);
            }
        } catch (err) {
            console.error('[AUTH] ❌ Erreur fetchProfile:', err);
        }
    };

    useEffect(() => {
        // ⏱️ Timeout de sécurité: si l'auth n'a pas fini en 5s, on débloque quand même
        const safetyTimeout = setTimeout(() => {
            setLoading((current) => {
                if (current) {
                    console.warn('[AUTH] ⏱️ Safety timeout: forçage loading=false après 5s');
                    return false;
                }
                return current;
            });
        }, 5000);

        const initializeAuth = async () => {
            try {
                // Utiliser getUser() pour être cohérent avec le middleware
                // getUser() rafraîchit le token, getSession() peut retourner un token expiré
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    // Récupérer aussi la session pour la stocker
                    const { data: { session } } = await supabase.auth.getSession();
                    setSession(session);
                    setUser(user);
                    await fetchProfile(user.id);
                } else {
                    setSession(null);
                    setUser(null);
                }
            } catch (err) {
                console.error('[AUTH] ❌ Erreur initializeAuth:', err);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => {
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []);

    const isAdmin = profile?.role?.toLowerCase() === 'admin';

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user || !data.session) {
            return { error: error as Error | null, role: null };
        }

        // Fetch REST direct avec le JWT — contourne le client Supabase
        // Le access_token est garanti valide (vient de signInWithPassword)
        let role: string | null = null;
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=role`,
                {
                    headers: {
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                        'Authorization': `Bearer ${data.session.access_token}`,
                        'Accept': 'application/json',
                    },
                }
            );
            const profiles = await res.json();
            if (profiles?.[0]?.role) {
                role = profiles[0].role.toLowerCase();
                console.log(`[AUTH] ✅ Rôle détecté via REST: ${role}`);
            } else {
                console.warn('[AUTH] ⚠️ Profil vide:', profiles);
            }
        } catch (fetchErr) {
            console.error('[AUTH] ❌ Fetch profil échoué:', fetchErr);
        }

        return { error: null, role };
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });

        return { error: error as Error | null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, isAdmin, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
