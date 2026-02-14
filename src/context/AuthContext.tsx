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
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error as Error | null };
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
