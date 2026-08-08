import { createServerFn } from "@tanstack/react-start";

export const getTeamsForBoot = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("teams")
      .select("*")
      .order("sort_order", { ascending: true });

    // Si falla la consulta o no hay equipos cargados, devolvemos vacío y el
    // cliente usa los 36 equipos locales como fallback.
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
});
