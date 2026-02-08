import { z } from 'zod';

/**
 * Schémas de validation pour les API routes
 * Utilise Zod pour valider les inputs et prévenir les injections
 */

// Validation pour la création d'agent
export const createAgentSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
});

// Validation pour la création de produit
export const createProductSchema = z.object({
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(200),
    description: z.string().max(1000, 'La description est trop longue').optional(),
    price: z.number().positive('Le prix doit être positif').optional(),
    category: z.string().max(100).optional(),
});

// Validation pour la mise à jour de produit
export const updateProductSchema = createProductSchema.partial().extend({
    id: z.string().uuid('ID invalide'),
});

// Validation pour l'authentification
export const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Le mot de passe est requis'),
});

// Validation pour l'inscription
export const registerSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
        .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
        .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
        .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
});

// Validation pour la simulation
export const simulationSchema = z.object({
    productId: z.string().uuid('ID de produit invalide'),
    userId: z.string().uuid('ID utilisateur invalide'),
});

// Type exports pour TypeScript
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SimulationInput = z.infer<typeof simulationSchema>;
