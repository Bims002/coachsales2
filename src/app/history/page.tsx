"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, Clock, Trophy, ChevronRight, Loader2, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/context/AuthContext';

interface Simulation {
    id: string;
    score: number;
    duration_seconds: number;
    created_at: string;
    products?: { name: string } | { name: string }[] | null;
}

function getProductName(products?: { name: string } | { name: string }[] | null): string {
    if (!products) return 'Simulation';
    if (Array.isArray(products)) return products[0]?.name || 'Simulation';
    return products.name || 'Simulation';
}

export default function HistoryPage() {
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const { user } = useAuth();

    useEffect(() => {
        async function fetchHistory() {
            if (!user) return;

            const { data, error } = await supabase
                .from('simulations')
                .select('id, score, duration_seconds, created_at, products(name)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) setSimulations(data as Simulation[]);
            setLoading(false);
        }
        fetchHistory();
    }, [user]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getScoreStyle = (score: number) => {
        if (score >= 80) return { color: 'var(--color-success)', bg: 'var(--color-success-light)' };
        if (score >= 60) return { color: '#986F0B', bg: 'var(--color-warning-light)' };
        return { color: 'var(--color-error)', bg: 'var(--color-error-light)' };
    };

    return (
        <div className="fluent-container" style={{ maxWidth: '900px' }}>
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-primary-light)' }}
                    >
                        <History className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <h1>Historique des simulations</h1>
                </div>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    Consultez vos performances passées et suivez votre progression
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
            ) : simulations.length === 0 ? (
                <div className="fluent-card text-center" style={{ padding: '48px' }}>
                    <History
                        className="w-16 h-16 mx-auto mb-4"
                        style={{ color: 'var(--color-text-disabled)' }}
                    />
                    <h3 className="mb-2">Aucune simulation</h3>
                    <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                        Lancez votre première simulation pour commencer à vous entraîner
                    </p>
                    <Link href="/simulation" className="btn-primary">
                        <Play className="w-5 h-5" />
                        Démarrer une simulation
                    </Link>
                </div>
            ) : (
                <>
                    {/* Stats Bar */}
                    <div className="fluent-card mb-6" style={{ padding: '20px' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5" style={{ color: '#FFB900' }} />
                                <span className="font-semibold">Statistiques globales</span>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-xl font-bold">{simulations.length}</p>
                                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Simulations</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold" style={{ color: 'var(--color-success)' }}>
                                        {Math.round(simulations.reduce((acc, s) => acc + s.score, 0) / simulations.length)}%
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Score moyen</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                                        {Math.max(...simulations.map(s => s.score))}%
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Meilleur</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Simulations List */}
                    <div className="space-y-3">
                        {simulations.map((sim) => {
                            const scoreStyle = getScoreStyle(sim.score);
                            return (
                                <Link
                                    key={sim.id}
                                    href={`/results/${sim.id}`}
                                    className="fluent-card group"
                                    style={{
                                        padding: '16px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-lg flex items-center justify-center font-bold"
                                            style={{ backgroundColor: scoreStyle.bg, color: scoreStyle.color }}
                                        >
                                            {sim.score}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-1">
                                                {getProductName(sim.products)}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {Math.floor(sim.duration_seconds / 60)}:{(sim.duration_seconds % 60).toString().padStart(2, '0')}
                                                </span>
                                                <span>{formatDate(sim.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight
                                        className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                    />
                                </Link>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
