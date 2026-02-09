import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { SpeechToTextManager } from '@/lib/stt';
import { SimulationManager } from '@/lib/SimulationManager';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioBlob = formData.get('audio') as Blob;
        const channelId = formData.get('channelId') as string;
        const history = JSON.parse(formData.get('history') as string || '[]');
        const productContext = formData.get('productContext') as string || '';
        const turnCount = parseInt(formData.get('turnCount') as string || '0');
        const objections = JSON.parse(formData.get('objections') as string || '[]');
        const resistance = formData.get('resistance') as string || 'Moyen';

        if (!audioBlob || !channelId) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        // 1. Convertir Blob en Buffer pour Google STT
        const buffer = Buffer.from(await audioBlob.arrayBuffer());
        console.log(`--- [API] 🎤 Audio reçu: ${buffer.length} bytes, turn: ${turnCount}`);

        // 2. STT
        const stt = new SpeechToTextManager(() => { });
        const transcript = await stt.recognizeBuffer(buffer);
        console.log('--- [API] 📝 Transcription:', transcript);

        if (!transcript || transcript.trim().length < 2) {
            console.log('--- [API] ⚠️ Transcription trop courte ou vide');
            return NextResponse.json({ success: true, message: 'No speech detected' });
        }

        // 3. IA via SimulationManager
        const updatedHistory = [...history, { role: 'user', content: transcript }];
        const simulationResult = await SimulationManager.generateResponse({
            history: updatedHistory,
            productContext,
            turnCount,
            objections,
            resistance
        });
        console.log('--- [API] 🤖 Réponse IA:', simulationResult.text, 'HangUp:', simulationResult.hangUp);

        // 4. TTS
        // On utilise le SSML s'il est disponible pour une meilleure intonation, sinon le texte brut
        const audioResponse = await SimulationManager.getAudio(simulationResult.ssml || simulationResult.text);
        console.log('--- [API] 🔊 Audio généré:', audioResponse.length, 'bytes');

        // 5. Pusher (Optionnel maintenant, on préfère le JSON direct pour éviter les limites de taille)
        /* 
        await pusherServer.trigger(channelId, 'avatar-response', {
            transcript: aiResponse,
            audio: audioResponse.toString('base64'),
            userTranscript: transcript
        });
        */

        return NextResponse.json({
            success: true,
            transcript: simulationResult.text,
            audio: audioResponse.toString('base64'),
            userTranscript: transcript,
            hangUp: simulationResult.hangUp
        });

    } catch (error: any) {
        console.error('--- [API] ❌ Erreur simulation:', error, error.stack);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
