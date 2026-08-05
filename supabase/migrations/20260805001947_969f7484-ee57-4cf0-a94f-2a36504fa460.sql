CREATE TABLE IF NOT EXISTS public.global_narrators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  urls text[] NOT NULL DEFAULT '{}'::text[],
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.global_narrators TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.global_narrators TO authenticated;
GRANT ALL ON public.global_narrators TO service_role;

ALTER TABLE public.global_narrators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global narrators readable" ON public.global_narrators;
CREATE POLICY "global narrators readable" ON public.global_narrators FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins insert global narrators" ON public.global_narrators;
CREATE POLICY "admins insert global narrators" ON public.global_narrators FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update global narrators" ON public.global_narrators;
CREATE POLICY "admins update global narrators" ON public.global_narrators FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins delete global narrators" ON public.global_narrators;
CREATE POLICY "admins delete global narrators" ON public.global_narrators FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));