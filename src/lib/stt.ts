import { groq } from './gemini';
import { toFile } from 'groq-sdk';

export class SpeechToTextManager {
    private onFinal: (text: string) => void;

    constructor(onFinal: (text: string) => void) {
        this.onFinal = onFinal;
    }

    async recognizeBuffer(buffer: Buffer): Promise<string> {
        try {
            console.log('--- [STT] 📡 Envoi reconnaissance buffer à Groq Whisper...');

            // On construit manuellement l'objet File pour éviter les soucis de compatibilité fs/path sur Vercel Edge/Node
            const transcription = await groq.audio.transcriptions.create({
                file: await (async () => {
                    const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/webm' });
                    return new File([blob], "input.webm", { type: "audio/webm" });
                })(),
                model: "whisper-large-v3-turbo",
                language: "fr",
                response_format: "json",
            });

            const text = transcription.text || "";
            if (text) {
                console.log('--- [STT] ✅ Transcription reçue (Whisper):', text);
            }
            return text;
        } catch (error) {
            console.error('--- [STT] ❌ Erreur recognizeBuffer (Whisper):', error);
            return "";
        }
    }

    stop() { }
}
