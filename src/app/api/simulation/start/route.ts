import { NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/google-ai';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { productId, productContext, userId } = body;
        const channelId = `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Message d'accueil initial (Cache RAM pour éviter la latence TTS au démarrage)
        const greeting = "Oui allô ?";
        let audioContent: Buffer;

        if ((global as any).cachedGreetingAudio) {
            console.log('--- [CACHE] ⚡ Utilisation du message d\'accueil en cache');
            audioContent = (global as any).cachedGreetingAudio;
        } else {
            console.log('--- [TTS] 🔊 Génération du message d\'accueil (premier appel)');
            audioContent = await synthesizeSpeech(greeting);
            (global as any).cachedGreetingAudio = audioContent;
        }

        // On ne trigger PAS Pusher ici car le client n'est pas encore abonné.
        // on renvoie les infos en direct pour que le client commence.

        // 🔥 WARM-UP GROQ: On lance une requête simple en background pour "chauffer" la connexion TLS/TCP
        // Cela réduit la latence du premier "vrai" tour de parole
        import('@/lib/gemini').then(({ groq }) => {
            groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: "ping" }],
                max_tokens: 1
            }).catch(err => console.error("Warmup error (non-blocking):", err));
        });

        return NextResponse.json({
            success: true,
            channelId,
            greeting,
            audio: audioContent.toString('base64')
        });

    } catch (error: any) {
        console.error('--- [API] ❌ Erreur start simulation:', error, (error as any).stack);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
