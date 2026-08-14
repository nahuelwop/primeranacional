import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  sort_order: number;
};

export type MusicPrefs = {
  music_enabled: boolean;
  disabled_track_ids: string[];
};

const DEFAULT_PREFS: MusicPrefs = { music_enabled: true, disabled_track_ids: [] };

export async function fetchMusicTracks(): Promise<MusicTrack[]> {
  const { data, error } = await (supabase.from("career_music_tracks" as any) as any)
    .select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MusicTrack[];
}

export async function fetchMusicPrefs(userId: string): Promise<MusicPrefs> {
  const { data, error } = await (supabase.from("user_music_prefs" as any) as any)
    .select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_PREFS;
  return { music_enabled: data.music_enabled, disabled_track_ids: data.disabled_track_ids ?? [] };
}

export async function saveMusicPrefs(userId: string, prefs: MusicPrefs) {
  const { error } = await (supabase.from("user_music_prefs" as any) as any)
    .upsert({ user_id: userId, music_enabled: prefs.music_enabled, disabled_track_ids: prefs.disabled_track_ids, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// Baraja tipo playlist: orden al azar, sin repetir hasta agotar la lista.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Reproductor de música de fondo del Modo Carrera. Solo se monta dentro del
// <Shell> de /carrera, así que solo suena ahí — en cualquier otra pantalla del
// juego este hook ni se instancia.
export function useCareerMusic() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [prefs, setPrefs] = useState<MusicPrefs>(DEFAULT_PREFS);
  const [current, setCurrent] = useState<MusicTrack | null>(null);
  const [showToast, setShowToast] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<MusicTrack[]>([]);
  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);

  // Cargar catálogo + preferencias del usuario
  useEffect(() => {
    let active = true;
    fetchMusicTracks().then(t => { if (active) setTracks(t); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!user) { setPrefs(DEFAULT_PREFS); return; }
    let active = true;
    fetchMusicPrefs(user.id).then(p => { if (active) setPrefs(p); }).catch(() => {});
    return () => { active = false; };
  }, [user]);

  const playNext = () => {
    const enabledTracks = tracks.filter(t => !prefsRef.current.disabled_track_ids.includes(t.id));
    if (!prefsRef.current.music_enabled || enabledTracks.length === 0) {
      setCurrent(null);
      return;
    }
    if (queueRef.current.length === 0) {
      // Rearma la "playlist" barajada; evita repetir el mismo tema que acaba de sonar dos veces seguidas.
      let next = shuffle(enabledTracks);
      if (next.length > 1 && current && next[0].id === current.id) {
        [next[0], next[1]] = [next[1], next[0]];
      }
      queueRef.current = next;
    }
    const track = queueRef.current.shift()!;
    setCurrent(track);
    setShowToast(true);
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      const a = new Audio(track.audio_url);
      a.volume = 0.5;
      a.onended = () => playNext();
      audioRef.current = a;
      a.play().catch(() => {});
    } catch { /* noop */ }
  };

  // Arranca / reinicia la reproducción cuando cambian tracks o preferencias
  useEffect(() => {
    if (tracks.length === 0) return;
    const enabledTracks = tracks.filter(t => !prefs.disabled_track_ids.includes(t.id));
    if (!prefs.music_enabled || enabledTracks.length === 0) {
      audioRef.current?.pause();
      setCurrent(null);
      return;
    }
    // Si el tema actual dejó de estar habilitado, saltamos al próximo.
    if (!current || !enabledTracks.some(t => t.id === current.id)) {
      queueRef.current = [];
      playNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, prefs]);

  useEffect(() => {
    if (!showToast) return;
    const id = setTimeout(() => setShowToast(false), 5000);
    return () => clearTimeout(id);
  }, [showToast, current?.id]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  return { current, showToast, tracks, prefs, setPrefs: (p: MusicPrefs) => { setPrefs(p); if (user) saveMusicPrefs(user.id, p).catch(() => {}); } };
}

// Context: para que "Personalizar" pueda leer/editar las preferencias sin
// tener que pasarlas a mano por cada nivel de props.
export type CareerMusicCtx = ReturnType<typeof useCareerMusic>;
export const CareerMusicContext = createContext<CareerMusicCtx | null>(null);
export function useCareerMusicContext() {
  return useContext(CareerMusicContext);
}
