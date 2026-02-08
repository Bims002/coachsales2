"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Loader2, Mail, Lock, User, Mic } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setLoading(true);

        const { error } = await signUp(email, password, fullName);

        if (error) {
            setError(error.message || 'Erreur lors de l\'inscription');
            setLoading(false);
        } else {
            setSuccess('Inscription réussie ! Vérifiez votre boîte mail pour confirmer votre compte, puis connectez-vous.');
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
                    <h1 className="text-2xl font-bold mb-1">Créer un compte</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Rejoignez la plateforme de formation
                    </p>
                </div>

                {/* Card */}
                <div className="fluent-card">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="fluent-label">Nom complet</label>
                            <div className="relative">
                                <User
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                                    style={{ color: 'var(--color-text-disabled)' }}
                                />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="fluent-input"
                                    style={{ paddingLeft: '44px' }}
                                    placeholder="Jean Dupont"
                                    required
                                />
                            </div>
                        </div>

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

                        <div>
                            <label className="fluent-label">Confirmer le mot de passe</label>
                            <div className="relative">
                                <Lock
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                                    style={{ color: 'var(--color-text-disabled)' }}
                                />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
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

                        {success && (
                            <div className="fluent-message fluent-message-success">
                                {success}
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
                                    <UserPlus className="w-5 h-5" />
                                    Créer mon compte
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
                        Déjà un compte ?{' '}
                        <Link
                            href="/login"
                            className="font-semibold"
                            style={{ color: 'var(--color-primary)' }}
                        >
                            Se connecter
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
