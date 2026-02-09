'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('--- [GLOBAL ERROR] 💥 Unhandled Runtime Error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 text-center">
            <div className="fluent-card p-8 max-w-md w-full flex flex-col items-center gap-6 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Oups, une erreur est survenue !
                    </h2>
                    <p className="text-gray-500">
                        Désolé, l'application a rencontré un problème inattendu.
                    </p>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-3 bg-red-50 text-red-800 text-xs font-mono rounded text-left overflow-auto max-h-32 w-full">
                            {error.message}
                        </div>
                    )}
                </div>

                <div className="w-full flex flex-col gap-3">
                    <button
                        onClick={() => reset()}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Réessayer
                    </button>

                    <a
                        href="/dashboard"
                        className="btn-secondary w-full flex items-center justify-center gap-2 no-underline text-center"
                        style={{ border: '1px solid var(--color-gray-30)', color: 'var(--color-text-primary)' }}
                    >
                        Retour au tableau de bord
                    </a>
                </div>
            </div>
        </div>
    );
}
