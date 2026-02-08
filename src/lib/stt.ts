import { speechClient } from './google-ai';
import { Socket } from 'socket.io';

export class SpeechToTextManager {
    private recognizeStream: any = null;
    private socket: Socket;
    private isFirstChunk = true;
    private silenceTimer: NodeJS.Timeout | null = null;
    private lastTranscript: string = "";
    private isFinalized = false;
    private hasSpoken = false;
    private onFinal: (text: string) => void;

    constructor(socket: any, onFinal: (text: string) => void) {
        this.socket = socket;
        this.onFinal = onFinal;
    }

    startRecognition() {
        console.log('--- [STT] 🎤 Initialisation reconnaissance vocale');
        this.isFirstChunk = true;
        this.isFinalized = false;
        this.lastTranscript = "";
        this.hasSpoken = false;

        const request = {
            config: {
                encoding: 'WEBM_OPUS' as const,
                sampleRateHertz: 16000,
                languageCode: 'fr-FR',
                model: 'latest_long',
                enableAutomaticPunctuation: true,
                useEnhanced: true,
                speechContexts: [{
                    phrases: [
                        'forfait', 'mobile', 'fibre', 'internet', 'téléphone',
                        'prix', 'tarif', 'engagement', 'résiliation', 'offre',
                        'allô', 'bonjour', 'merci', 'intéressant', 'réfléchir'
                    ],
                }],
            },
            interimResults: true,
        };

        try {
            this.recognizeStream = speechClient
                .streamingRecognize(request)
                .on('error', (error: any) => {
                    if (error.code === 11) {
                        console.log('--- [STT] ⏱️ Timeout (normal si pas de parole)');
                    } else {
                        console.error('--- [STT] ❌ Erreur STT:', error.message);
                    }
                    this.stop();
                })
                .on('data', (data: any) => {
                    const result = data.results[0];
                    if (result && result.alternatives[0]) {
                        const transcript = result.alternatives[0].transcript.trim();

                        if (transcript.length < 2) return;

                        if (!this.hasSpoken && transcript.length >= 2) {
                            this.hasSpoken = true;
                            console.log('--- [STT] 🗣️ Parole détectée');
                        }

                        if (result.isFinal) {
                            this.finalize(transcript);
                        } else {
                            process.stdout.write(`--- [STT] 👂 ${transcript}\r`);
                            this.socket.emit('transcript_interim', { text: transcript });

                            if (transcript !== this.lastTranscript && this.hasSpoken) {
                                if (this.silenceTimer) clearTimeout(this.silenceTimer);
                                this.lastTranscript = transcript;

                                const wordCount = transcript.split(' ').length;
                                const silenceDelay = wordCount >= 5 ? 800 : 1200;

                                this.silenceTimer = setTimeout(() => {
                                    if (this.lastTranscript.trim().length >= 3) {
                                        console.log('\n--- [STT] 🔇 Silence détecté → Finalisation');
                                        this.finalize(this.lastTranscript);
                                    }
                                }, silenceDelay);
                            }
                        }
                    }
                })
                .on('end', () => {
                    console.log('--- [STT] 📴 Stream terminé');
                });

        } catch (e) {
            console.error('--- [STT] ❌ Erreur fatale init:', e);
        }
    }

    resume() {
        console.log('--- [STT] 🔄 Reprise de l\'écoute');
        this.isFinalized = false;
        this.lastTranscript = "";
        this.hasSpoken = false;
    }

    private finalize(transcript: string) {
        if (this.isFinalized) return;
        this.isFinalized = true;

        if (this.silenceTimer) clearTimeout(this.silenceTimer);

        console.log('--- [STT] ✅ Message finalisé:', transcript);
        this.socket.emit('transcript_final', { text: transcript });

        // Appel DIRECT de la fonction de traitement
        this.onFinal(transcript);
    }

    write(audioChunk: Buffer) {
        if (!this.recognizeStream || !this.recognizeStream.writable || this.isFinalized) {
            return;
        }

        try {
            this.recognizeStream.write(audioChunk);
            if (this.isFirstChunk) {
                console.log('--- [STT] 📡 Premier chunk envoyé');
                this.isFirstChunk = false;
            }
        } catch (error) {
            console.error('--- [STT] ❌ Erreur write stream:', error);
        }
    }

    stop() {
        this.isFinalized = true;
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        if (this.recognizeStream) {
            console.log('--- [STT] 🛑 Arrêt du stream');
            try {
                this.recognizeStream.end();
                this.recognizeStream.removeAllListeners();
            } catch (e) { }
            this.recognizeStream = null;
        }
    }
}