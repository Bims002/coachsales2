"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Play, TrendingUp, Package, Loader2, Award, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/context/AuthContext';

interface GlobalStats {
    totalAgents: number;
    totalSimulations: number;
    averageScore: number;
    totalProducts: number;
}

interface RecentSimulation {
    id: string;
    score: number;
    created_at: string;
    duration_seconds: number;
    profiles?: { name: string; email: string } | { name: string; email: string }[] | null;
    products?: { name: string } | { name: string }[] | null;
}

export default function AdminPage() {
    const router = useRouter();
    const [stats, setStats] = useState<GlobalStats>({
        totalAgents: 0,
        totalSimulations: 0,
        averageScore: 0,
        totalProducts: 0
    });
    const [recentSims, setRecentSims] = useState<RecentSimulation[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const { user, isAdmin, loading: authLoading } = useAuth();

    // Protection côté client : si pas admin → rediriger vers /dashboard
    useEffect(() => {
        if (!authLoading && user && !isAdmin) {
            router.push('/dashboard');
        }
    }, [authLoading, user, isAdmin, router]);

    useEffect(() => {
        async function fetchAdminData() {
            if (authLoading) return;
            if (!user || !isAdmin) {
                setLoading(false);
                return;
            }

            try {
                const [agentsRes, simsRes, productsRes] = await Promise.all([
                    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'AGENT'),
                    supabase.from('simulations').select('score', { count: 'exact' }),
                    supabase.from('products').select('id', { count: 'exact', head: true })
                ]);

                const totalSimulations = simsRes.count || 0;
                const avgScore = simsRes.data && simsRes.data.length > 0
                    ? Math.round(simsRes.data.reduce((acc: number, s: any) => acc + s.score, 0) / simsRes.data.length)
                    : 0;

                setStats({
                    totalAgents: agentsRes.count || 0,
                    totalSimulations,
                    averageScore: avgScore,
                    totalProducts: productsRes.count || 0
                });

                const { data: simData } = await supabase
                    .from('simulations')
                    .select('id, score, created_at, duration_seconds, profiles(name, email), products(name)')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (simData) setRecentSims(simData as RecentSimulation[]);
            } catch (err) {
                console.error('[ADMIN] ❌ Erreur chargement:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchAdminData();
    }, [user, authLoading, isAdmin]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return "À l'instant";
        if (hours < 24) return `Il y a ${hours}h`;
        const days = Math.floor(hours / 24);
        if (days === 1) return "Hier";
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return { color: 'var(--color-success)', bg: 'var(--color-success-light)' };
        if (score >= 60) return { color: '#986F0B', bg: 'var(--color-warning-light)' };
        return { color: 'var(--color-error)', bg: 'var(--color-error-light)' };
    };

    if (loading) {
        return (
            <div className="fluent-container">
                <div className="flex justify-center items-center min-h-[50vh]">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--color-secondary)' }} />
                </div>
            </div>
        );
    }

    const statCards = [
        { label: 'Agents', value: stats.totalAgents, icon: Users, color: '#0078D4', bgColor: '#DEECF9' },
        { label: 'Simulations', value: stats.totalSimulations, icon: Play, color: '#8661C5', bgColor: '#E8E0F5' },
        { label: 'Score Moyen', value: `${stats.averageScore}%`, icon: Award, color: '#107C10', bgColor: '#DFF6DD' },
        { label: 'Produits', value: stats.totalProducts, icon: Package, color: '#FFB900', bgColor: '#FFF4CE' },
    ];

    return (
        <div className="fluent-container">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #8661C5, #0078D4)' }}
                    >
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <h1>Administration</h1>
                </div>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    Vue d'ensemble de la plateforme de formation
                </p>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat, i) => (
                    <div key={i} className="stat-card group hover:scale-[1.02] transition-transform cursor-default" style={{ borderLeftColor: stat.color }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="stat-card-label">{stat.label}</p>
                                <p className="stat-card-value">{stat.value}</p>
                            </div>
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
                                style={{ backgroundColor: stat.bgColor }}
                            >
                                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Link
                    href="/admin/products"
                    className="fluent-card group"
                    style={{ display: 'flex', alignItems: 'center', gap: '20px' }}
                >
                    <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: '#E8E0F5' }}
                    >
                        <Package className="w-7 h-7" style={{ color: '#8661C5' }} />
                    </div>
                    <div className="flex-1">
                        <h3 className="mb-1">Gérer les Produits</h3>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Créer, modifier et configurer les produits de simulation
                        </p>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-secondary)' }} />
                </Link>

                <Link
                    href="/admin/agents"
                    className="fluent-card group"
                    style={{ display: 'flex', alignItems: 'center', gap: '20px' }}
                >
                    <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: '#DEECF9' }}
                    >
                        <Users className="w-7 h-7" style={{ color: '#0078D4' }} />
                    </div>
                    <div className="flex-1">
                        <h3 className="mb-1">Gérer les Agents</h3>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Consulter les performances et gérer les comptes
                        </p>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-secondary)' }} />
                </Link>
            </div>

            {/* Activité récente */}
            <div className="fluent-card" style={{ padding: 0 }}>
                <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--color-gray-20)' }}>
                    <h3 className="flex items-center gap-2">
                        <Clock className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} />
                        Dernières Simulations
                    </h3>
                </div>

                {recentSims.length === 0 ? (
                    <div className="p-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                        <Play className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>Aucune simulation pour le moment</p>
                    </div>
                ) : (
                    <table className="fluent-table">
                        <thead>
                            <tr>
                                <th>Agent</th>
                                <th>Produit</th>
                                <th>Score</th>
                                <th>Date</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSims.map((sim) => {
                                const profileData = Array.isArray(sim.profiles) ? sim.profiles[0] : sim.profiles;
                                const productData = Array.isArray(sim.products) ? sim.products[0] : sim.products;
                                const scoreStyle = getScoreColor(sim.score);

                                return (
                                    <tr key={sim.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                                                    style={{ backgroundColor: 'var(--color-primary)' }}
                                                >
                                                    {profileData?.name?.charAt(0) || '?'}
                                                </div>
                                                <span className="font-medium">{profileData?.name || 'Agent'}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--color-text-secondary)' }}>
                                            {productData?.name || 'Simulation'}
                                        </td>
                                        <td>
                                            <span
                                                className="fluent-badge"
                                                style={{ backgroundColor: scoreStyle.bg, color: scoreStyle.color }}
                                            >
                                                {sim.score}%
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-secondary)' }}>
                                            {formatDate(sim.created_at)}
                                        </td>
                                        <td>
                                            <Link
                                                href={`/results/${sim.id}`}
                                                className="btn-ghost text-xs px-3 py-1"
                                                style={{ minHeight: 'auto' }}
                                            >
                                                Voir
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
