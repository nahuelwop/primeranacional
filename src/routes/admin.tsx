import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Shield } from "@/components/Shield";
import { supabase } from "@/integrations/supabase/client";
import { SponsorsAdmin } from "@/components/admin/SponsorsAdmin";
import { useAuth } from "@/lib/auth";
import { TEAMS, type Team, type Narrator } from "@/data/teams";
import { getTeamsByDivision } from "@/data/teams-catalog";
import { COMPETITIONS, DIVISION_ORDER, type DivisionId } from "@/data/competitions";
import { useTeamsSync, reloadTeams, syncTeamsFromDbRows, type DbTeam } from "@/lib/teams-sync";
import { SquadStadiumEditor } from "@/components/SquadStadiumEditor";
import { fetchGameSettings, saveGameSettings, type CoimasFlags, type GameSettings, DEFAULT_SETTINGS } from "@/lib/game-settings";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Primera Heads" }] }),
  component: AdminPage,
});

type Tab = "equipos" | "ajustes" | "relatores" | "patrocinadores" | "musica";

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  useTeamsSync();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("equipos");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) nav({ to: "/auth" });
  }, [loading, user, isAdmin, nav]);

  if (loading) return <div className="p-10">Cargando...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="font-display text-5xl">PANEL ADMIN</h1>
            <p className="text-muted-foreground text-sm">Gestioná equipos y configuración global del juego.</p>
          </div>
          <Link to="/" className="text-sm underline self-center">← Volver</Link>
        </div>

        {/* Menú de pestañas */}
        <div className="flex gap-2 border-b border-border mb-6">
          {([
            { k: "equipos", label: "⚽ EQUIPOS" },
            { k: "relatores", label: "🎙️ RELATORES" },
            { k: "musica", label: "🎵 MÚSICA" },
            { k: "patrocinadores", label: "🤝 PATROCINADORES" },
            { k: "ajustes", label: "⚙️ AJUSTES DEL JUEGO" },
          ] as { k: Tab; label: string }[]).map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-4 py-2 font-display text-sm tracking-wider border-b-2 transition ${
                tab === t.k ? "border-celeste text-celeste" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "equipos" && <EquiposTab />}
        {tab === "relatores" && <RelatoresTab />}
        {tab === "musica" && <MusicaTab />}
        {tab === "patrocinadores" && <SponsorsAdmin />}
        {tab === "ajustes" && <AjustesTab />}
      </main>
    </div>
  );
}

type NarratorField = "urls" | "penal_goal_urls" | "penal_save_urls" | "penal_decisive_urls" | "clasico_previa_urls";
type GlobalNarrator = {
  id: string; name: string; sort_order: number;
  urls: string[];
  penal_goal_urls?: string[];
  penal_save_urls?: string[];
  penal_decisive_urls?: string[];
  clasico_previa_urls?: string[];
};

const NARRATOR_FIELDS: { field: NarratorField; label: string; sub: string }[] = [
  { field: "urls", label: "Gol (partido)", sub: "goles" },
  { field: "penal_goal_urls", label: "Penal → Gol", sub: "penal-gol" },
  { field: "penal_save_urls", label: "Penal → Atajada", sub: "penal-atajada" },
  { field: "penal_decisive_urls", label: "Penal → Decisivo", sub: "penal-decisivo" },
  { field: "clasico_previa_urls", label: "Previa del Clásico", sub: "clasico-previa" },
];

function RelatoresTab() {
  const [narrators, setNarrators] = useState<GlobalNarrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase.from("global_narrators" as any) as any).select("*").order("sort_order", { ascending: true });
    if (error) setErr(error.message);
    else setNarrators((data ?? []) as GlobalNarrator[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addNarrator() {
    setErr(null);
    const { data, error } = await (supabase
      .from("global_narrators" as any) as any)
      .insert({ name: "Nuevo relator", urls: [], sort_order: narrators.length })
      .select()
      .single();
    if (error) { setErr(error.message); return; }
    setNarrators(n => [...n, data as GlobalNarrator]);
  }

  async function renameNarrator(id: string, name: string) {
    setNarrators(n => n.map(x => x.id === id ? { ...x, name } : x));
    await (supabase.from("global_narrators" as any) as any).update({ name }).eq("id", id);
  }

  async function deleteNarrator(id: string) {
    if (!confirm("¿Eliminar este relator y todos sus audios de la lista?")) return;
    setErr(null);
    const { error } = await (supabase.from("global_narrators" as any) as any).delete().eq("id", id);
    if (error) { setErr(error.message); return; }
    setNarrators(n => n.filter(x => x.id !== id));
  }

  async function uploadAudios(id: string, files: FileList | null, field: NarratorField, sub: string) {
    if (!files || files.length === 0) return;
    setBusyId(id + field); setErr(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "mp3";
        const path = `global-relatores/${id}/${sub}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("team-audios").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        const { data, error: sErr } = await supabase.storage.from("team-audios").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (sErr || !data) throw sErr ?? new Error("No se pudo firmar el audio");
        urls.push(data.signedUrl);
      }
      const target = narrators.find(n => n.id === id);
      const newUrls = [...((target?.[field] as string[] | undefined) ?? []), ...urls];
      const { error } = await (supabase.from("global_narrators" as any) as any).update({ [field]: newUrls }).eq("id", id);
      if (error) throw error;
      setNarrators(n => n.map(x => x.id === id ? { ...x, [field]: newUrls } : x));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeAudio(id: string, idx: number, field: NarratorField) {
    const target = narrators.find(n => n.id === id);
    if (!target) return;
    const newUrls = ((target[field] as string[] | undefined) ?? []).filter((_, i) => i !== idx);
    setNarrators(n => n.map(x => x.id === id ? { ...x, [field]: newUrls } : x));
    await (supabase.from("global_narrators" as any) as any).update({ [field]: newUrls }).eq("id", id);
  }

  if (loading) return <div className="text-sm text-muted-foreground">Cargando relatores...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-xl">
          Relatores globales: se ofrecen en <b>cualquier partido</b>, sin importar qué equipos jueguen.
          Cada relator puede tener sus audios de gol y sus audios propios para los penales.
        </p>
        <Button onClick={addNarrator}>+ Nuevo relator</Button>
      </div>

      {err && <div className="text-xs text-destructive">{err}</div>}

      {narrators.length === 0 && (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
          Todavía no hay relatores globales. Creá uno y subile sus audios de gol.
        </div>
      )}

      <div className="grid gap-3">
        {narrators.map(n => (
          <div key={n.id} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={n.name}
                onChange={e => renameNarrator(n.id, e.target.value)}
                placeholder="Nombre del relator (ej: Relator Bricco)"
                className="flex-1"
              />
              <button onClick={() => deleteNarrator(n.id)} className="text-destructive text-xs hover:underline whitespace-nowrap">
                Eliminar relator
              </button>
            </div>

            {NARRATOR_FIELDS.map(({ field, label, sub }) => {
              const list = (n[field] as string[] | undefined) ?? [];
              const busy = busyId === n.id + field;
              return (
                <div key={field} className="rounded-md border border-border/60 p-2 space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">{label}</div>
                  <div className="flex flex-wrap gap-2">
                    {list.map((u, i) => (
                      <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
                        <audio src={u} controls className="h-6" />
                        <button onClick={() => removeAudio(n.id, i, field)} className="text-destructive hover:underline">Quitar</button>
                      </div>
                    ))}
                    {list.length === 0 && <span className="text-xs text-muted-foreground">Sin audios</span>}
                  </div>
                  <label className="text-xs text-celeste underline cursor-pointer inline-block">
                    {busy ? "Subiendo..." : "+ Subir audios"}
                    <input
                      type="file"
                      accept="audio/*"
                      multiple
                      className="hidden"
                      disabled={busy}
                      onChange={e => { uploadAudios(n.id, e.target.files, field, sub); e.target.value = ""; }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

type MusicTrackRow = { id: string; title: string; artist: string; audio_url: string; cover_url: string | null; sort_order: number };
function MusicaTab() {
  const [tracks, setTracks] = useState<MusicTrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase.from("career_music_tracks" as any) as any).select("*").order("sort_order", { ascending: true });
    if (error) setErr(error.message);
    else setTracks((data ?? []) as MusicTrackRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addTrack() {
    setErr(null);
    const { data, error } = await (supabase.from("career_music_tracks" as any) as any)
      .insert({ title: "Nueva canción", artist: "", audio_url: "", sort_order: tracks.length })
      .select().single();
    if (error) { setErr(error.message); return; }
    setTracks(t => [...t, data as MusicTrackRow]);
  }
  async function updateField(id: string, patch: Partial<MusicTrackRow>) {
    setTracks(t => t.map(x => x.id === id ? { ...x, ...patch } : x));
    await (supabase.from("career_music_tracks" as any) as any).update(patch).eq("id", id);
  }
  async function deleteTrack(id: string) {
    if (!confirm("¿Eliminar esta canción?")) return;
    setErr(null);
    const { error } = await (supabase.from("career_music_tracks" as any) as any).delete().eq("id", id);
    if (error) { setErr(error.message); return; }
    setTracks(t => t.filter(x => x.id !== id));
  }
  async function uploadAudio(id: string, file: File | undefined) {
    if (!file) return;
    setBusyId(id + "audio"); setErr(null);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const path = `career-music/${id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("team-audios").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage.from("team-audios").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data) throw sErr ?? new Error("No se pudo firmar el audio");
      await updateField(id, { audio_url: data.signedUrl });
    } catch (e) { setErr((e as Error).message); }
    finally { setBusyId(null); }
  }
  async function uploadCover(id: string, file: File | undefined) {
    if (!file) return;
    setBusyId(id + "cover"); setErr(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `career-music-covers/${id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("team-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
      await updateField(id, { cover_url: data.publicUrl });
    } catch (e) { setErr((e as Error).message); }
    finally { setBusyId(null); }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Cargando música...</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-xl">
          Música de fondo del <b>Modo Carrera</b> (no suena en otras pantallas). Se reproduce en orden al azar.
          Cada jugador puede activarla/desactivarla, o silenciar canciones puntuales, desde Personalizar.
        </p>
        <Button onClick={addTrack}>+ Nueva canción</Button>
      </div>
      {err && <div className="text-xs text-destructive">{err}</div>}
      {tracks.length === 0 && (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
          Todavía no hay canciones. Agregá una y subile el audio y la portada.
        </div>
      )}
      <div className="grid gap-3">
        {tracks.map(tr => (
          <div key={tr.id} className="border border-border rounded-lg p-4 flex items-center gap-3">
            {tr.cover_url ? (
              <img src={tr.cover_url} alt="" className="w-14 h-14 rounded object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded bg-muted grid place-items-center shrink-0 text-xs">sin portada</div>
            )}
            <div className="flex-1 grid sm:grid-cols-2 gap-2">
              <Input value={tr.title} onChange={e => updateField(tr.id, { title: e.target.value })} placeholder="Nombre de la canción" />
              <Input value={tr.artist} onChange={e => updateField(tr.id, { artist: e.target.value })} placeholder="Artista" />
            </div>
            <div className="flex flex-col gap-1 shrink-0 text-xs">
              <label className="text-celeste underline cursor-pointer">
                {busyId === tr.id + "audio" ? "Subiendo..." : tr.audio_url ? "Cambiar audio" : "+ Subir audio"}
                <input type="file" accept="audio/*" hidden disabled={busyId === tr.id + "audio"}
                  onChange={e => { uploadAudio(tr.id, e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              <label className="text-celeste underline cursor-pointer">
                {busyId === tr.id + "cover" ? "Subiendo..." : "+ Subir portada"}
                <input type="file" accept="image/*" hidden disabled={busyId === tr.id + "cover"}
                  onChange={e => { uploadCover(tr.id, e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {tr.audio_url && <audio src={tr.audio_url} controls className="h-7 mt-1" />}
            </div>
            <button onClick={() => deleteTrack(tr.id)} className="text-destructive text-xs hover:underline shrink-0">Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EquiposTab() {
  const [editing, setEditing] = useState<Team | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");
  // Primera Nacional por default: mantiene el comportamiento de siempre para
  // quien no toque el selector de división.
  const [division, setDivision] = useState<DivisionId>("primera_nacional");
  const teamsVersion = useTeamsSync();

  const list = useMemo(() => {
    const q = filter.toLowerCase();
    return getTeamsByDivision(division).filter(t => !q || t.name.toLowerCase().includes(q) || t.short.toLowerCase().includes(q));
  }, [filter, division, teamsVersion]);

  return (
    <div>
      {/* Selector de división — Primera Nacional es la única conectada a la base
          hoy; el resto se puede ver pero todavía no editar (ver nota abajo). */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {DIVISION_ORDER.map(d => (
          <button key={d} onClick={() => { setDivision(d); setEditing(null); setCreating(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-display tracking-wide transition ${d === division ? "bg-celeste text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}>
            {COMPETITIONS[d].shortName}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input className="max-w-sm" placeholder="Buscar equipo..." value={filter} onChange={e => setFilter(e.target.value)} />
        <Button onClick={() => { setCreating(true); setEditing(null); }}>+ Nuevo equipo</Button>
      </div>


      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {list.map(t => (
          <button key={t.id} onClick={() => { setEditing(t); setCreating(false); }}
            className="text-left rounded-xl bg-card border border-border p-3 flex items-center gap-3 transition hover:border-celeste">
            <Shield team={t} size={48} />
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg truncate">{t.name}</div>
              <div className="text-xs text-muted-foreground">
                {COMPETITIONS[t.division ?? "primera_nacional"].hasZones ? `Zona ${t.zone} · ` : ""}{t.city}
              </div>
              <div className="text-[10px] text-muted-foreground">VEL {t.stats.speed} · SAL {t.stats.jump} · POT {t.stats.power} · DEF {t.stats.defense}</div>
            </div>
          </button>
        ))}
      </div>

      {(editing || creating) && (
        <TeamEditor
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={async () => { await reloadTeams(); }}
        />
      )}
    </div>
  );
}

const COIMAS_LABELS: { key: keyof CoimasFlags; label: string }[] = [
  { key: "forzar_victoria", label: "Forzar victoria" },
  { key: "forzar_empate", label: "Forzar empate" },
  { key: "forzar_derrota", label: "Forzar derrota" },
  { key: "clasificar_reducido", label: "Clasificar al Reducido" },
  { key: "forzar_ascensos", label: "Forzar ascenso" },
  { key: "forzar_descensos", label: "Forzar descenso rival" },
  { key: "anular_goles", label: "Anular goles rivales" },
  { key: "arbitro_amigo", label: "Árbitro amigo" },
  { key: "penal_inventado", label: "Penal inventado" },
  { key: "expulsar_rival", label: "Expulsar rival" },
  { key: "doping", label: "Doping (boost físico)" },
  { key: "hinchada_comprada", label: "Hinchada comprada" },
  { key: "sponsor_fantasma", label: "Sponsor fantasma (+$)" },
  { key: "gol_fantasma", label: "Gol fantasma" },
  { key: "var_apagado", label: "VAR apagado" },
  { key: "amarilla_rival", label: "Amarilla al rival" },
  { key: "cambio_fixture", label: "Cambiar fixture" },
  { key: "descontar_puntos_rival", label: "Descontar puntos rival" },
  { key: "bonus_presupuesto", label: "Bonus presupuesto" },
];

function AjustesTab() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchGameSettings().then(s => { setSettings(s); setLoaded(true); }).catch(e => { setErr((e as Error).message); setLoaded(true); });
  }, []);

  function set<K extends keyof GameSettings>(k: K, v: GameSettings[K]) {
    setSettings(s => ({ ...s, [k]: v }));
  }
  function toggleFlag(key: keyof CoimasFlags) {
    setSettings(s => ({ ...s, coimas_flags: { ...s.coimas_flags, [key]: !s.coimas_flags[key] } }));
  }

  const introDivisions: { id: DivisionId; label: string }[] = DIVISION_ORDER.map(id => ({ id, label: COMPETITIONS[id].name }));

  async function uploadIntroFile(file: File, division: DivisionId) {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `intro/${division}/season-intro-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("team-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
      setSettings(s => ({ ...s, intro_videos: { ...s.intro_videos, [division]: data.publicUrl } }));
      setMsg(`Intro de ${COMPETITIONS[division].name} subida. Recordá guardar los cambios.`);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function uploadWhistleFile(file: File) {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const path = `whistle/final-whistle-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("team-audios").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage.from("team-audios").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data) throw sErr ?? new Error("No se pudo firmar el audio");
      set("whistle_audio_url", data.signedUrl);
      setMsg("Pitido subido. Recordá guardar los cambios.");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      await saveGameSettings({
        intro_video_url: settings.intro_video_url,
        intro_videos: settings.intro_videos,
        whistle_audio_url: settings.whistle_audio_url,
        coimas_enabled: settings.coimas_enabled,
        coimas_flags: settings.coimas_flags,
        anular_goles_ratio: settings.anular_goles_ratio,
      });
      setMsg("Ajustes guardados ✔");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!loaded) return <div className="text-muted-foreground">Cargando ajustes…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Intro de temporada por división */}
      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="font-display text-xl mb-1">🎬 Intro de temporada</h2>
        <p className="text-xs text-muted-foreground mb-4">Configurá una intro independiente para cada división. La carrera usa automáticamente la intro correspondiente a la categoría elegida.</p>
        <div className="grid md:grid-cols-2 gap-4">
          {introDivisions.map(({ id, label }) => {
            const url = settings.intro_videos[id] ?? null;
            return (
              <div key={id} className="rounded-xl border border-border p-4 space-y-2">
                <div>
                  <div className="font-display text-base">{label}</div>
                  <div className="text-[11px] text-muted-foreground">Intro exclusiva de esta división</div>
                </div>
                <Input value={url ?? ""} onChange={e => setSettings(x => ({ ...x, intro_videos: { ...x.intro_videos, [id]: e.target.value || null } }))} placeholder="https://..." />
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs text-celeste underline inline-block cursor-pointer">
                    Subir video desde PC
                    <input type="file" accept="video/*" hidden disabled={busy}
                      onChange={e => e.target.files?.[0] && uploadIntroFile(e.target.files[0], id)} />
                  </label>
                  {url && (
                    <button onClick={() => setSettings(x => ({ ...x, intro_videos: { ...x.intro_videos, [id]: null } }))} className="text-xs text-destructive hover:underline">Quitar</button>
                  )}
                </div>
                {url && <video src={url} controls className="w-full max-h-40 rounded-lg border border-border mt-2" />}
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-lg bg-secondary/30 border border-border p-3 text-xs text-muted-foreground">La intro antigua global se mantiene solamente por compatibilidad. Para el Modo Carrera se prioriza siempre la intro específica de la división.</div>
      </section>

      {/* Pitido final */}
      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="font-display text-xl mb-1">🟡 Pitido final del árbitro</h2>
        <p className="text-xs text-muted-foreground mb-3">Sonido que se escucha al terminar cada partido, justo antes de que aparezca la pantalla de resultado. Si está vacío, no suena nada (queda como antes).</p>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase">URL del audio (MP3/WAV)</label>
          <Input value={settings.whistle_audio_url ?? ""} onChange={e => set("whistle_audio_url", e.target.value || null)} placeholder="https://..." />
          <div className="flex items-center gap-3">
            <label className="text-xs text-celeste underline inline-block cursor-pointer">
              o subir archivo desde tu PC
              <input type="file" accept="audio/*" hidden
                onChange={e => e.target.files?.[0] && uploadWhistleFile(e.target.files[0])} />
            </label>
            {settings.whistle_audio_url && (
              <button onClick={() => set("whistle_audio_url", null)} className="text-xs text-destructive hover:underline">Quitar audio</button>
            )}
          </div>
          {settings.whistle_audio_url && (
            <audio src={settings.whistle_audio_url} controls className="w-full mt-2" />
          )}
        </div>
      </section>

      {/* Coimas & arreglos */}
      <section className="rounded-2xl bg-card border border-yellow-500/40 p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-xl text-yellow-500">💼 Coimas & Arreglos</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.coimas_enabled} onChange={e => set("coimas_enabled", e.target.checked)} />
            Habilitar sistema
          </label>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Cuando está desactivado el menú no aparece en Carrera/Torneo. Cuando está activo, sólo se muestran las opciones marcadas.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {COIMAS_LABELS.map(({ key, label }) => (
            <label key={key} className={`flex items-center gap-2 p-2 rounded border border-border text-sm ${!settings.coimas_enabled ? "opacity-40" : ""}`}>
              <input type="checkbox" disabled={!settings.coimas_enabled}
                checked={!!settings.coimas_flags[key]}
                onChange={() => toggleFlag(key)} />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-3">
          <label className="text-xs text-muted-foreground uppercase">Anular goles rivales — ratio (1 de cada X)</label>
          <Input type="number" min={2} max={10} value={settings.anular_goles_ratio}
            onChange={e => set("anular_goles_ratio", Math.max(2, Number(e.target.value) || 3))} className="max-w-[120px]" />
        </div>
      </section>

      {(msg || err) && (
        <div className={`text-sm ${err ? "text-destructive" : "text-celeste"}`}>{err ?? msg}</div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar ajustes"}</Button>
      </div>
    </div>
  );
}


function TeamEditor({ initial, onClose, onSaved }: {
  initial: Team | null; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const isNew = !initial;
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    short: initial?.short ?? "",
    city: initial?.city ?? "",
    division: (initial?.division ?? "primera_nacional") as DivisionId,
    zone: (initial?.zone ?? "A") as string,
    primary_color: initial?.primary ?? "#1a55a6",
    secondary_color: initial?.secondary ?? "#ffffff",
    stripe: (initial?.stripe ?? "solid") as string,
    speed: initial?.stats.speed ?? 70,
    jump: initial?.stats.jump ?? 70,
    power: initial?.stats.power ?? 70,
    defense: initial?.stats.defense ?? 70,
    logo_url: initial?.logoUrl ?? "",
    flag_urls: (initial?.flagUrls ?? []) as string[],
    goal_audio_urls: (initial?.goalAudios ?? []) as string[],
    hinchada_urls: (initial?.hinchadas ?? []) as string[],
    narrators: (initial?.narrators ?? []) as Narrator[],
    full_name: initial?.fullName ?? "",
    founded_year: initial?.foundedYear ?? ("" as number | ""),
    province: initial?.province ?? "",
    nickname: initial?.nickname ?? "",
    rival_id: initial?.rivalId ?? "",
    primera_seasons: initial?.primeraSeasons ?? ("" as number | ""),
    achievements: initial?.achievements ?? "",
    history: initial?.history ?? "",
    regional_region: initial?.regionalRegion ?? "",
    regional_group: initial?.regionalGroup ?? initial?.zone ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    setBusy(true); setErr(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const safeId = (form.id || "new").toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const path = `teams/${safeId}/logo.${ext}`;
      const { error } = await supabase.storage.from("team-logos").upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
      setForm(f => ({ ...f, logo_url: data.publicUrl }));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function uploadFlags(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true); setErr(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "png";
        const path = `banderas/${form.id || "new"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error } = await supabase.storage.from("team-logos").upload(path, file, { upsert: true });
        if (error) throw error;
        urls.push(supabase.storage.from("team-logos").getPublicUrl(path).data.publicUrl);
      }
      setForm(f => ({ ...f, flag_urls: [...f.flag_urls, ...urls] }));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function uploadOne(file: File, sub: string): Promise<string> {
    const ext = file.name.split(".").pop() || "mp3";
    const path = `${form.id || "new"}/${sub}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("team-audios").upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data, error: sErr } = await supabase.storage.from("team-audios").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr || !data) throw sErr ?? new Error("No se pudo firmar el audio");
    return data.signedUrl;
  }

  async function uploadAudios(files: FileList | null, field: "goal_audio_urls" | "hinchada_urls") {
    if (!files || files.length === 0) return;
    setBusy(true); setErr(null);
    try {
      const sub = field === "goal_audio_urls" ? "goles" : "hinchada";
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadOne(f, sub));
      setForm(f => ({ ...f, [field]: [...f[field], ...urls] }));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  function removeAudio(idx: number, field: "goal_audio_urls" | "hinchada_urls") {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  }

  // ===== Narradores (relatores) =====
  function addNarrator() {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setForm(f => ({ ...f, narrators: [...f.narrators, { id, name: "Nuevo relator", urls: [] }] }));
  }
  function updateNarrator(id: string, patch: Partial<Narrator>) {
    setForm(f => ({ ...f, narrators: f.narrators.map(n => n.id === id ? { ...n, ...patch } : n) }));
  }
  function removeNarrator(id: string) {
    setForm(f => ({ ...f, narrators: f.narrators.filter(n => n.id !== id) }));
  }
  async function uploadNarratorAudios(narratorId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true); setErr(null);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadOne(f, `relatores/${narratorId}`));
      setForm(f => ({
        ...f,
        narrators: f.narrators.map(n => n.id === narratorId ? { ...n, urls: [...n.urls, ...urls] } : n),
      }));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  function removeNarratorAudio(narratorId: string, idx: number) {
    setForm(f => ({
      ...f,
      narrators: f.narrators.map(n => n.id === narratorId ? { ...n, urls: n.urls.filter((_, i) => i !== idx) } : n),
    }));
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      if (!form.id || !form.name || !form.short) throw new Error("ID, nombre y abreviatura son obligatorios");
      const payload: any = {
        ...form,
        division: form.division,
        logo_url: form.logo_url || null,
        full_name: form.full_name || null,
        founded_year: form.founded_year === "" ? null : Number(form.founded_year),
        province: form.province || null,
        nickname: form.nickname || null,
        rival_id: form.rival_id || null,
        primera_seasons: form.primera_seasons === "" ? null : Number(form.primera_seasons),
        achievements: form.achievements || null,
        history: form.history || null,
        regional_region: form.division === "regional_federal_amateur" ? (form.regional_region || null) : null,
        regional_group: form.division === "regional_federal_amateur" ? (form.regional_group || null) : null,
      };
      if (isNew) {
        payload.rivals = [];
        payload.sort_order = getTeamsByDivision(form.division).length;
        const { data, error } = await supabase.from("teams").insert(payload).select("id").single();
        if (error) throw error;
        if (!data?.id) throw new Error("No se pudo guardar el equipo en Supabase");
      } else {
        delete payload.id;
        delete payload.sort_order;
        const { data, error } = await supabase.from("teams").update(payload).eq("id", form.id).select("id").maybeSingle();
        if (error) throw error;
        if (!data?.id) throw new Error("El equipo no existe en Supabase y no pudo actualizarse. Ejecutá la migración de Regional Amateur.");
      }
      await onSaved();
      onClose();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!initial) return;
    if (!confirm(`¿Eliminar ${initial.name}?`)) return;
    setBusy(true);
    const { error } = await supabase.from("teams").delete().eq("id", initial.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    await onSaved();
    onClose();
  }

  const num = (k: keyof typeof form) => (
    <div>
      <label className="text-xs text-muted-foreground uppercase">{k}</label>
      <Input type="number" value={form[k] as number}
        onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 z-50 grid place-items-center p-4 overflow-auto" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">{isNew ? "Nuevo equipo" : `Editar: ${initial!.name}`}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 flex items-center gap-3">
            {form.logo_url
              ? <img src={form.logo_url} className="w-16 h-16 object-contain" />
              : <div className="w-16 h-16 rounded bg-muted grid place-items-center text-xs">sin escudo</div>}
            <div className="flex-1">
              <Input placeholder="URL del escudo (Wikimedia, etc.)" value={form.logo_url}
                onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
              <label className="text-xs text-celeste underline mt-1 inline-block cursor-pointer">
                o subir desde tu PC
                <input type="file" accept="image/*" hidden
                  onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              </label>
            </div>
          </div>

          <div className="sm:col-span-2 border-t border-border pt-3">
            <label className="text-xs text-muted-foreground uppercase">Banderas de la hinchada (se muestran en "La previa" del Modo Carrera)</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.flag_urls.length === 0 && <div className="text-xs text-muted-foreground">Sin banderas cargadas.</div>}
              {form.flag_urls.map((url, i) => (
                <div key={url + i} className="relative">
                  <img src={url} alt="Bandera de hinchada" className="h-16 w-24 object-cover rounded border border-border" />
                  <button onClick={() => setForm(f => ({ ...f, flag_urls: f.flag_urls.filter((_, j) => j !== i) }))}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs leading-none">×</button>
                </div>
              ))}
            </div>
            <label className="text-xs text-celeste underline mt-2 inline-block cursor-pointer">
              + subir banderas (podés seleccionar varias)
              <input type="file" accept="image/*" hidden multiple
                onChange={e => { uploadFlags(e.target.files); e.target.value = ""; }} />
            </label>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase">División</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3" value={form.division}
              onChange={e => setForm(f => ({ ...f, division: e.target.value as DivisionId }))}>
              {DIVISION_ORDER.map(d => <option key={d} value={d}>{COMPETITIONS[d].name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase">ID</label>
            <Input value={form.id} disabled={!isNew}
              onChange={e => setForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase">Abreviatura</label>
            <Input value={form.short} onChange={e => setForm(f => ({ ...f, short: e.target.value.toUpperCase() }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground uppercase">Nombre</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase">Ciudad</label>
            <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          {form.division !== "regional_federal_amateur" && COMPETITIONS[form.division].hasZones && (
            <div>
              <label className="text-xs text-muted-foreground uppercase">Zona</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3"
                value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}>
                {COMPETITIONS[form.division].zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          )}
          {form.division === "regional_federal_amateur" && (
            <>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Región</label>
                <Input value={form.regional_region} onChange={e => setForm(f => ({ ...f, regional_region: e.target.value }))} placeholder="Norte, Cuyo, Patagonia…" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Grupo</label>
                <Input value={form.regional_group} onChange={e => setForm(f => ({ ...f, regional_group: e.target.value }))} placeholder="1, 2, 3…" />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-muted-foreground uppercase">Color primario</label>
            <Input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase">Color secundario</label>
            <Input type="color" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground uppercase">Banda</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3"
              value={form.stripe} onChange={e => setForm(f => ({ ...f, stripe: e.target.value }))}>
              <option value="solid">solid</option><option value="vertical">vertical</option>
              <option value="horizontal">horizontal</option><option value="sash">sash</option>
            </select>
          </div>

          {num("speed")}{num("jump")}{num("power")}{num("defense")}

          <div className="sm:col-span-2 border-t border-border pt-3 mt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground uppercase">Relatores (un relator por estilo; el usuario elige cuál usar en el partido)</label>
              <button onClick={addNarrator} className="text-xs text-celeste underline">+ agregar relator</button>
            </div>
            <div className="space-y-3 mt-2">
              {form.narrators.length === 0 && (
                <div className="text-xs text-muted-foreground">Sin relatores. Agregá uno (ej: "Relator Bricco") y subí sus audios.</div>
              )}
              {form.narrators.map(n => (
                <div key={n.id} className="rounded border border-border p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={n.name} onChange={e => updateNarrator(n.id, { name: e.target.value })}
                      placeholder="Nombre del relator (ej: Relator Bricco)" className="flex-1" />
                    <button onClick={() => removeNarrator(n.id)} className="text-destructive text-xs hover:underline">Eliminar relator</button>
                  </div>
                  {n.urls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted/40 rounded p-2">
                      <audio src={url} controls className="flex-1 h-8" />
                      <button onClick={() => removeNarratorAudio(n.id, i)} className="text-destructive text-xs hover:underline">Quitar</button>
                    </div>
                  ))}
                  <label className="text-xs text-celeste underline inline-block cursor-pointer">
                    + subir audios (podés seleccionar varios)
                    <input type="file" accept="audio/*" hidden multiple
                      onChange={e => { uploadNarratorAudios(n.id, e.target.files); e.target.value = ""; }} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2 border-t border-border pt-3 mt-2">
            <label className="text-xs text-muted-foreground uppercase">Audios de gol sueltos (legacy — usar si no hay relatores arriba)</label>
            <div className="space-y-2 mt-2">
              {form.goal_audio_urls.map((url, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/40 rounded p-2">
                  <audio src={url} controls className="flex-1 h-8" />
                  <button onClick={() => removeAudio(i, "goal_audio_urls")} className="text-destructive text-xs hover:underline">Quitar</button>
                </div>
              ))}
              <label className="text-xs text-celeste underline inline-block cursor-pointer">
                + subir audios de gol
                <input type="file" accept="audio/*" hidden multiple
                  onChange={e => { uploadAudios(e.target.files, "goal_audio_urls"); e.target.value = ""; }} />
              </label>
            </div>
          </div>

          <div className="sm:col-span-2 border-t border-border pt-3 mt-2">
            <label className="text-xs text-muted-foreground uppercase">Hinchada / música del equipo (se reproduce al azar durante el partido)</label>
            <div className="space-y-2 mt-2">
              {form.hinchada_urls.length === 0 && (
                <div className="text-xs text-muted-foreground">Sin temas. Subí canciones/cánticos para que suenen cuando este equipo tenga su tramo.</div>
              )}
              {form.hinchada_urls.map((url, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/40 rounded p-2">
                  <audio src={url} controls className="flex-1 h-8" />
                  <button onClick={() => removeAudio(i, "hinchada_urls")} className="text-destructive text-xs hover:underline">Quitar</button>
                </div>
              ))}
              <label className="text-xs text-celeste underline inline-block cursor-pointer">
                + subir temas (podés seleccionar varios)
                <input type="file" accept="audio/*" hidden multiple
                  onChange={e => { uploadAudios(e.target.files, "hinchada_urls"); e.target.value = ""; }} />
              </label>
          </div>

          <div className="sm:col-span-2 border-t border-border pt-3 mt-2 space-y-2">
            <label className="text-xs text-muted-foreground uppercase">Ficha del club (visible en /equipos)</label>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase">Nombre completo</label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Año de fundación</label>
                <Input type="number" value={form.founded_year} onChange={e => setForm(f => ({ ...f, founded_year: e.target.value === "" ? "" : Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Provincia</label>
                <Input value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Apodo</label>
                <Input value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Rival histórico</label>
                <select className="w-full h-9 rounded-md border border-input bg-transparent px-3"
                  value={form.rival_id} onChange={e => setForm(f => ({ ...f, rival_id: e.target.value }))}>
                  <option value="">— sin rival —</option>
                  {getTeamsByDivision(form.division).filter(t => t.id !== form.id).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Temporadas en Primera</label>
                <Input type="number" value={form.primera_seasons} onChange={e => setForm(f => ({ ...f, primera_seasons: e.target.value === "" ? "" : Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase">Logros destacados</label>
              <Textarea rows={3} value={form.achievements} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))}
                placeholder="Ej: Campeón Primera B 1994, Ascenso a Primera 2010..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase">Historia</label>
              <Textarea rows={6} value={form.history} onChange={e => setForm(f => ({ ...f, history: e.target.value }))}
                placeholder="Historia libre del club..." />
            </div>
          </div>

          {!isNew && (
            <div className="sm:col-span-2 border-t border-border pt-3 mt-2">
              <label className="text-xs text-muted-foreground uppercase">Plantel y estadio</label>
              <div className="mt-2"><SquadStadiumEditor teamId={form.id} /></div>
            </div>
          )}
        </div>
        </div>


        {err && <div className="text-sm text-destructive mt-3">{err}</div>}

        <div className="flex gap-2 mt-5 justify-end">
          {!isNew && <Button variant="destructive" onClick={remove} disabled={busy}>Eliminar</Button>}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : "Guardar"}</Button>
        </div>
      </div>
    </div>
  );
}
