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
 * Convertit du texte en audio (Buffer) en utilisant les voix Studio de haute qualité.
 */
export async function synthesizeSpeech(text: string, voiceName: string = 'fr-FR-Wavenet-D') {
    try {
        const request = {
            input: { text },
            voice: { languageCode: 'fr-FR', name: voiceName },
            audioConfig: {
                audioEncoding: 'MP3' as const,
                sampleRateHertz: 24000,
                speakingRate: 1.0,
                pitch: 0.0
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
