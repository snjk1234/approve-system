/**
 * MIGRATION: Add is_admin flag to profiles and set the first user as admin
 */

-- 1. Add the column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Make the oldest user the default admin (so the user has access immediately)
UPDATE public.profiles 
SET is_admin = true 
WHERE id = (
    SELECT id FROM public.profiles 
    ORDER BY created_at ASC 
    LIMIT 1
);
