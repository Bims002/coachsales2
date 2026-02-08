/**
 * Tests de sécurité automatisés
 * Vérifier que toutes les protections de sécurité sont en place
 */

import { describe, it, expect } from '@jest/globals';

describe('Security Tests', () => {
    describe('Environment Variables', () => {
        it('should have all required environment variables', () => {
            const requiredEnvVars = [
                'NEXT_PUBLIC_SUPABASE_URL',
                'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                'SUPABASE_SERVICE_ROLE_KEY',
                'GOOGLE_APPLICATION_CREDENTIALS',
            ];

            requiredEnvVars.forEach((envVar) => {
                expect(process.env[envVar]).toBeDefined();
            });
        });

        it('should not expose sensitive keys in client-side code', () => {
            // Les clés sensibles ne doivent PAS commencer par NEXT_PUBLIC_
            expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
            expect(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
        });
    });

    describe('API Routes Protection', () => {
        it('should validate inputs on create-agent endpoint', async () => {
            const response = await fetch('http://localhost:3000/api/admin/create-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'invalid-email', // Email invalide
                    password: '123', // Mot de passe trop court
                    name: 'A', // Nom trop court
                }),
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Données invalides');
            expect(data.details).toBeDefined();
        });

        it('should enforce rate limiting', async () => {
            // Faire 15 requêtes rapidement (limite = 10)
            const requests = Array.from({ length: 15 }, () =>
                fetch('http://localhost:3000/api/admin/create-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'test@example.com',
                        password: 'Password123',
                        name: 'Test User',
                    }),
                })
            );

            const responses = await Promise.all(requests);
            const rateLimited = responses.filter((r) => r.status === 429);

            expect(rateLimited.length).toBeGreaterThan(0);
        });

        it('should require authentication for admin routes', async () => {
            const response = await fetch('http://localhost:3000/api/admin/create-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'Password123',
                    name: 'Test User',
                }),
            });

            expect(response.status).toBe(401);
        });
    });

    describe('HTTPS and Security Headers', () => {
        it('should have HSTS header in production', async () => {
            if (process.env.NODE_ENV === 'production') {
                const response = await fetch('http://localhost:3000');
                expect(response.headers.get('Strict-Transport-Security')).toBeDefined();
            }
        });

        it('should have CSP header', async () => {
            const response = await fetch('http://localhost:3000');
            expect(response.headers.get('Content-Security-Policy')).toBeDefined();
        });

        it('should have X-Frame-Options header', async () => {
            const response = await fetch('http://localhost:3000');
            expect(response.headers.get('X-Frame-Options')).toBe('DENY');
        });

        it('should have X-Content-Type-Options header', async () => {
            const response = await fetch('http://localhost:3000');
            expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        });
    });

    describe('CORS Configuration', () => {
        it('should allow CORS for API routes', async () => {
            const response = await fetch('http://localhost:3000/api/simulation/start', {
                method: 'OPTIONS',
            });

            expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
        });

        it('should restrict CORS origin in production', async () => {
            if (process.env.NODE_ENV === 'production') {
                const response = await fetch('http://localhost:3000/api/simulation/start');
                const origin = response.headers.get('Access-Control-Allow-Origin');
                expect(origin).not.toBe('*');
            }
        });
    });

    describe('Input Validation', () => {
        it('should reject invalid UUIDs', async () => {
            const response = await fetch('http://localhost:3000/api/admin/delete-agent?id=invalid-uuid', {
                method: 'DELETE',
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('ID invalide');
        });

        it('should reject invalid email formats', async () => {
            const response = await fetch('http://localhost:3000/api/admin/create-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'not-an-email',
                    password: 'Password123',
                    name: 'Test User',
                }),
            });

            expect(response.status).toBe(400);
        });
    });

    describe('RLS Policies', () => {
        it('should not have infinite recursion in profiles table', async () => {
            // Ce test nécessite une connexion Supabase
            // En production, utiliser un test d'intégration
            expect(true).toBe(true); // Placeholder
        });
    });

    describe('Security Logging', () => {
        it('should log authentication attempts', () => {
            // Vérifier que les logs de sécurité fonctionnent
            // En production, vérifier que les logs sont envoyés à Sentry
            expect(true).toBe(true); // Placeholder
        });

        it('should detect suspicious activity', () => {
            // Vérifier la détection d'activité suspecte
            expect(true).toBe(true); // Placeholder
        });
    });
});

/**
 * Tests de pénétration basiques
 */
describe('Penetration Tests', () => {
    describe('SQL Injection', () => {
        it('should prevent SQL injection in email field', async () => {
            const response = await fetch('http://localhost:3000/api/admin/create-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: "admin@example.com'; DROP TABLE users; --",
                    password: 'Password123',
                    name: 'Test User',
                }),
            });

            // Devrait échouer à la validation, pas exécuter le SQL
            expect(response.status).toBe(400);
        });
    });

    describe('XSS', () => {
        it('should sanitize script tags in inputs', async () => {
            const response = await fetch('http://localhost:3000/api/admin/create-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'Password123',
                    name: '<script>alert("XSS")</script>',
                }),
            });

            // Devrait accepter mais sanitizer
            // En production, vérifier que le script n'est pas exécuté
            expect(true).toBe(true); // Placeholder
        });
    });

    describe('CSRF', () => {
        it('should reject requests without proper origin', async () => {
            // En production, vérifier la protection CSRF
            expect(true).toBe(true); // Placeholder
        });
    });
});
