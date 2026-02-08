import { Server } from 'socket.io';
import { SimulationManager } from '@/lib/SimulationManager';

export const config = {
    api: {
        bodyParser: false,
    },
};

const SocketHandler = (req: any, res: any) => {
    if (res.socket.server.io) {
        console.log('--- [SERVER] Socket déjà initialisé ---');
        res.end();
        return;
    }

    console.log('--- [SERVER] Initialisation du serveur Socket.IO... ---');

    const io = new Server(res.socket.server, {
        path: '/api/simulation-socket',
        addTrailingSlash: false,
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('--- [SOCKET] Client connecté:', socket.id);
        const manager = new SimulationManager(socket);

        const startSim = async (config: any) => {
            console.log('--- [SOCKET] 🚀 start_simulation reçu ! Data:', config);
            try {
                socket.emit('simulation_started', { status: 'ok' });
                await manager.startSimulation({
                    productId: config.productId || '',
                    productContext: config.productContext || '',
                    objections: config.objections || [],
                    userId: config.userId || '',
                });
                console.log('--- [SOCKET] Simulation lancée avec succès');
            } catch (err) {
                console.error('--- [SOCKET] ❌ Erreur start_simulation:', err);
                socket.emit('error', { message: 'Erreur au démarrage' });
            }
        };

        socket.on('start_simulation', startSim);
        socket.on('start-simulation', startSim);

        socket.on('end_simulation', async () => {
            console.log('--- [SOCKET] 🛑 end_simulation reçu');
            await manager.endSimulationAndScore();
            // Attendre un peu pour s'assurer que l'événement simulation_complete est envoyé
            await new Promise(resolve => setTimeout(resolve, 500));
            manager.cleanup();
        });

        socket.on('ping', () => {
            console.log('--- [SOCKET] 🏓 PING reçu de', socket.id);
            socket.emit('pong', { time: Date.now() });
        });

        socket.on('audio_chunk', (chunk: any) => {
            const data = chunk.data || chunk;
            const buffer = Buffer.from(new Uint8Array(data));
            manager.handleAudioChunk(buffer);
        });

        socket.on('audio-chunk', (chunk: any) => {
            const data = chunk.data || chunk;
            const buffer = Buffer.from(new Uint8Array(data));
            manager.handleAudioChunk(buffer);
        });

        socket.on('disconnect', () => {
            console.log('--- [SOCKET] Client déconnecté:', socket.id);
            manager.cleanup();
        });
    });

    res.socket.server.io = io;
    res.end();
};

export default SocketHandler;
