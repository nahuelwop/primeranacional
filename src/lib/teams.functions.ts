import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getTeamsForBoot = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("id,name,short,city,zone,primary_color,secondary_color,stripe,speed,jump,power,defense,logo_url,rivals,sort_order,goal_audio_urls,hinchada_urls,narrators")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
});