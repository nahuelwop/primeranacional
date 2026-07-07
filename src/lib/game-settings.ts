import { supabase } from "@/integrations/supabase/client";

export type CoimasFlags = {
  forzar_victoria?: boolean;
  forzar_empate?: boolean;
  forzar_derrota?: boolean;
  clasificar_reducido?: boolean;
  forzar_ascensos?: boolean;
  forzar_descensos?: boolean;
  anular_goles?: boolean;
};

export type GameSettings = {
  id: string;
  intro_video_url: string | null;
  coimas_enabled: boolean;
  coimas_flags: CoimasFlags;
  anular_goles_ratio: number;
};

export const DEFAULT_SETTINGS: GameSettings = {
  id: "global",
  intro_video_url: null,
  coimas_enabled: false,
  coimas_flags: {},
  anular_goles_ratio: 3,
};

export async function fetchGameSettings(): Promise<GameSettings> {
  const { data, error } = await supabase.from("game_settings").select("*").eq("id", "global").maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return {
    id: data.id,
    intro_video_url: data.intro_video_url,
    coimas_enabled: data.coimas_enabled,
    coimas_flags: (data.coimas_flags as CoimasFlags) ?? {},
    anular_goles_ratio: data.anular_goles_ratio ?? 3,
  };
}

export async function saveGameSettings(patch: Partial<Omit<GameSettings, "id">>): Promise<void> {
  const { error } = await supabase.from("game_settings").upsert({
    id: "global",
    ...patch,
    coimas_flags: patch.coimas_flags as never,
  });
  if (error) throw error;
}

import { useEffect, useState } from "react";
export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetchGameSettings().then(s => { setSettings(s); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);
  return { settings, loaded, refresh: async () => setSettings(await fetchGameSettings()) };
}
