-- Fix mutable search path on trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Restrict public bucket listing: only allow reading specific objects, not listing all
DROP POLICY IF EXISTS "Public read clothing images" ON storage.objects;

-- Allow public access by direct URL (Supabase public bucket URLs work via storage API, not list)
-- We keep SELECT for authenticated coordinators and rely on public URLs for image display
CREATE POLICY "Coordinators read clothing images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'clothing-images');

-- Public images served via the public bucket's CDN URL (storage.from('clothing-images').getPublicUrl)
-- This works without a SELECT policy on storage.objects because the bucket is marked public.