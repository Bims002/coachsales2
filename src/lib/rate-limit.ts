import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter
 * Pour la production, utiliser Redis ou un service dédié
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Nettoyer les entrées expirées toutes les 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
    /** Nombre maximum de requêtes */
    maxRequests: number;
    /** Fenêtre de temps en millisecondes */
    windowMs: number;
    /** Message d'erreur personnalisé */
    message?: string;
}

/**
 * Middleware de rate limiting
 * @param request - La requête Next.js
 * @param config - Configuration du rate limit
 * @returns null si autorisé, NextResponse avec erreur 429 sinon
 */
export function rateLimit(
    request: NextRequest,
    config: RateLimitConfig
): NextResponse | null {
    // Identifier l'utilisateur par IP
    const identifier = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const key = `${identifier}:${request.nextUrl.pathname}`;

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
        // Nouvelle fenêtre
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + config.windowMs,
        });
        return null;
    }

    if (entry.count >= config.maxRequests) {
        // Limite atteinte
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return NextResponse.json(
            {
                error: config.message || 'Trop de requêtes. Veuillez réessayer plus tard.',
                retryAfter,
            },
            {
                status: 429,
                headers: {
                    'Retry-After': retryAfter.toString(),
                    'X-RateLimit-Limit': config.maxRequests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
                },
            }
        );
    }

    // Incrémenter le compteur
    entry.count++;
    rateLimitStore.set(key, entry);

    return null;
}

/**
 * Configurations prédéfinies
 */
export const RateLimitPresets = {
    /** Limite stricte : 10 requêtes par minute */
    STRICT: {
        maxRequests: 10,
        windowMs: 60 * 1000,
    },
    /** Limite modérée : 30 requêtes par minute */
    MODERATE: {
        maxRequests: 30,
        windowMs: 60 * 1000,
    },
    /** Limite souple : 100 requêtes par minute */
    LENIENT: {
        maxRequests: 100,
        windowMs: 60 * 1000,
    },
    /** Pour les authentifications : 5 tentatives par 15 minutes */
    AUTH: {
        maxRequests: 5,
        windowMs: 15 * 60 * 1000,
        message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
    },
};
