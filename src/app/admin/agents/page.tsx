"use client";

import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Mail, Calendar, X, Loader2, Key, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

export default function AgentsAdmin() {
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const supabase = createClient();

    // Données du formulaire
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const fetchAgents = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'AGENT')
            .order('created_at', { ascending: false });

        if (data) setAgents(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const handleCreateAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError(null);
        setSuccess(null);

        // Vérification de la confirmation du mot de passe
        if (formData.password !== formData.confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            setFormLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/admin/create-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la création');
            }

            setSuccess('Agent créé avec succès !');
            setFormData({ name: '', email: '', password: '', confirmPassword: '' });
            setTimeout(() => {
                setIsModalOpen(false);
                setSuccess(null);
                fetchAgents();
            }, 1500);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteAgent = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible.')) return;

        try {
            const response = await fetch(`/api/admin/delete-agent?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erreur lors de la suppression');
            }

            fetchAgents();
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="fluent-container">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: '#DEECF9' }}
                        >
                            <Users className="w-5 h-5" style={{ color: '#0078D4' }} />
                        </div>
                        <h1>Gestion des Agents</h1>
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Inscrivez vos agents et suivez leur progression sur la plateforme.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary w-fit"
                >
                    <UserPlus className="w-5 h-5" />
                    Ajouter un Agent
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
            ) : (
                <div className="fluent-card" style={{ padding: 0 }}>
                    <table className="fluent-table">
                        <thead>
                            <tr>
                                <th>Agent</th>
                                <th>Email Professionnel</th>
                                <th>Date d'Inscription</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
                                        Aucun agent trouvé.
                                    </td>
                                </tr>
                            ) : (
                                agents.map((agent) => (
                                    <tr key={agent.id} className="group">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                                    style={{ backgroundColor: 'var(--color-primary)' }}
                                                >
                                                    {agent.name?.charAt(0) || '?'}
                                                </div>
                                                <span className="font-semibold">{agent.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--color-text-secondary)' }}>
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 opacity-50" />
                                                {agent.email}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--color-text-secondary)' }}>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 opacity-50" />
                                                {new Date(agent.created_at).toLocaleDateString('fr-FR')}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDeleteAgent(agent.id)}
                                                className="btn-ghost p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                style={{ color: 'var(--color-error)', minHeight: 'auto', border: 'none' }}
                                                title="Supprimer l'agent"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de création */}
            {isModalOpen && (
                <div className="fluent-modal-overlay">
                    <div className="fluent-modal animate-in zoom-in-95 duration-200" style={{ maxWidth: '500px' }}>
                        <div className="fluent-modal-header">
                            <div className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                                <h2 style={{ fontSize: '1.25rem' }}>Nouvel Agent</h2>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-[var(--color-gray-20)] rounded-lg"
                            >
                                <X className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAgent}>
                            <div className="fluent-modal-body">
                                <div
                                    className="mb-6 p-4 rounded-lg flex gap-3"
                                    style={{ backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-primary)20' }}
                                >
                                    <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                        L'agent pourra se connecter immédiatement après sa création avec l'email et le mot de passe provisoire fournis.
                                    </p>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="fluent-label">Nom Complet</label>
                                        <div className="relative">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-disabled)' }} />
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="fluent-input"
                                                style={{ paddingLeft: '44px' }}
                                                placeholder="Ex: Jean Dupont"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="fluent-label">Email Professionnel</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-disabled)' }} />
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="fluent-input"
                                                style={{ paddingLeft: '44px' }}
                                                placeholder="agent@coachsales.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="fluent-label">Mot de passe</label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-disabled)' }} />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    minLength={6}
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="fluent-input"
                                                    style={{ paddingLeft: '38px', paddingRight: '38px', fontSize: '0.875rem' }}
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center"
                                                    style={{ color: 'var(--color-text-disabled)' }}
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="fluent-label">Confirmation</label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-disabled)' }} />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    minLength={6}
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                    className="fluent-input"
                                                    style={{ paddingLeft: '38px', paddingRight: '38px', fontSize: '0.875rem' }}
                                                    placeholder="••••••••"
                                                />
                                            </div>
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

                                </div>
                            </div>

                            <div className="fluent-modal-footer">
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="btn-primary w-full"
                                    style={{ padding: '12px' }}
                                >
                                    {formLoading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5" />
                                            Créer le compte
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
