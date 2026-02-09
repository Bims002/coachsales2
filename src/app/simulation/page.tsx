"use client";

import { useState, useEffect, useRef } from 'react';
import { Mic, Phone, PhoneOff, User as UserIcon, Loader2, ArrowLeft, Trophy, Info } from "lucide-react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/context/AuthContext';

interface Product {
    id: string;
    name: string;
    description: string;
    difficulty: number;
    objections?: string[];
    resistance?: string;
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

    const [channelId, setChannelId] = useState<string | null>(null);
    const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
    const historyRef = useRef(conversationHistory);

    // Synchroniser le ref avec le state
    useEffect(() => {
        historyRef.current = conversationHistory;
    }, [conversationHistory]);
    const pusherRef = useRef<any>(null);
    const channelRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
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

    // Initialisation Pusher
    useEffect(() => {
        import('pusher-js').then(({ default: Pusher }) => {
            pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            });
            setIsSocketReady(true);
        });

        return () => {
            if (channelRef.current) {
                channelRef.current.unbind_all();
                pusherRef.current?.unsubscribe(channelId);
            }
        };
    }, []);

    // Gérer les événements Pusher une fois le channelId connu
    useEffect(() => {
        if (!channelId || !pusherRef.current) return;

        const channel = pusherRef.current.subscribe(channelId);
        channelRef.current = channel;

        channel.bind('avatar-response', (data: any) => {
            console.log('--- [PUSHER] 📥 Réponse reçue:', data.transcript);
            if (data.audio) {
                setConversationHistory(prev => [...prev, { role: 'assistant', content: data.transcript }]);
                playAudio(data.audio);
            }
        });

        channel.bind('prospect_hangup', () => {
            console.log('--- [PUSHER] 📞 Le prospect a raccroché !');
            stopSimulation();
        });

        return () => {
            channel.unbind_all();
            pusherRef.current?.unsubscribe(channelId);
        };
    }, [channelId]);

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

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const playAudio = async (audioData: any) => {
        try {
            // Arrêter l'audio précédent s'il existe (Barge-in / Interruptibilité)
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            setStatus('speaking');
            setCurrentTranscript('');

            let audioBlob: Blob;
            if (typeof audioData === 'string') {
                const binaryString = window.atob(audioData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
            } else {
                audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                setStatus('listening');
                audioRef.current = null;
            };

            audio.onerror = (e) => {
                setStatus('listening');
                audioRef.current = null;
            };

            await audio.play();

        } catch (error) {
            console.error('--- [CLIENT] ❌ Erreur lecture audio:', error);
            setStatus('listening');
        }
    };

    const startSimulation = async () => {
        if (!pusherRef.current || !selectedProduct) return;

        try {
            setStatus('calling');
            setDuration(0);
            setConversationHistory([]);

            // 1. Initialiser la simulation via API
            const product = products.find(p => p.id === selectedProduct);
            const startRes = await fetch('/api/simulation/start', {
                method: 'POST',
                body: JSON.stringify({
                    productId: selectedProduct,
                    productContext: product?.description || '',
                    userId: user?.id
                })
            });
            const data = await startRes.json();
            if (!data.success) throw new Error(data.error || 'Erreur API');

            const newChannelId = data.channelId;
            setChannelId(newChannelId);

            // Jouer l'accueil reçu en JSON
            if (data.audio) {
                console.log('--- [CLIENT] 🔊 Lecture de l\'accueil...');
                setConversationHistory([{ role: 'assistant', content: data.greeting }]);
                playAudio(data.audio);
            }

            // 🔥 WARM-UP CLIENT: Réveiller la route audio (serverless)
            const warmupData = new FormData();
            warmupData.append('warmup', 'true');
            fetch('/api/simulation/audio', { method: 'POST', body: warmupData }).catch(e => console.error("Warmup audio failed", e));

            // 2. Démarrer le micro
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // --- Logique VAD (Voice Activity Detection) ---
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            let silenceStart = Date.now();
            let speechStart = Date.now();
            let isSpeaking = false;
            let silenceThreshold = 450;
            let volumeThreshold = 20;    // Sensibilité augmentée (était 35) pour mieux capter les micros faibles
            let maxSegmentDuration = 20000;

            const checkVAD = () => {
                if (mediaRecorder.state !== 'recording' || isProcessing) {
                    requestAnimationFrame(checkVAD);
                    return;
                }

                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                let average = sum / bufferLength;

                const now = Date.now();

                if (average > volumeThreshold) {
                    if (!isSpeaking) {
                        isSpeaking = true;
                        speechStart = now;
                        // Si l'utilisateur commence à parler, on coupe l'avatar s'il parlait (Barge-in)
                        if (audioRef.current) {
                            console.log('--- [VAD] ⚡ Interruption de l\'avatar détectée');
                            audioRef.current.pause();
                            audioRef.current.currentTime = 0;
                            setStatus('listening');
                        }
                    }
                    silenceStart = now;
                } else {
                    // Si on détecte un silence de 1s OU si on parle depuis plus de 20s
                    const isSilenceLongEnough = isSpeaking && (now - silenceStart > silenceThreshold);
                    const isSegmentTooLong = isSpeaking && (now - speechStart > maxSegmentDuration);

                    if (isSilenceLongEnough || isSegmentTooLong) {
                        console.log(`--- [VAD] 😶 ${isSegmentTooLong ? 'Temps max atteint' : 'Silence détecté'}, envoi audio...`);
                        isSpeaking = false;
                        mediaRecorder.stop();
                        mediaRecorder.start();
                    }
                }
                requestAnimationFrame(checkVAD);
            };

            let isProcessing = false;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 1000 && newChannelId && !isProcessing) {
                    isProcessing = true;
                    console.log(`--- [CLIENT] 🎤 Envoi segment audio: ${event.data.size} bytes`);

                    const formData = new FormData();
                    formData.append('audio', event.data);
                    formData.append('channelId', newChannelId);
                    formData.append('history', JSON.stringify(historyRef.current));
                    formData.append('productContext', product?.description || '');
                    formData.append('turnCount', historyRef.current.length.toString());
                    formData.append('objections', JSON.stringify(product?.objections || []));
                    formData.append('resistance', product?.resistance || 'Moyen');

                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout 15s

                        const res = await fetch('/api/simulation/audio', {
                            method: 'POST',
                            body: formData,
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);

                        if (!res.ok) {
                            throw new Error(`Erreur serveur: ${res.status}`);
                        }

                        const resData = await res.json();

                        if (resData.success && resData.transcript && resData.audio) {
                            console.log('--- [CLIENT] 🤖 Réponse IA reçue en JSON:', resData.transcript, 'HangUp:', resData.hangUp);

                            // Mettre à jour l'historique
                            const updatedHistory = [
                                ...historyRef.current,
                                { role: 'user', content: resData.userTranscript },
                                { role: 'assistant', content: resData.transcript }
                            ];
                            setConversationHistory(updatedHistory);

                            // Jouer l'audio
                            await playAudio(resData.audio);

                            // Si l'IA décide de raccrocher
                            if (resData.hangUp) {
                                console.log('--- [CLIENT] 👋 L\'avatar a décidé de raccrocher');
                                setTimeout(() => {
                                    stopSimulation();
                                }, 1000); // Petit délai pour laisser l'audio finir
                            }
                        } else if (resData.message === 'No speech detected') {
                            console.log('--- [CLIENT] 💨 Aucun silence détecté dans ce segment');
                        }
                    } catch (err: any) {
                        if (err.name === 'AbortError') {
                            console.error('--- [CLIENT] ⏱️ Timeout requête audio (15s)');
                        } else {
                            console.error('--- [CLIENT] ❌ Erreur segment audio:', err);
                        }
                        // Pas d'alerte bloquante pour ne pas casser le flow, mais on log
                    } finally {
                        isProcessing = false;
                    }
                }
            };

            mediaRecorder.start();
            checkVAD();

            return () => {
                audioContext.close();
            };

        } catch (err) {
            console.error('--- [CLIENT] ❌ Erreur start:', err);
            alert("Erreur lors du démarrage : " + (err as any).message);
            setStatus('idle');
        }
    };

    const stopSimulation = async () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }

        setStatus('speaking'); // On utilise un état visuel pendant le calcul
        setCurrentTranscript('Analyse de votre performance en cours...');

        try {
            console.log('--- [CLIENT] 📊 Fin de simulation, calcul du score...');
            const res = await fetch('/api/simulation/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: historyRef.current,
                    productId: selectedProduct,
                    userId: user?.id
                })
            });

            const data = await res.json();
            if (data.success) {
                console.log('--- [CLIENT] ✅ Score calculé, redirection vers:', `/results/${data.simulationId}`);
                window.location.href = `/results/${data.simulationId}`;
            } else {
                throw new Error(data.error || 'Erreur lors du scoring');
            }
        } catch (error) {
            console.error('--- [CLIENT] ❌ Erreur fin simulation:', error);
            alert("Erreur lors de l'analyse : " + (error as any).message);
            setStatus('idle');
        }
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