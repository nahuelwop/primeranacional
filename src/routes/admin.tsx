import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "@/components/Shield";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TEAMS, type Team } from "@/data/teams";
import { useTeamsSync, reloadTeams, syncTeamsFromDbRows, type DbTeam } from "@/lib/teams-sync";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Primera Heads" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  useTeamsSync();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) nav({ to: "/auth" });
  }, [loading, user, isAdmin, nav]);

  const [editing, setEditing] = useState<Team | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");

  const list = useMemo(() => {
    const q = filter.toLowerCase();
    return TEAMS.filter(t => !q || t.name.toLowerCase().includes(q) || t.short.toLowerCase().includes(q));
  }, [filter, TEAMS.length]);

  if (loading) return <div className="p-10">Cargando...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-5xl">PANEL ADMIN</h1>
            <p className="text-muted-foreground text-sm">Editá escudos, estadísticas y equipos. Los cambios se ven en todos los usuarios.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="text-sm underline self-center">← Volver</Link>
            <Button onClick={() => { setCreating(true); setEditing(null); }}>+ Nuevo equipo</Button>
          </div>
        </div>

        <Input className="mt-4 max-w-sm" placeholder="Buscar..." value={filter} onChange={e => setFilter(e.target.value)} />

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
      </main>
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

  async function uploadAudio(file: File) {
    setBusy(true); setErr(null);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const path = `${form.id || "new"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("team-audios").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      // signed URL (10 años) — bucket privado
      const { data, error: sErr } = await supabase.storage.from("team-audios").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data) throw sErr ?? new Error("No se pudo firmar el audio");
      setForm(f => ({ ...f, goal_audio_urls: [...f.goal_audio_urls, data.signedUrl] }));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  function removeAudio(idx: number) {
    setForm(f => ({ ...f, goal_audio_urls: f.goal_audio_urls.filter((_, i) => i !== idx) }));
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      if (!form.id || !form.name || !form.short) throw new Error("ID, nombre y abreviatura son obligatorios");
      const payload = { ...form, logo_url: form.logo_url || null };
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
            <label className="text-xs text-muted-foreground uppercase">Audios de gol (se elige uno al azar)</label>
            <div className="space-y-2 mt-2">
              {form.goal_audio_urls.length === 0 && (
                <div className="text-xs text-muted-foreground">Sin audios. Subí mp3/ogg/wav para que se reproduzcan cuando este equipo convierta.</div>
              )}
              {form.goal_audio_urls.map((url, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/40 rounded p-2">
                  <audio src={url} controls className="flex-1 h-8" />
                  <button onClick={() => removeAudio(i)} className="text-destructive text-xs hover:underline">Quitar</button>
                </div>
              ))}
              <label className="text-xs text-celeste underline inline-block cursor-pointer">
                + subir audio
                <input type="file" accept="audio/*" hidden
                  onChange={e => e.target.files?.[0] && uploadAudio(e.target.files[0])} />
              </label>
            </div>
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
