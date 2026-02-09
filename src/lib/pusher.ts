import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Configuration Serveur (pour envoyer des messages)
export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

// Configuration Client (pour recevoir des messages)
// Note: On l'instancie généralement dans le composant avec useEffect
export const getPusherClient = () => {
    return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
};
