"use client";

import { useState, useEffect } from 'react';
import { Play, History, TrendingUp, Star, Loader2, ArrowRight, Target } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/context/AuthContext';

interface Simulation {
    id: string;
    score: number;
    created_at: string;
    products?: { name: string } | { name: string }[] | null;
}

function getProductName(products?: { name: string } | { name: string }[] | null): string {
    if (!products) return 'Simulation';
    if (Array.isArray(products)) return products[0]?.name || 'Simulation';
    return products.name || 'Simulation';
}

interface Profile {
    name: string;
}

export default function AgentDashboard() {
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const { user, profile, isAdmin, loading: authLoading } = useAuth();

    // Admins → rediriger vers /admin (isAdmin vient d'AuthContext, pas de requête extra)
    useEffect(() => {
        if (!authLoading && isAdmin) {
            window.location.href = '/admin';
        }
    }, [authLoading, isAdmin]);

    useEffect(() => {
        async function fetchData() {
            if (authLoading) return;
            if (!user || isAdmin) {
                setLoading(false);
                return;
            }

            try {
                const { data: simData } = await supabase
                    .from('simulations')
                    .select('id, score, created_at, products(name)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (simData) setSimulations(simData);
            } catch (err) {
                console.error('[DASHBOARD] ❌ Erreur chargement:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user, authLoading, isAdmin]);

    const avgScore = simulations.length > 0
        ? Math.round(simulations.reduce((acc, s) => acc + s.score, 0) / simulations.length)
        : 0;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return "Aujourd'hui";
        if (days === 1) return "Hier";
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'var(--color-success)';
        if (score >= 60) return 'var(--color-warning)';
        return 'var(--color-error)';
    };

    const stats = [
        {
            label: 'Score Moyen',
            value: `${avgScore}`,
            suffix: '/100',
            icon: Star,
            color: '#FFB900',
            bgColor: '#FFF4CE'
        },
        {
            label: 'Simulations',
            value: simulations.length.toString(),
            suffix: '',
            icon: Play,
            color: '#0078D4',
            bgColor: '#DEECF9'
        },
        {
            label: 'Meilleur Score',
            value: simulations.length > 0 ? `${Math.max(...simulations.map(s => s.score))}` : '-',
            suffix: simulations.length > 0 ? '/100' : '',
            icon: TrendingUp,
            color: '#107C10',
            bgColor: '#DFF6DD'
        },
    ];

    if (loading) {
        return (
            <div className="fluent-container">
                <div className="flex justify-center items-center min-h-[50vh]">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="fluent-container">
            {/* Hero Section */}
            <div className="fluent-card-elevated mb-8" style={{
                background: 'linear-gradient(135deg, #0078D4 0%, #8661C5 100%)',
                color: 'white'
            }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
                    <div>
                        <h1 className="text-2xl font-bold mb-2" style={{ color: 'white' }}>
                            Bonjour, {profile?.name || user?.email?.split('@')[0]} 👋
                        </h1>
                        <p className="opacity-90" style={{ color: 'white' }}>
                            Prêt pour votre prochaine simulation de vente ?
                        </p>
                    </div>
                    <Link
                        href="/simulation"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0078D4] font-semibold rounded-lg hover:bg-opacity-90 transition-all shadow-lg"
                    >
                        <Play className="w-5 h-5 fill-current" />
                        Nouvelle Simulation
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card" style={{ borderLeftColor: stat.color }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="stat-card-label">{stat.label}</p>
                                <p className="stat-card-value">
                                    {stat.value}
                                    <span className="text-base font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                                        {stat.suffix}
                                    </span>
                                </p>
                            </div>
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: stat.bgColor }}
                            >
                                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Simulations */}
                <div className="lg:col-span-2">
                    <div className="fluent-card" style={{ padding: 0 }}>
                        <div className="flex items-center justify-between p-6 pb-4">
                            <h2 className="flex items-center gap-2" style={{ fontSize: '1.125rem' }}>
                                <History className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                                Dernières Simulations
                            </h2>
                            <Link
                                href="/history"
                                className="text-sm font-semibold flex items-center gap-1 hover:underline"
                                style={{ color: 'var(--color-primary)' }}
                            >
                                Voir tout
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {simulations.length === 0 ? (
                            <div className="p-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                                <Play className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>Aucune simulation pour le moment</p>
                                <p className="text-sm mt-2">Lancez votre première simulation !</p>
                            </div>
                        ) : (
                            <table className="fluent-table">
                                <thead>
                                    <tr>
                                        <th>Produit</th>
                                        <th>Score</th>
                                        <th>Date</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {simulations.map((sim) => (
                                        <tr key={sim.id}>
                                            <td className="font-medium">
                                                {getProductName(sim.products)}
                                            </td>
                                            <td>
                                                <span
                                                    className="font-bold"
                                                    style={{ color: getScoreColor(sim.score) }}
                                                >
                                                    {sim.score}/100
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
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Objective Card */}
                <div className="lg:col-span-1">
                    <div className="fluent-card h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                            <h3>Objectif de la Semaine</h3>
                        </div>

                        <div
                            className="p-4 rounded-lg mb-4"
                            style={{ backgroundColor: avgScore >= 80 ? 'var(--color-success-light)' : 'var(--color-primary-light)' }}
                        >
                            <p className="font-semibold" style={{ color: avgScore >= 80 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                                Atteindre un score moyen de 80%
                            </p>
                        </div>

                        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                            {avgScore >= 80
                                ? "🎉 Objectif atteint ! Continuez comme ça !"
                                : "Travaillez particulièrement la gestion des objections."}
                        </p>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--color-text-secondary)' }}>Progression</span>
                                <span className="font-bold">{avgScore}%</span>
                            </div>
                            <div
                                className="h-2 w-full rounded-full overflow-hidden"
                                style={{ backgroundColor: 'var(--color-gray-30)' }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min(avgScore, 100)}%`,
                                        backgroundColor: avgScore >= 80 ? 'var(--color-success)' : 'var(--color-primary)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
