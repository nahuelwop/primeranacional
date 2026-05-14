
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles self read" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Teams
CREATE TABLE public.teams (
  id text PRIMARY KEY,
  name text NOT NULL,
  short text NOT NULL,
  city text NOT NULL,
  zone text NOT NULL CHECK (zone IN ('A','B')),
  primary_color text NOT NULL,
  secondary_color text NOT NULL,
  stripe text NOT NULL DEFAULT 'solid',
  speed int NOT NULL DEFAULT 70,
  jump int NOT NULL DEFAULT 70,
  power int NOT NULL DEFAULT 70,
  defense int NOT NULL DEFAULT 70,
  logo_url text,
  rivals text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams readable" ON public.teams FOR SELECT USING (true);
CREATE POLICY "admins insert teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update teams" ON public.teams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete teams" ON public.teams FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Tournament progress per user
CREATE TABLE public.tournament_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tournament_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress select" ON public.tournament_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own progress insert" ON public.tournament_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress update" ON public.tournament_progress FOR UPDATE USING (auth.uid() = user_id);

-- Username -> email lookup (for login by username)
CREATE OR REPLACE FUNCTION public.email_for_username(_username text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.email FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE p.username = _username
  LIMIT 1
$$;

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uname text;
BEGIN
  uname := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1));
  -- ensure unique username; append suffix if collision
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = uname) THEN
    uname := uname || '_' || substr(NEW.id::text,1,4);
  END IF;
  INSERT INTO public.profiles(id, username) VALUES (NEW.id, uname);
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for teams
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER teams_touch BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage bucket for custom team logos
INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos','team-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "logos public read" ON storage.objects FOR SELECT USING (bucket_id='team-logos');
CREATE POLICY "admins logos insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='team-logos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins logos update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='team-logos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins logos delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='team-logos' AND public.has_role(auth.uid(),'admin'));
