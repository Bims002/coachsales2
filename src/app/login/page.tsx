"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogIn, Loader2, Mail, Lock, Mic } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const { signIn, user, isAdmin, loading: authLoading } = useAuth();

    // Après signIn, attendre que AuthContext charge le profil avant de rediriger
    useEffect(() => {
        if (loginSuccess && !authLoading && user) {
            window.location.href = isAdmin ? '/admin' : '/dashboard';
        }
    }, [loginSuccess, authLoading, user, isAdmin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await signIn(email, password);

            if (error) {
                if (error.message?.includes('Email not confirmed')) {
                    setError('Veuillez confirmer votre email avant de vous connecter.');
                } else if (error.message?.includes('Invalid login credentials')) {
                    setError('Email ou mot de passe incorrect.');
                } else {
                    setError(error.message || 'Erreur de connexion');
                }
                setLoading(false);
                return;
            }

            // Ne PAS rediriger ici — le useEffect ci-dessus gère la redirection
            // après que AuthContext ait chargé le profil
            setLoginSuccess(true);

        } catch (err) {
            console.error('[LOGIN] Erreur inattendue:', err);
            setError('Une erreur inattendue est survenue.');
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6"
            style={{ backgroundColor: 'var(--color-surface-secondary)' }}
        >
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div
                        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'linear-gradient(135deg, #0078D4, #8661C5)' }}
                    >
                        <Mic className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold mb-1">Bienvenue</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Connectez-vous à CoachSales
                    </p>
                </div>

                {/* Card */}
                <div className="fluent-card">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="fluent-label">Email</label>
                            <div className="relative">
                                <Mail
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                                    style={{ color: 'var(--color-text-disabled)' }}
                                />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="fluent-input"
                                    style={{ paddingLeft: '44px' }}
                                    placeholder="agent@entreprise.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="fluent-label">Mot de passe</label>
                            <div className="relative">
                                <Lock
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                                    style={{ color: 'var(--color-text-disabled)' }}
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="fluent-input"
                                    style={{ paddingLeft: '44px' }}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="fluent-message fluent-message-error">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full"
                            style={{ padding: '12px 20px' }}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Se connecter
                                </>
                            )}
                        </button>
                    </form>

                    <div
                        className="mt-6 pt-6 text-center text-sm"
                        style={{
                            borderTop: '1px solid var(--color-gray-20)',
                            color: 'var(--color-text-secondary)'
                        }}
                    >
                        Pas encore de compte ?{' '}
                        <Link
                            href="/register"
                            className="font-semibold"
                            style={{ color: 'var(--color-primary)' }}
                        >
                            S'inscrire
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <p
                    className="text-center text-xs mt-6"
                    style={{ color: 'var(--color-text-disabled)' }}
                >
                    © 2024 CoachSales. Tous droits réservés.
                </p>
            </div>
        </div>
    );
}
