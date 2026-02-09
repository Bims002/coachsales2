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

            // Optimisation: Création directe du Fichier pour Groq (compatible Edge/Node)
            const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/webm' });
            const audioFile = new File([blob], "input.webm", { type: "audio/webm" });

            const transcription = await groq.audio.transcriptions.create({
                file: audioFile,
                model: "whisper-large-v3-turbo",
                language: "fr",
                response_format: "json",
            });

            let text = transcription.text || "";

            // Nettoyage des hallucinations fréquentes de Whisper
            const hallucinations = [
                "Sous-titres réalisés par",
                "Sous-titres par",
                "Amara.org",
                "MBC",
                "L'équipe de",
                "pour les malentendants"
            ];

            if (hallucinations.some(h => text.includes(h)) || text.length < 2) {
                console.log('--- [STT] 🗑️ Hallucination ou silence ignoré:', text);
                return "";
            }

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
