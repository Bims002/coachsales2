import { NextRequest, NextResponse } from 'next/server';

/**
 * Logger de sécurité centralisé
 * Enregistre les événements de sécurité importants
 */

export enum SecurityEventType {
    AUTH_SUCCESS = 'AUTH_SUCCESS',
    AUTH_FAILURE = 'AUTH_FAILURE',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
    INVALID_INPUT = 'INVALID_INPUT',
    ADMIN_ACTION = 'ADMIN_ACTION',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

interface SecurityLogEntry {
    timestamp: string;
    type: SecurityEventType;
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    method?: string;
    details?: Record<string, any>;
}

class SecurityLogger {
    private logs: SecurityLogEntry[] = [];
    private maxLogs = 1000; // Garder les 1000 derniers logs en mémoire

    /**
     * Enregistrer un événement de sécurité
     */
    log(
        type: SecurityEventType,
        request?: NextRequest,
        details?: Record<string, any>
    ): void {
        const entry: SecurityLogEntry = {
            timestamp: new Date().toISOString(),
            type,
            ip: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'unknown',
            userAgent: request?.headers.get('user-agent') || 'unknown',
            path: request?.nextUrl.pathname,
            method: request?.method,
            details,
        };

        // Ajouter à la liste
        this.logs.push(entry);

        // Limiter la taille
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Log en console (en production, envoyer à un service externe)
        this.logToConsole(entry);

        // En production, envoyer à Sentry, LogRocket, etc.
        if (process.env.NODE_ENV === 'production') {
            this.sendToExternalService(entry);
        }
    }

    /**
     * Log en console avec formatage
     */
    private logToConsole(entry: SecurityLogEntry): void {
        const emoji = this.getEmoji(entry.type);
        const color = this.getColor(entry.type);

        console.log(
            `${emoji} [SECURITY] ${entry.timestamp} - ${entry.type}`,
            {
                ip: entry.ip,
                path: entry.path,
                method: entry.method,
                details: entry.details,
            }
        );
    }

    /**
     * Envoyer à un service externe (Sentry, LogRocket, etc.)
     */
    private sendToExternalService(entry: SecurityLogEntry): void {
        // TODO: Implémenter l'envoi à Sentry ou autre service
        // Exemple avec Sentry:
        // Sentry.captureMessage(`Security Event: ${entry.type}`, {
        //   level: this.getSeverity(entry.type),
        //   extra: entry,
        // });
    }

    /**
     * Obtenir un emoji pour le type d'événement
     */
    private getEmoji(type: SecurityEventType): string {
        const emojis: Record<SecurityEventType, string> = {
            [SecurityEventType.AUTH_SUCCESS]: '✅',
            [SecurityEventType.AUTH_FAILURE]: '❌',
            [SecurityEventType.RATE_LIMIT_EXCEEDED]: '⚠️',
            [SecurityEventType.UNAUTHORIZED_ACCESS]: '🚫',
            [SecurityEventType.INVALID_INPUT]: '⚠️',
            [SecurityEventType.ADMIN_ACTION]: '🔑',
            [SecurityEventType.SUSPICIOUS_ACTIVITY]: '🚨',
        };
        return emojis[type] || '📝';
    }

    /**
     * Obtenir une couleur pour le type d'événement
     */
    private getColor(type: SecurityEventType): string {
        const colors: Record<SecurityEventType, string> = {
            [SecurityEventType.AUTH_SUCCESS]: 'green',
            [SecurityEventType.AUTH_FAILURE]: 'red',
            [SecurityEventType.RATE_LIMIT_EXCEEDED]: 'yellow',
            [SecurityEventType.UNAUTHORIZED_ACCESS]: 'red',
            [SecurityEventType.INVALID_INPUT]: 'yellow',
            [SecurityEventType.ADMIN_ACTION]: 'blue',
            [SecurityEventType.SUSPICIOUS_ACTIVITY]: 'red',
        };
        return colors[type] || 'white';
    }

    /**
     * Obtenir les logs récents
     */
    getRecentLogs(limit: number = 100): SecurityLogEntry[] {
        return this.logs.slice(-limit);
    }

    /**
     * Obtenir les logs par type
     */
    getLogsByType(type: SecurityEventType): SecurityLogEntry[] {
        return this.logs.filter((log) => log.type === type);
    }

    /**
     * Obtenir les logs par IP
     */
    getLogsByIp(ip: string): SecurityLogEntry[] {
        return this.logs.filter((log) => log.ip === ip);
    }

    /**
     * Détecter une activité suspecte
     */
    detectSuspiciousActivity(ip: string, timeWindowMs: number = 60000): boolean {
        const now = Date.now();
        const recentLogs = this.logs.filter(
            (log) =>
                log.ip === ip &&
                now - new Date(log.timestamp).getTime() < timeWindowMs
        );

        // Activité suspecte si :
        // - Plus de 5 échecs d'authentification en 1 minute
        const authFailures = recentLogs.filter(
            (log) => log.type === SecurityEventType.AUTH_FAILURE
        ).length;

        if (authFailures >= 5) {
            this.log(SecurityEventType.SUSPICIOUS_ACTIVITY, undefined, {
                ip,
                reason: 'Multiple authentication failures',
                count: authFailures,
            });
            return true;
        }

        return false;
    }
}

// Instance singleton
export const securityLogger = new SecurityLogger();

/**
 * Helper pour logger une tentative de connexion
 */
export function logAuthAttempt(
    success: boolean,
    email: string,
    request?: NextRequest
): void {
    securityLogger.log(
        success ? SecurityEventType.AUTH_SUCCESS : SecurityEventType.AUTH_FAILURE,
        request,
        { email }
    );
}

/**
 * Helper pour logger un dépassement de rate limit
 */
export function logRateLimitExceeded(request: NextRequest): void {
    securityLogger.log(SecurityEventType.RATE_LIMIT_EXCEEDED, request);
}

/**
 * Helper pour logger un accès non autorisé
 */
export function logUnauthorizedAccess(
    request: NextRequest,
    reason: string
): void {
    securityLogger.log(SecurityEventType.UNAUTHORIZED_ACCESS, request, {
        reason,
    });
}

/**
 * Helper pour logger une action admin
 */
export function logAdminAction(
    action: string,
    userId: string,
    request?: NextRequest,
    details?: Record<string, any>
): void {
    securityLogger.log(SecurityEventType.ADMIN_ACTION, request, {
        action,
        userId,
        ...details,
    });
}
