import { SpeechClient } from '@google-cloud/speech';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

let credentials;
try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        console.log('Google Cloud credentials chargés avec succès.');
    }
} catch (error) {
    console.error('Erreur lors du parsing de GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
}

export const speechClient = new SpeechClient({ credentials });
export const ttsClient = new TextToSpeechClient({ credentials });

/**
 * Convertit du texte en audio (Buffer) en utilisant les voix Neural2 de haute qualité.
 * Voix disponibles pour fr-FR:
 * - fr-FR-Neural2-A (femme)
 * - fr-FR-Neural2-B (homme)
 * - fr-FR-Neural2-C (femme)
 * - fr-FR-Neural2-D (homme)
 * - fr-FR-Neural2-E (femme)
 */
export async function synthesizeSpeech(text: string, voiceName: string = 'fr-FR-Neural2-B') {
    try {
        const request = {
            input: { text },
            voice: {
                languageCode: 'fr-FR',
                name: voiceName,
            },
            audioConfig: {
                audioEncoding: 'MP3' as const,
                sampleRateHertz: 24000,
                speakingRate: 0.95,  // Légèrement plus lent pour une meilleure compréhension
                pitch: -1.5,         // Voix légèrement plus grave, plus réaliste
                volumeGainDb: 2.0,   // Un peu plus de volume
            },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        const audioBuffer = Buffer.from(response.audioContent as Uint8Array);
        console.log('--- [TTS] Audio généré, taille:', audioBuffer.length, 'bytes');
        return audioBuffer;
    } catch (error) {
        console.error('Erreur synthèse vocale TTS:', error);
        throw error;
    }
}
