import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Shield } from "@/components/Shield";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TEAMS, type Team, type Narrator } from "@/data/teams";
import { useTeamsSync, reloadTeams, syncTeamsFromDbRows, type DbTeam } from "@/lib/teams-sync";
import { SquadStadiumEditor } from "@/components/SquadStadiumEditor";
import { fetchGameSettings, saveGameSettings, type CoimasFlags, type GameSettings, DEFAULT_SETTINGS } from "@/lib/game-settings";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Primera Heads" }] }),
  component: AdminPage,
});

type Tab = "equipos" | "ajustes";

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
        {tab === "ajustes" && <AjustesTab />}
      </main>
    </div>
  );
}

function EquiposTab() {
  const [editing, setEditing] = useState<Team | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");

  const list = useMemo(() => {
    const q = filter.toLowerCase();
    return TEAMS.filter(t => !q || t.name.toLowerCase().includes(q) || t.short.toLowerCase().includes(q));
  }, [filter, TEAMS.length]);

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <Input className="max-w-sm" placeholder="Buscar equipo..." value={filter} onChange={e => setFilter(e.target.value)} />
        <Button onClick={() => { setCreating(true); setEditing(null); }}>+ Nuevo equipo</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {list.map(t => (
          <button key={t.id} onClick={() => { setEditing(t); setCreating(false); }}
            className="text-left rounded-xl bg-card border border-border p-3 flex items-center gap-3 hover:border-celeste transition">
            <Shield team={t} size={48} />
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg truncate">{t.name}</div>
              <div className="text-xs text-muted-foreground">Zona {t.zone} · {t.city}</div>
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

  async function uploadIntroFile(file: File) {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `intro/season-intro-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("team-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
      set("intro_video_url", data.publicUrl);
      setMsg("Video subido. Recordá guardar los cambios.");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      await saveGameSettings({
        intro_video_url: settings.intro_video_url,
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
      {/* Intro de temporada */}
      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="font-display text-xl mb-1">🎬 Intro de temporada</h2>
        <p className="text-xs text-muted-foreground mb-3">Video opcional que se reproduce al iniciar cada temporada. Si está vacío, se usa la intro animada por defecto.</p>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase">URL del video (MP4/WebM)</label>
          <Input value={settings.intro_video_url ?? ""} onChange={e => set("intro_video_url", e.target.value || null)} placeholder="https://..." />
          <div className="flex items-center gap-3">
            <label className="text-xs text-celeste underline inline-block cursor-pointer">
              o subir archivo desde tu PC
              <input type="file" accept="video/*" hidden
                onChange={e => e.target.files?.[0] && uploadIntroFile(e.target.files[0])} />
            </label>
            {settings.intro_video_url && (
              <button onClick={() => set("intro_video_url", null)} className="text-xs text-destructive hover:underline">Quitar video</button>
            )}
          </div>
          {settings.intro_video_url && (
            <video src={settings.intro_video_url} controls className="w-full max-h-64 rounded-lg border border-border mt-2" />
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
    zone: (initial?.zone ?? "A") as "A" | "B",
    primary_color: initial?.primary ?? "#1a55a6",
    secondary_color: initial?.secondary ?? "#ffffff",
    stripe: (initial?.stripe ?? "solid") as string,
    speed: initial?.stats.speed ?? 70,
    jump: initial?.stats.jump ?? 70,
    power: initial?.stats.power ?? 70,
    defense: initial?.stats.defense ?? 70,
    logo_url: initial?.logoUrl ?? "",
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
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    setBusy(true); setErr(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${form.id || "new"}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("team-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
      setForm(f => ({ ...f, logo_url: data.publicUrl }));
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
      const payload = {
        ...form,
        logo_url: form.logo_url || null,
        full_name: form.full_name || null,
        founded_year: form.founded_year === "" ? null : Number(form.founded_year),
        province: form.province || null,
        nickname: form.nickname || null,
        rival_id: form.rival_id || null,
        primera_seasons: form.primera_seasons === "" ? null : Number(form.primera_seasons),
        achievements: form.achievements || null,
        history: form.history || null,
      } as any;
      const { error } = isNew
        ? await supabase.from("teams").insert(payload)
        : await supabase.from("teams").update(payload).eq("id", form.id);
      if (error) throw error;
      const nextRow: DbTeam = {
        ...payload,
        zone: payload.zone,
        logo_url: payload.logo_url,
        rivals: initial?.rivals ?? [],
        sort_order: isNew ? 999 : TEAMS.findIndex(t => t.id === form.id),
        goal_audio_urls: payload.goal_audio_urls,
        hinchada_urls: payload.hinchada_urls,
        narrators: payload.narrators ?? [],
      };
      const withoutOld = TEAMS.filter(t => t.id !== form.id).map((t, i): DbTeam => ({
        id: t.id,
        name: t.name,
        short: t.short,
        city: t.city,
        zone: t.zone,
        primary_color: t.primary,
        secondary_color: t.secondary,
        stripe: t.stripe ?? "solid",
        speed: t.stats.speed,
        jump: t.stats.jump,
        power: t.stats.power,
        defense: t.stats.defense,
        logo_url: t.logoUrl ?? null,
        rivals: t.rivals ?? [],
        sort_order: i,
        goal_audio_urls: t.goalAudios ?? [],
        hinchada_urls: t.hinchadas ?? [],
        narrators: t.narrators ?? [],
        full_name: t.fullName ?? null,
        founded_year: t.foundedYear ?? null,
        province: t.province ?? null,
        nickname: t.nickname ?? null,
        rival_id: t.rivalId ?? null,
        primera_seasons: t.primeraSeasons ?? null,
        achievements: t.achievements ?? null,
        history: t.history ?? null,
      }));
      syncTeamsFromDbRows([...withoutOld, nextRow].sort((a, b) => a.sort_order - b.sort_order));
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
          <div>
            <label className="text-xs text-muted-foreground uppercase">Zona</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3"
              value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value as "A" | "B" }))}>
              <option value="A">A</option><option value="B">B</option>
            </select>
          </div>
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
                  {TEAMS.filter(t => t.id !== form.id).map(t => (
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
