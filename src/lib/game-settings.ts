import { supabase } from "@/integrations/supabase/client";

export type CoimasFlags = {
  forzar_victoria?: boolean;
  forzar_empate?: boolean;
  forzar_derrota?: boolean;
  clasificar_reducido?: boolean;
  forzar_ascensos?: boolean;
  forzar_descensos?: boolean;
  anular_goles?: boolean;
  arbitro_amigo?: boolean;
  penal_inventado?: boolean;
  expulsar_rival?: boolean;
  doping?: boolean;
  hinchada_comprada?: boolean;
  sponsor_fantasma?: boolean;
  gol_fantasma?: boolean;
  var_apagado?: boolean;
  amarilla_rival?: boolean;
  cambio_fixture?: boolean;
  descontar_puntos_rival?: boolean;
  bonus_presupuesto?: boolean;
};

/*
 * Claves de las intros.
 *
 * Las divisiones usan exactamente estos IDs:
 * - primera_division
 * - primera_nacional
 * - primera_b
 * - primera_c
 * - promocional_amateur
 * - federal_a
 * - regional_federal_amateur
 *
 * Copa Argentina es independiente porque no es una división.
 */
export type IntroVideoKey =
  | "primera_division"
  | "primera_nacional"
  | "primera_b"
  | "primera_c"
  | "promocional_amateur"
  | "federal_a"
  | "regional_federal_amateur"
  | "copa_argentina";

export type DivisionIntroVideos = Partial<Record<IntroVideoKey, string | null>>;

export type GameSettings = {
  id: string;

  // Campo viejo, mantenido por compatibilidad.
  // Históricamente era la única intro.
  intro_video_url: string | null;

  // Campo nuevo: una intro independiente para cada división / Copa Argentina.
  intro_videos: DivisionIntroVideos;

  whistle_audio_url: string | null;

  coimas_enabled: boolean;
  coimas_flags: CoimasFlags;
  anular_goles_ratio: number;
};

export const DEFAULT_SETTINGS: GameSettings = {
  id: "global",
  intro_video_url: null,
  intro_videos: {},
  whistle_audio_url: null,
  coimas_enabled: false,
  coimas_flags: {},
  anular_goles_ratio: 3,
};

function normalizeIntroVideos(
  videos: unknown,
  legacyUrl: string | null,
): DivisionIntroVideos {
  const result: DivisionIntroVideos = {};

  if (videos && typeof videos === "object" && !Array.isArray(videos)) {
    const source = videos as Record<string, unknown>;

    for (const key of [
      "primera_division",
      "primera_nacional",
      "primera_b",
      "primera_c",
      "promocional_amateur",
      "federal_a",
      "regional_federal_amateur",
      "copa_argentina",
    ] as IntroVideoKey[]) {
      const value = source[key];
      if (typeof value === "string" && value.trim() !== "") {
        result[key] = value;
      } else if (value === null) {
        result[key] = null;
      }
    }
  }

  // Compatibilidad con el sistema anterior:
  // si solamente existía intro_video_url, la tomamos como intro de Primera Nacional.
  if (
    !result.primera_nacional &&
    legacyUrl &&
    typeof legacyUrl === "string" &&
    legacyUrl.trim() !== ""
  ) {
    result.primera_nacional = legacyUrl;
  }

  return result;
}

export async function fetchGameSettings(): Promise<GameSettings> {
  const { data, error } = await supabase
    .from("game_settings")
    .select("*")
    .eq("id", "global")
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_SETTINGS;
  }

  const legacyUrl =
    typeof data.intro_video_url === "string"
      ? data.intro_video_url
      : null;

  return {
    id: data.id,
    intro_video_url: legacyUrl,

    intro_videos: normalizeIntroVideos(
      data.intro_videos,
      legacyUrl,
    ),

    whistle_audio_url:
      typeof data.whistle_audio_url === "string"
        ? data.whistle_audio_url
        : null,

    coimas_enabled: !!data.coimas_enabled,

    coimas_flags:
      data.coimas_flags &&
      typeof data.coimas_flags === "object"
        ? (data.coimas_flags as CoimasFlags)
        : {},

    anular_goles_ratio:
      typeof data.anular_goles_ratio === "number"
        ? data.anular_goles_ratio
        : 3,
  };
}

export async function saveGameSettings(
  patch: Partial<Omit<GameSettings, "id">>,
): Promise<void> {
  const introVideos = patch.intro_videos ?? {};

  /*
   * También mantenemos intro_video_url sincronizado con la intro
   * de Primera Nacional para no romper código antiguo.
   */
  const legacyIntro =
    introVideos.primera_nacional ??
    patch.intro_video_url ??
    null;

  const { error } = await supabase
    .from("game_settings")
    .upsert({
      id: "global",

      intro_video_url: legacyIntro,
      intro_videos: introVideos,

      whistle_audio_url:
        patch.whistle_audio_url ?? null,

      coimas_enabled:
        patch.coimas_enabled ?? false,

      coimas_flags:
        patch.coimas_flags as never,

      anular_goles_ratio:
        patch.anular_goles_ratio ?? 3,
    });

  if (error) {
    throw error;
  }
}

import { useEffect, useState } from "react";

export function useGameSettings() {
  const [settings, setSettings] =
    useState<GameSettings>(DEFAULT_SETTINGS);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchGameSettings()
      .then((s) => {
        setSettings(s);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  return {
    settings,
    loaded,
    refresh: async () => {
      setSettings(await fetchGameSettings());
    },
  };
}
