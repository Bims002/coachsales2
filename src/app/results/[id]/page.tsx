"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Trophy, TrendingUp, Clock, ArrowLeft, MessageSquare, Play, History, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface SimulationResult {
    id: string;
    score: number;
    feedback: string;
    transcript: Array<{ role: string; content: string }>;
    duration_seconds: number;
    created_at: string;
    products?: { name: string } | { name: string }[] | null;
    strengths?: string[];
    improvements?: string[];
}

function getProductName(products?: { name: string } | { name: string }[] | null): string {
    if (!products) return 'Simulation de vente';
    if (Array.isArray(products)) return products[0]?.name || 'Simulation de vente';
    return products.name || 'Simulation de vente';
}

export default function ResultsPage() {
    const params = useParams();
    const id = params?.id as string | undefined;
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchResult() {
            const { data, error } = await supabase
                .from('simulations')
                .select('*, products(name)')
                .eq('id', id)
                .single();

            if (data) setResult(data as SimulationResult);
            setLoading(false);
        }
        if (id) fetchResult();
    }, [id]);

    if (loading) {
        return (
            <div className="fluent-container">
                <div className="flex justify-center items-center min-h-[50vh]">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="fluent-container text-center" style={{ paddingTop: '80px' }}>
                <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-text-disabled)' }} />
                <h2 className="mb-2">Résultat introuvable</h2>
                <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                    Cette simulation n'existe pas ou a été supprimée.
                </p>
                <Link href="/dashboard" className="btn-primary">
                    Retour au tableau de bord
                </Link>
            </div>
        );
    }

    const getScoreStyle = (score: number) => {
        if (score >= 80) return { color: 'var(--color-success)', bg: 'var(--color-success-light)', gradient: '#107C10' };
        if (score >= 60) return { color: '#986F0B', bg: 'var(--color-warning-light)', gradient: '#FFB900' };
        return { color: 'var(--color-error)', bg: 'var(--color-error-light)', gradient: '#D13438' };
    };

    const scoreStyle = getScoreStyle(result.score);

    return (
        <div className="fluent-container" style={{ maxWidth: '900px' }}>
            {/* Back */}
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 mb-6 text-sm transition-colors hover:underline"
                style={{ color: 'var(--color-text-secondary)' }}
            >
                <ArrowLeft className="w-4 h-4" />
                Retour au tableau de bord
            </Link>

            {/* Score Card */}
            <div
                className="fluent-card-elevated text-center mb-8"
                style={{
                    background: `linear-gradient(135deg, ${scoreStyle.gradient}15 0%, transparent 100%)`,
                    border: `1px solid ${scoreStyle.gradient}30`
                }}
            >
                <div
                    className="w-28 h-28 mx-auto rounded-full flex items-center justify-center mb-4"
                    style={{
                        background: `linear-gradient(135deg, ${scoreStyle.gradient}, ${scoreStyle.gradient}80)`,
                    }}
                >
                    <span className="text-5xl font-black text-white">{result.score}</span>
                </div>
                <h1 className="mb-2">
                    {result.score >= 80 ? '🏆 Excellent travail !' : result.score >= 60 ? '👍 Bon effort !' : '💪 Continuez !'}
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    {getProductName(result.products)}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="stat-card" style={{ borderLeftColor: 'var(--color-primary)' }}>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-primary-light)' }}
                        >
                            <Clock className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div>
                            <p className="stat-card-label">Durée</p>
                            <p className="stat-card-value" style={{ fontSize: '1.25rem' }}>
                                {Math.floor(result.duration_seconds / 60)}:{(result.duration_seconds % 60).toString().padStart(2, '0')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#8661C5' }}>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: '#E8E0F5' }}
                        >
                            <MessageSquare className="w-5 h-5" style={{ color: '#8661C5' }} />
                        </div>
                        <div>
                            <p className="stat-card-label">Échanges</p>
                            <p className="stat-card-value" style={{ fontSize: '1.25rem' }}>
                                {result.transcript?.length || 0} messages
                            </p>
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: scoreStyle.gradient }}>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: scoreStyle.bg }}
                        >
                            <TrendingUp className="w-5 h-5" style={{ color: scoreStyle.color }} />
                        </div>
                        <div>
                            <p className="stat-card-label">Score</p>
                            <p className="stat-card-value" style={{ fontSize: '1.25rem', color: scoreStyle.color }}>
                                {result.score}/100
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feedback */}
            <div className="fluent-card mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5" style={{ color: '#FFB900' }} />
                    <h3>Retour du coach</h3>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                    {result.feedback || "Analyse en cours..."}
                </p>
            </div>

            {/* Points forts et Axes d'amélioration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Points forts */}
                <div className="fluent-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <ThumbsUp className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                        <h3>Points forts</h3>
                    </div>
                    <ul className="space-y-2">
                        {(result.strengths && result.strengths.length > 0) ? (
                            result.strengths.slice(0, 2).map((strength, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    <span style={{ color: 'var(--color-success)' }}>✓</span>
                                    {strength}
                                </li>
                            ))
                        ) : (
                            <li className="text-sm" style={{ color: 'var(--color-text-disabled)' }}>Aucun point fort identifié</li>
                        )}
                    </ul>
                </div>

                {/* Axes d'amélioration */}
                <div className="fluent-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <ThumbsDown className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
                        <h3>Axes d'amélioration</h3>
                    </div>
                    <ul className="space-y-2">
                        {(result.improvements && result.improvements.length > 0) ? (
                            result.improvements.slice(0, 2).map((improvement, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    <span style={{ color: 'var(--color-warning)' }}>→</span>
                                    {improvement}
                                </li>
                            ))
                        ) : (
                            <li className="text-sm" style={{ color: 'var(--color-text-disabled)' }}>Aucun axe identifié</li>
                        )}
                    </ul>
                </div>
            </div>

            {/* Transcript */}
            <div className="fluent-card">
                <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                    <h3>Transcription de l'appel</h3>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {result.transcript?.map((msg, i) => (
                        <div
                            key={i}
                            className="p-3 rounded-lg"
                            style={{
                                backgroundColor: msg.role === 'user' ? 'var(--color-primary-light)' : 'var(--color-success-light)',
                                borderLeft: `4px solid ${msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-success)'}`,
                                marginLeft: msg.role === 'user' ? '32px' : 0,
                                marginRight: msg.role === 'user' ? 0 : '32px'
                            }}
                        >
                            <div
                                className="text-xs font-bold uppercase tracking-wider mb-1"
                                style={{ color: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-success)' }}
                            >
                                {msg.role === 'user' ? '🎤 Vous' : '👤 Prospect'}
                            </div>
                            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                {msg.content}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4 mt-8">
                <Link href="/simulation" className="btn-primary">
                    <Play className="w-5 h-5" />
                    Nouvelle simulation
                </Link>
                <Link href="/history" className="btn-ghost">
                    <History className="w-5 h-5" />
                    Voir l'historique
                </Link>
            </div>
        </div>
    );
}
