import { synthesizeSpeech } from './google-ai';
import { generateProspectResponse } from './gemini';
import { SpeechToTextManager } from './stt';
import { calculateScore, ScoringResult } from './scoring';

interface SimulationConfig {
    productId: string;
    productContext: string;
    objections?: string[];
    userId?: string;
}

export class SimulationManager {
    private socket: any;
    private conversationHistory: Array<{ role: string; content: string }> = [];
    private productContext: string = "";
    private productId: string = "";
    private userId: string = "";
    private objections: string[] = [];
    private sttManager: SpeechToTextManager | null = null;
    private isAvatarSpeaking = false;
    private isProcessing = false;
    private audioBuffer: Buffer[] = [];
    private sttStarted = false;
    private turnCount = 0;
    private startTime: number = 0;

    constructor(socket: any) {
        this.socket = socket;
        console.log('--- [MANAGER] 🆕 Instance créée');
    }

    async startSimulation(config: SimulationConfig) {
        console.log('--- [MANAGER] 🚀 Démarrage simulation:', config.productContext);
        this.productContext = config.productContext || '';
        this.productId = config.productId || '';
        this.userId = config.userId || '';
        this.objections = config.objections || [];
        this.conversationHistory = [];
        this.isAvatarSpeaking = false;
        this.isProcessing = false;
        this.audioBuffer = [];
        this.sttStarted = false;
        this.turnCount = 0;
        this.startTime = Date.now();

        const greeting = "Oui allô ? Je vous écoute.";
        await this.processModelResponse(greeting);
    }

    public handleAudioChunk(chunk: Buffer) {
        if (this.isAvatarSpeaking || this.isProcessing) {
            this.audioBuffer.push(chunk);
            if (this.audioBuffer.length > 50) this.audioBuffer.shift();
            return;
        }

        if (!this.sttManager || !this.sttStarted) {
            console.log('--- [MANAGER] 🎤 Ouverture du micro (STT)');

            this.sttManager = new SpeechToTextManager(this.socket, (text) => {
                console.log(`--- [MANAGER] ⚡ Callback direct reçu: "${text}"`);
                this.handleFinalTranscript(text);
            });

            this.sttManager.startRecognition();
            this.sttStarted = true;

            if (this.audioBuffer.length > 0) {
                console.log(`--- [MANAGER] 📦 Injection du buffer (${this.audioBuffer.length} chunks)`);
                this.audioBuffer.forEach(buf => this.sttManager?.write(buf));
                this.audioBuffer = [];
            }
        }

        this.sttManager.write(chunk);
    }

    private async handleFinalTranscript(text: string) {
        console.log(`--- [MANAGER] 📂 Début du traitement IA | isProcessing: ${this.isProcessing}`);

        if (this.isProcessing) {
            console.warn('--- [MANAGER] ⚠️ Rejet: déjà en cours de traitement');
            return;
        }

        this.isProcessing = true;
        this.turnCount++;

        this.conversationHistory.push({ role: 'user', content: text });

        try {
            console.log('--- [MANAGER] 🤖 Consultation de Groq...');
            const aiResponse = await this.generateNaturalResponse();
            console.log(`--- [MANAGER] 🤖 Groq a répondu: "${aiResponse}"`);
            await this.processModelResponse(aiResponse);
        } catch (err) {
            console.error('--- [MANAGER] ❌ Erreur critique IA:', err);
            this.isProcessing = false;
            this.isAvatarSpeaking = false;
        }
    }

    private async generateNaturalResponse(): Promise<string> {
        // Varier la personnalité selon le tour
        const personalities = [
            'Tu es légèrement sceptique mais poli.',
            'Tu es occupé et pressé de raccrocher.',
            'Tu es curieux et poses des questions.',
            'Tu compares avec ce que tu as déjà.',
            'Tu cherches à savoir le prix.',
        ];
        const personality = personalities[this.turnCount % personalities.length];

        // Sélectionner une objection aléatoire si disponible
        let objectionInstruction = '';
        if (this.objections.length > 0 && this.turnCount >= 2 && this.turnCount <= 3) {
            const randomObjection = this.objections[Math.floor(Math.random() * this.objections.length)];
            objectionInstruction = `\n\n🚫 OBJECTION À UTILISER CE TOUR (reformule-la naturellement):\n"${randomObjection}"`;
        }

        let contextPrompt = `Tu es un particulier lambda qui reçoit un appel commercial sur son téléphone. Tu n'attendais pas cet appel.

🎭 TON ÉTAT D'ESPRIT CE TOUR: ${personality}

📞 CE QU'ON ESSAIE DE TE VENDRE: ${this.productContext}${objectionInstruction}

⚠️ RÈGLES STRICTES:
1. Tu es le CLIENT qui reçoit l'appel, PAS le vendeur.
2. Réponds en UNE SEULE phrase courte (max 15 mots).
3. Utilise un langage ORAL naturel : "Euh...", "Hmm...", "Ah bon ?", "Ouais", "Ok", "D'accord", etc.
4. Sois réaliste : tu peux être méfiant, curieux, ou agacé comme un vrai prospect.
5. Ne répète JAMAIS les mêmes réponses.
6. Tour actuel: ${this.turnCount} (si > 7, commence à vouloir raccrocher ou conclure)

❌ NE DIS JAMAIS:
- "Je vous propose..."
- "Notre offre..."
- "Laissez-moi vous expliquer..."
(Ce sont des phrases de VENDEUR)

✅ EXEMPLES DE BONNES RÉPONSES:
- "Hmm, c'est combien ça ?"
- "Ouais mais j'ai déjà quelque chose..."
- "Ah ok. Et y'a un engagement ?"
- "Écoutez, là je suis occupé..."
- "C'est quoi votre offre exactement ?"

Réponds UNIQUEMENT comme un client lambda répondrait à ce que le vendeur vient de dire.`;

        return await generateProspectResponse(this.conversationHistory, contextPrompt);
    }

    private async processModelResponse(text: string) {
        this.isAvatarSpeaking = true;
        this.conversationHistory.push({ role: 'assistant', content: text });

        try {
            console.log('--- [MANAGER] 🔊 Synthèse vocale en cours...');
            const audioBuffer = await synthesizeSpeech(text);
            this.socket.emit('audio_chunk', audioBuffer);

            const durationMs = (audioBuffer.length / 48000) * 1000;
            const lockTime = Math.max(1500, durationMs + 800);

            console.log(`--- [MANAGER] ⏱️ Micro verrouillé pour ${lockTime.toFixed(0)}ms`);

            setTimeout(() => {
                this.isAvatarSpeaking = false;
                this.isProcessing = false;
                console.log('--- [MANAGER] ✅ Micro déverrouillé, prêt pour le tour suivant');
                if (this.sttManager) {
                    this.sttManager.resume();
                }
            }, lockTime);

        } catch (e) {
            console.error('--- [MANAGER] ❌ Erreur TTS:', e);
            this.isAvatarSpeaking = false;
            this.isProcessing = false;
        }
    }

    public async endSimulationAndScore(): Promise<ScoringResult | null> {
        console.log('--- [MANAGER] 📊 Calcul du score de la simulation...');

        if (this.conversationHistory.length < 2) {
            console.log('--- [MANAGER] ⚠️ Conversation trop courte pour le scoring');
            return null;
        }

        try {
            const result = await calculateScore(this.conversationHistory, this.productContext);
            const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

            // Préparer les données pour la sauvegarde
            const simulationData = {
                user_id: this.userId || null,
                product_id: this.productId || null,
                transcript: this.conversationHistory,
                score: result.score,
                feedback: result.feedback,
                duration_seconds: durationSeconds,
            };

            // Envoyer au client pour qu'il sauvegarde (car on n'a pas accès à Supabase côté serveur avec les cookies)
            this.socket.emit('simulation_complete', {
                ...simulationData,
                strengths: result.strengths,
                improvements: result.improvements,
            });

            console.log('--- [MANAGER] 📤 Événement simulation_complete envoyé au client');
            console.log('--- [MANAGER] ✅ Score calculé:', result.score);
            return result;
        } catch (e) {
            console.error('--- [MANAGER] ❌ Erreur scoring:', e);
            return null;
        }
    }

    public cleanup() {
        console.log('--- [MANAGER] 🧹 Cleanup final');
        if (this.sttManager) {
            this.sttManager.stop();
            this.sttManager = null;
        }
        this.isProcessing = false;
        this.isAvatarSpeaking = false;
        this.audioBuffer = [];
        this.sttStarted = false;
    }
}