-- Script de correction finale pour la table 'simulations'
-- Ce script gère les conflits de noms de colonnes (duration vs duration_seconds)

DO $$ 
BEGIN 
    -- 1. Si la colonne 'duration' existe et est NOT NULL, on la rend nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'simulations' AND column_name = 'duration') THEN
        ALTER TABLE simulations ALTER COLUMN duration DROP NOT NULL;
    END IF;

    -- 2. On s'assure que 'duration_seconds' existe (utilisée par le code actuel)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'simulations' AND column_name = 'duration_seconds') THEN
        ALTER TABLE simulations ADD COLUMN duration_seconds INTEGER DEFAULT 0;
    END IF;

    -- 3. On s'assure que 'feedback' existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'simulations' AND column_name = 'feedback') THEN
        ALTER TABLE simulations ADD COLUMN feedback TEXT;
    END IF;

    -- 4. On s'assure que 'score' existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'simulations' AND column_name = 'score') THEN
        ALTER TABLE simulations ADD COLUMN score INTEGER DEFAULT 0;
    END IF;

    -- 5. On s'assure que 'transcript' existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'simulations' AND column_name = 'transcript') THEN
        ALTER TABLE simulations ADD COLUMN transcript JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Recharger le schéma PostgREST
NOTIFY pgrst, 'reload schema';
