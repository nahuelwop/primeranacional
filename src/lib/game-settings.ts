import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

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

// Logos de categoría (para el selector de ligas estilo PES en Equipos).
// Usa las mismas claves que IntroVideoKey — una imagen por división + Copa Argentina.
export type DivisionLogos = Partial<Record<IntroVideoKey, string | null>>;

// Sonidos del menú de Equipos (estilo PES): al pasar de equipo, al elegirlo,
// y al cambiar de liga/división. Si no hay audio cargado, se usa el "blip"
// sintetizado de siempre (ver src/lib/ui-blip.ts) — nunca queda mudo.
export type UiSfxKey = "team_move" | "team_select" | "league_select";
export type UiSfx = Partial<Record<UiSfxKey, string | null>>;

export type GameSettings = {
  id: string;

  // Campo viejo, mantenido por compatibilidad.
  // Históricamente era la única intro.
  intro_video_url: string | null;

  // Campo nuevo: una intro independiente para cada división / Copa Argentina.
  intro_videos: DivisionIntroVideos;

  // Logo de cada división + Copa Argentina, para el selector de ligas de Equipos.
  division_logos: DivisionLogos;

  // Sonidos del menú de Equipos (pasar equipo / elegir equipo / cambiar liga).
  ui_sfx: UiSfx;

  whistle_audio_url: string | null;

  coimas_enabled: boolean;
  coimas_flags: CoimasFlags;
  anular_goles_ratio: number;
};

export const DEFAULT_SETTINGS: GameSettings = {
  id: "global",
  intro_video_url: null,
  intro_videos: {},
  division_logos: {},
  ui_sfx: {},
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

function normalizeKeyedUrls<K extends string>(
  source: unknown,
  keys: readonly K[],
): Partial<Record<K, string | null>> {
  const result: Partial<Record<K, string | null>> = {};
  if (source && typeof source === "object" && !Array.isArray(source)) {
    const obj = source as Record<string, unknown>;
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "string" && value.trim() !== "") result[key] = value;
      else if (value === null) result[key] = null;
    }
  }
  return result;
}

const INTRO_VIDEO_KEYS = [
  "primera_division", "primera_nacional", "primera_b", "primera_c",
  "promocional_amateur", "federal_a", "regional_federal_amateur", "copa_argentina",
] as const;
const UI_SFX_KEYS = ["team_move", "team_select", "league_select"] as const;

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

    division_logos: normalizeKeyedUrls((data as any).division_logos, INTRO_VIDEO_KEYS),
    ui_sfx: normalizeKeyedUrls((data as any).ui_sfx, UI_SFX_KEYS),

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
  const current = await fetchGameSettings();
  const introVideos = normalizeIntroVideos(
    patch.intro_videos ?? current.intro_videos,
    patch.intro_video_url ?? current.intro_video_url,
  );

  // Sincronizamos el campo legado y el nuevo JSON. Para evitar el problema
  // que producía upsert cuando la fila global ya existía, primero hacemos
  // UPDATE y sólo insertamos como fallback si la fila no existe.
  const payload = {
    intro_video_url: introVideos.primera_nacional ?? patch.intro_video_url ?? current.intro_video_url ?? null,
    intro_videos: introVideos,
    division_logos: patch.division_logos ?? current.division_logos ?? {},
    ui_sfx: patch.ui_sfx ?? current.ui_sfx ?? {},
    whistle_audio_url: patch.whistle_audio_url ?? current.whistle_audio_url ?? null,
    coimas_enabled: patch.coimas_enabled ?? current.coimas_enabled,
    coimas_flags: patch.coimas_flags ?? current.coimas_flags,
    anular_goles_ratio: patch.anular_goles_ratio ?? current.anular_goles_ratio,
  };

  const updateResult = await supabase
    .from("game_settings")
    .update(payload as any)
    .eq("id", "global")
    .select("id")
    .maybeSingle();

  if (!updateResult.error && updateResult.data) return;

  if (updateResult.error && !/column .*(intro_videos|division_logos|ui_sfx).*does not exist/i.test(updateResult.error.message)) {
    // Si es un error real (RLS, conexión, etc.), no lo tapamos.
    throw updateResult.error;
  }

  // Fallback para instalaciones viejas: guarda el campo legado al menos y
  // permite que la migración nueva lo repare cuando se ejecute.
  const fallback = await supabase
    .from("game_settings")
    .update({
      intro_video_url: payload.intro_video_url,
      whistle_audio_url: payload.whistle_audio_url,
      coimas_enabled: payload.coimas_enabled,
      coimas_flags: payload.coimas_flags,
      anular_goles_ratio: payload.anular_goles_ratio,
    } as any)
    .eq("id", "global")
    .select("id")
    .maybeSingle();

  if (!fallback.error && fallback.data) {
    throw new Error("La base de datos todavía no tiene las columnas intro_videos/division_logos/ui_sfx. Ejecutá la migración 20260902000000_career_features.sql, la 20260827010000_division_intro_videos.sql y la 20260906000000_ui_sfx_division_logos.sql.");
  }
  if (fallback.error) throw fallback.error;
}

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
