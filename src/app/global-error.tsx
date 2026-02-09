'use client';

import { RefreshCcw } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 font-sans">
                <div className="fluent-card p-8 max-w-md w-full flex flex-col items-center gap-6 shadow-xl bg-white rounded-lg">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur critique</h2>
                    <p className="text-gray-500 text-center">
                        Une erreur système a empêché le chargement de l'application.
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => reset()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Réessayer
                        </button>
                        <a
                            href="/dashboard"
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition flex items-center gap-2 no-underline"
                        >
                            Tableau de bord
                        </a>
                    </div>
                </div>
            </body>
        </html>
    );
}
