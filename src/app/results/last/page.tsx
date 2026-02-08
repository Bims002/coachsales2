"use client";

import { CheckCircle2, AlertCircle, Award, ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ResultsPage() {
    // Score factice pour la démonstration
    const results = {
        scoreGlobal: 75,
        result: 'vente',
        scores: {
            clarte: 18,
            reactivite: 22,
            argumentation: 15,
            closing: 20
        },
        justifications: {
            clarte: "Quelques hésitations mais discours globalement clair",
            reactivite: "Excellente gestion du timing, pas de blancs",
            argumentation: "Arguments présents mais parfois superficiels",
            closing: "Tentative de closing mais sans insistance"
        },
        pointsForts: [
            "Très bonne réactivité face aux objections - a su rebondir immédiatement",
            "Ton professionnel et confiant tout au long de l'appel"
        ],
        axesAmelioration: [
            "Trop d'hésitations en début d'appel - répète 'voilà' trop souvent",
            "N'a pas vraiment traité l'objection sur le prix de manière approfondie"
        ]
    };

    const scoreItems = [
        { label: 'Clarté & Éloquence', score: results.scores.clarte, max: 25, color: 'bg-blue-500', icon: Award },
        { label: 'Réactivité', score: results.scores.reactivite, max: 25, color: 'bg-green-500', icon: Award },
        { label: 'Argumentation', score: results.scores.argumentation, max: 25, color: 'bg-yellow-500', icon: Award },
        { label: 'Closing', score: results.scores.closing, max: 25, color: 'bg-purple-500', icon: Award },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 text-[var(--color-brand-muted)] hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
                </Link>
                <div className="text-[var(--color-brand-muted)] text-sm">Simulation terminée le {new Date().toLocaleDateString('fr-FR')}</div>
            </div>

            <section className="glass-card p-10 text-center space-y-6 border-white/20 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/20 blur-[100px] pointer-events-none" />

                <div className="space-y-2">
                    <h1 className="text-xl font-bold uppercase tracking-widest text-[var(--color-brand-muted)]">Votre Score Global</h1>
                    <div className="text-8xl font-black text-white">{results.scoreGlobal}<span className="text-3xl text-white/30">/100</span></div>
                </div>

                <div className="flex justify-center flex-wrap gap-4">
                    <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> VENTE CONCLUE
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                        7 min 24s
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-wide">
                        <BarChart3 className="w-5 h-5 text-blue-500" /> Détail des Scores
                    </h2>
                    <div className="space-y-4">
                        {scoreItems.map((item, i) => (
                            <div key={i} className="glass-card p-4 space-y-3 border-white/10">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-white/80">{item.label}</span>
                                    <span className="font-bold">{item.score}<span className="text-white/30">/{item.max}</span></span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(item.score / item.max) * 100}%` }}
                                        transition={{ duration: 1, delay: i * 0.1 }}
                                        className={`h-full ${item.color}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-wide">
                        <FileText className="w-5 h-5 text-purple-500" /> Analyse du Coach
                    </h2>
                    <div className="space-y-4">
                        <div className="glass-card p-6 border-green-500/20 bg-green-500/5 space-y-3">
                            <h3 className="text-green-500 font-bold flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4" /> POINTS FORTS
                            </h3>
                            <ul className="space-y-2 text-sm text-white/80">
                                {results.pointsForts.map((pt, i) => (
                                    <li key={i} className="flex gap-2"><span>•</span> {pt}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="glass-card p-6 border-yellow-500/20 bg-yellow-500/5 space-y-3">
                            <h3 className="text-yellow-500 font-bold flex items-center gap-2 text-sm">
                                <AlertCircle className="w-4 h-4" /> AXES D'AMÉLIORATION
                            </h3>
                            <ul className="space-y-2 text-sm text-white/80">
                                {results.axesAmelioration.map((pt, i) => (
                                    <li key={i} className="flex gap-2"><span>•</span> {pt}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
            </div>

            <div className="flex justify-center gap-4 py-8">
                <Link href="/simulation" className="btn-primary flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" /> Refaire une simulation
                </Link>
                <button className="btn-secondary flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Télécharger le rapport
                </button>
            </div>
        </div>
    );
}

// Composant icône manquant dans l'import
function BarChart3(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
        </svg>
    );
}
