"use client";

import { useState, useEffect, useRef } from 'react';
import { Mic, Phone, PhoneOff, User as UserIcon, Loader2, ArrowLeft, Trophy, Info } from "lucide-react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import io from 'socket.io-client';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/context/AuthContext';

interface Product {
    id: string;
    name: string;
    description: string;
    difficulty: number;
    objections?: string[];
}

interface SimulationResult {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    transcript: any[];
    duration_seconds: number;
    product_id: string;
    user_id: string;
}

export default function SimulationPage() {
    const [status, setStatus] = useState<'idle' | 'calling' | 'speaking' | 'listening'>('idle');
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [isSocketReady, setIsSocketReady] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [duration, setDuration] = useState(0);

    const socketRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const socketInitialized = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const supabase = createClient();
    const { user } = useAuth();
    const router = useRouter();

    // Charger les produits depuis Supabase
    useEffect(() => {
        async function fetchProducts() {
            const { data, error } = await supabase.from('products').select('*');
            if (data) setProducts(data);
            setLoadingProducts(false);
        }
        fetchProducts();
    }, []);

    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        if (socketInitialized.current) return;
        socketInitialized.current = true;

        const initSocket = async () => {
            try {
                await fetch('/api/simulation-socket');
                const socket = io({ path: '/api/simulation-socket' });

                socket.on('connect', () => {
                    setIsSocketReady(true);
                });

                socket.on('audio_chunk', (data: any) => {
                    playAudio(data);
                });

                socket.on('transcript_interim', (data: { text: string }) => {
                    setCurrentTranscript(data.text);
                });

                socket.on('simulation_complete', async (result: SimulationResult) => {
                    console.log('--- [CLIENT] 📊 Résultat reçu du serveur:', result);

                    // Utiliser userRef ou tenter de récupérer la session Supabase en direct
                    let currentUser = userRef.current;

                    if (!currentUser) {
                        const { data: { session } } = await supabase.auth.getSession();
                        currentUser = session?.user || null;
                    }

                    if (currentUser) {
                        console.log('--- [CLIENT] 💾 Sauvegarde dans Supabase pour user:', currentUser.id);
                        const { data, error } = await supabase.from('simulations').insert({
                            user_id: currentUser.id,
                            product_id: result.product_id || null,
                            transcript: result.transcript,
                            score: result.score,
                            feedback: result.feedback,
                            duration_seconds: result.duration_seconds,
                            strengths: result.strengths || [],
                            improvements: result.improvements || [],
                        }).select().single();

                        if (error) {
                            console.error('--- [CLIENT] ❌ Erreur sauvegarde Supabase:', error);
                            alert("Erreur lors de la sauvegarde du résultat : " + error.message);
                        }

                        if (data) {
                            console.log('--- [CLIENT] ✅ Sauvegarde réussie, redirection vers:', `/results/${data.id}`);
                            router.push(`/results/${data.id}`);
                        }
                    } else {
                        console.warn('--- [CLIENT] ⚠️ Pas d\'utilisateur connecté (même après vérification session), impossible de sauvegarder');
                        // Option de secours: Rediriger vers l'historique si on ne peut pas sauvegarder ici
                        alert("Simulation terminée mais session introuvable. Veuillez consulter votre historique.");
                    }
                });

                socket.on('disconnect', () => {
                    setIsSocketReady(false);
                    setStatus('idle');
                });

                socketRef.current = socket;
            } catch (err) {
                console.error('--- [CLIENT] ❌ Erreur:', err);
            }
        };

        initSocket();

        return () => {
            socketRef.current?.disconnect();
        };
    }, [user, router]);

    // Timer
    useEffect(() => {
        if (status !== 'idle' && status !== 'calling') {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            if (status === 'idle') setDuration(0);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [status]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const playAudio = async (audioData: any) => {
        try {
            setStatus('speaking');
            setCurrentTranscript('');

            let audioBlob: Blob;
            if (audioData.type === 'Buffer' && Array.isArray(audioData.data)) {
                audioBlob = new Blob([new Uint8Array(audioData.data)], { type: 'audio/mpeg' });
            } else if (audioData instanceof ArrayBuffer) {
                audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
            } else {
                audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                setStatus('listening');
            };

            audio.onerror = (e) => {
                setStatus('listening');
            };

            await audio.play();

        } catch (error) {
            setStatus('listening');
        }
    };

    const startSimulation = async () => {
        if (!socketRef.current || !isSocketReady || !selectedProduct) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && socketRef.current) {
                    const buffer = await event.data.arrayBuffer();
                    socketRef.current.emit('audio_chunk', buffer);
                }
            };

            mediaRecorder.start(250);
            setStatus('calling');

            const product = products.find(p => p.id === selectedProduct);
            socketRef.current.emit('start_simulation', {
                productId: selectedProduct,
                productContext: product?.description || product?.name || '',
                objections: product?.objections || [],
                userId: user?.id || '',
            });

        } catch (err) {
            alert("Impossible d'accéder au microphone. Vérifiez les permissions.");
        }
    };

    const stopSimulation = () => {
        if (socketRef.current) {
            socketRef.current.emit('end_simulation');
        }

        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
        setStatus('idle');
        setCurrentTranscript('');
    };

    const selectedProductData = products.find(p => p.id === selectedProduct);

    return (
        <div className="fluent-container" style={{ maxWidth: '1000px' }}>
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="mb-2">Simulation de Vente</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Conversation naturelle avec un prospect IA intelligent
                    </p>
                </div>
                {status !== 'idle' && (
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="font-mono text-xl font-bold">{formatDuration(duration)}</span>
                    </div>
                )}
            </div>

            {status === 'idle' ? (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="fluent-card">
                        <div className="flex items-center gap-2 mb-6">
                            <Trophy className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
                            <h3>Choisissez votre scénario</h3>
                        </div>

                        {loadingProducts ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
                                Aucun produit disponible.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {products.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProduct(p.id)}
                                        className="text-left p-4 rounded-lg border transition-all relative overflow-hidden group"
                                        style={{
                                            backgroundColor: selectedProduct === p.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                                            borderColor: selectedProduct === p.id ? 'var(--color-primary)' : 'var(--color-gray-30)',
                                            borderWidth: '2px'
                                        }}
                                    >
                                        <div className="font-bold mb-1" style={{ color: selectedProduct === p.id ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                                            {p.name}
                                        </div>
                                        <p className="text-xs line-clamp-1 mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                                            {p.description}
                                        </p>
                                        <span className="fluent-badge" style={{ backgroundColor: 'var(--color-gray-20)', fontSize: '0.65rem' }}>
                                            DIFFICULTÉ {p.difficulty || 3}/5
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={startSimulation}
                            disabled={!selectedProduct || !isSocketReady || loadingProducts}
                            className="btn-primary w-full py-4 text-lg"
                        >
                            {!isSocketReady ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Initialisation...
                                </>
                            ) : (
                                <>
                                    <Phone className="w-6 h-6" />
                                    Démarrer l'appel
                                </>
                            )}
                        </button>
                    </div>

                    {/* Pro Tip */}
                    <div
                        className="p-6 rounded-lg flex gap-4"
                        style={{ backgroundColor: 'var(--color-success-light)', border: '1px solid var(--color-success)20' }}
                    >
                        <Info className="w-6 h-6 shrink-0" style={{ color: 'var(--color-success)' }} />
                        <div>
                            <h4 style={{ color: 'var(--color-success)' }}>Conseil pour réussir</h4>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                Présentez-vous clairement, posez des questions ouvertes pour découvrir les besoins du prospect et gérez calmement les objections avant de conclure.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in zoom-in-95 duration-300">
                    <div
                        className="fluent-card-elevated overflow-hidden relative"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-gray-10) 100%)',
                            padding: '64px 32px'
                        }}
                    >
                        {/* Status Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

                            {/* Prospect */}
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div
                                        className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${status === 'speaking' ? 'animate-pulse-success shadow-2xl scale-110' : 'opacity-40 grayscale'}`}
                                        style={{ backgroundColor: 'var(--color-success)' }}
                                    >
                                        <UserIcon className="w-16 h-16 text-white" />
                                    </div>
                                    {status === 'speaking' && (
                                        <div
                                            className="absolute -top-3 -right-3 px-3 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-lg animate-bounce"
                                            style={{ backgroundColor: 'var(--color-success)' }}
                                        >
                                            En ligne
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <h3 className="mb-1" style={{ color: status === 'speaking' ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>Prospect</h3>
                                    <p className="text-sm font-bold uppercase tracking-widest">
                                        {status === 'speaking' ? '🔊 Parle...' : '👂 Écoute'}
                                    </p>
                                </div>
                            </div>

                            {/* User */}
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div
                                        className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${status === 'listening' ? 'animate-pulse-primary shadow-2xl scale-110' : 'opacity-40 grayscale'}`}
                                        style={{ backgroundColor: 'var(--color-primary)' }}
                                    >
                                        <Mic className="w-16 h-16 text-white" />
                                    </div>
                                    {status === 'listening' && (
                                        <div
                                            className="absolute -top-3 -left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-lg animate-bounce"
                                            style={{ backgroundColor: 'var(--color-primary)' }}
                                        >
                                            Micro Actif
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <h3 className="mb-1" style={{ color: status === 'listening' ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>Vous</h3>
                                    <p className="text-sm font-bold uppercase tracking-widest">
                                        {status === 'listening' ? '🎤 À vous de parler' : '👂 Écoutez'}
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Transcript Bubble */}
                        {(currentTranscript || status === 'speaking') && (
                            <div className="mt-12 flex justify-center animate-in slide-in-from-bottom-4 duration-300">
                                <div
                                    className="p-5 rounded-2xl max-w-lg shadow-lg relative"
                                    style={{
                                        backgroundColor: status === 'speaking' ? 'var(--color-success-light)' : 'var(--color-primary-light)',
                                        border: `1px solid ${status === 'speaking' ? 'var(--color-success)' : 'var(--color-primary)'}20`
                                    }}
                                >
                                    <p
                                        className="text-lg italic font-medium text-center"
                                        style={{ color: status === 'speaking' ? 'var(--color-success)' : 'var(--color-primary)' }}
                                    >
                                        {status === 'speaking' ? "Saisie des besoins en cours..." : `"${currentTranscript}"`}
                                    </p>
                                    <div
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-white text-[10px] font-bold uppercase tracking-wider shadow-sm"
                                        style={{ color: status === 'speaking' ? 'var(--color-success)' : 'var(--color-primary)' }}
                                    >
                                        {status === 'speaking' ? 'Analyse du flux' : 'Transcription Directe'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 p-4">
                            <span className="fluent-badge bg-white shadow-sm font-mono">{formatDuration(duration)}</span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={stopSimulation}
                            className="btn-danger py-4 px-12 text-lg rounded-full shadow-xl hover:scale-105 transition-transform"
                            style={{ backgroundColor: 'var(--color-error)' }}
                        >
                            <PhoneOff className="w-6 h-6" />
                            Raccrocher et terminer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}