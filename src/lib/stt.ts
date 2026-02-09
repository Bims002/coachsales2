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

            // Groq Whisper attend un objet File-like. On utilise un stream pour simuler le fichier.
            // On lui donne un nom de fichier fictif avec .webm car c'est le format envoyé par le client
            const transcription = await groq.audio.transcriptions.create({
                file: await toFile(buffer, 'input.webm'),
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
