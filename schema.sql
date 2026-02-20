-- 1. Create the main data table
-- This table stores everything using a Key-Value approach (JSONB)
CREATE TABLE IF NOT EXISTS public.globalstreet (
    key text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
-- This is a requirement for Supabase security
ALTER TABLE public.globalstreet ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow all actions for anonymous users
-- Note: This is suitable for this specific application setup using the anon key.
CREATE POLICY "Allow full access to anon" ON public.globalstreet
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- 4. Create an index on the updated_at column
-- This improves performance when fetching large amounts of data sorted by time
CREATE INDEX IF NOT EXISTS idx_globalstreet_updated_at ON public.globalstreet (updated_at DESC);

-- Instructions:
-- 1. Open your Supabase Dashboard.
-- 2. Go to the "SQL Editor" section in the left sidebar.
-- 3. Click "New query".
-- 4. Paste this entire code and click "Run".