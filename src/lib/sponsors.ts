import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Sponsor = {
  id: string;
  name: string;
  slogan: string;
  logo_url: string | null;
  color: string;
  prestige: number;
  initial_payment: number;
  weekly_payment: number;
  bonus_payment: number;
  duration_seasons: number;
  objectives: string[];
  conditions: string;
  featured: boolean;
  active: boolean;
  sort_order: number;
};

export type SponsorDeal = {
  sponsorId: string;
  name: string;
  initial: number;
  weekly: number;
  bonus: number;
  seasons: number;
  since: number;
  color: string;
  logo_url?: string | null;
};

const table = () => supabase.from("sponsors" as never) as never as {
  select: (q: string) => never;
};

export async function fetchSponsors(onlyActive = true): Promise<Sponsor[]> {
  let q = (supabase.from("sponsors" as never) as never as any)
    .select("*")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true });
  if (onlyActive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Sponsor[];
}

export function useSponsors(onlyActive = true) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setSponsors(await fetchSponsors(onlyActive)); }
    catch { setSponsors([]); }
    finally { setLoading(false); }
  }, [onlyActive]);
  useEffect(() => { void reload(); }, [reload]);
  return { sponsors, loading, reload };
}

export async function saveSponsor(s: Partial<Sponsor> & { id?: string }) {
  const payload = {
    name: s.name ?? "Nuevo patrocinador",
    slogan: s.slogan ?? "",
    logo_url: s.logo_url ?? null,
    color: s.color ?? "#22c55e",
    prestige: s.prestige ?? 3,
    initial_payment: s.initial_payment ?? 10000000,
    weekly_payment: s.weekly_payment ?? 400000,
    bonus_payment: s.bonus_payment ?? 2500000,
    duration_seasons: s.duration_seasons ?? 1,
    objectives: s.objectives ?? [],
    conditions: s.conditions ?? "",
    featured: s.featured ?? false,
    active: s.active ?? true,
    sort_order: s.sort_order ?? 0,
  };
  const db = supabase.from("sponsors" as never) as never as any;
  const { error } = s.id ? await db.update(payload).eq("id", s.id) : await db.insert(payload);
  if (error) throw error;
}

export async function deleteSponsor(id: string) {
  const db = supabase.from("sponsors" as never) as never as any;
  const { error } = await db.delete().eq("id", id);
  if (error) throw error;
}

export function money(n: number): string {
  return "$ " + Math.round(n).toLocaleString("es-AR");
}

void table;
