CREATE TABLE public.game_settings (
  id text PRIMARY KEY DEFAULT 'global',
  intro_video_url text,
  coimas_enabled boolean NOT NULL DEFAULT false,
  coimas_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  anular_goles_ratio integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.game_settings TO anon, authenticated;
GRANT ALL ON public.game_settings TO service_role;
GRANT INSERT, UPDATE ON public.game_settings TO authenticated;

ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read game settings"
  ON public.game_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins insert game settings"
  ON public.game_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update game settings"
  ON public.game_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER game_settings_updated_at
  BEFORE UPDATE ON public.game_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.game_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;