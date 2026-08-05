import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSponsors, saveSponsor, deleteSponsor, money, type Sponsor } from "@/lib/sponsors";

const EMPTY: Partial<Sponsor> = {
  name: "", slogan: "", logo_url: null, color: "#22c55e", prestige: 3,
  initial_payment: 10000000, weekly_payment: 400000, bonus_payment: 2500000,
  duration_seasons: 1, objectives: [], conditions: "", featured: false, active: true, sort_order: 0,
};

export function SponsorsAdmin() {
  const { sponsors, loading, reload } = useSponsors(false);
  const [form, setForm] = useState<Partial<Sponsor> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function set<K extends keyof Sponsor>(k: K, v: Sponsor[K]) {
    setForm(f => ({ ...(f ?? EMPTY), [k]: v }));
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const path = `sponsors/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("team-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
      set("logo_url", data.publicUrl);
    } catch (e) {
      alert("No se pudo subir el logo: " + (e as Error).message);
    } finally { setUploading(false); }
  }

  async function submit() {
    if (!form?.name) { alert("Poné un nombre."); return; }
    setSaving(true);
    try { await saveSponsor(form); setForm(null); await reload(); }
    catch (e) { alert("Error al guardar: " + (e as Error).message); }
    finally { setSaving(false); }
  }

  async function remove(s: Sponsor) {
    if (!confirm(`¿Eliminar el patrocinador "${s.name}"?`)) return;
    try { await deleteSponsor(s.id); await reload(); }
    catch (e) { alert("Error al eliminar: " + (e as Error).message); }
  }

  async function toggleActive(s: Sponsor) {
    await saveSponsor({ ...s, active: !s.active });
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl tracking-wide">🤝 Patrocinadores</h2>
        <button onClick={() => setForm({ ...EMPTY })}
          className="px-4 py-2 rounded-lg bg-celeste text-primary-foreground font-display text-sm">+ Nuevo patrocinador</button>
        {loading && <span className="text-xs text-muted-foreground">Cargando…</span>}
      </div>

      {form && (
        <div className="hud-panel p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Nombre"><input className="adm-input" value={form.name ?? ""} onChange={e => set("name", e.target.value)} /></Field>
            <Field label="Eslogan"><input className="adm-input" value={form.slogan ?? ""} onChange={e => set("slogan", e.target.value)} /></Field>
            <Field label="Logo (URL o subir imagen)">
              <div className="flex gap-2 items-center">
                <input className="adm-input" value={form.logo_url ?? ""} onChange={e => set("logo_url", e.target.value)} placeholder="https://…" />
                <label className="text-xs px-3 py-2 rounded-lg border border-border cursor-pointer whitespace-nowrap">
                  {uploading ? "Subiendo…" : "Subir"}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); }} />
                </label>
              </div>
            </Field>
            <Field label="Color"><input type="color" className="h-10 w-20 rounded bg-transparent" value={form.color ?? "#22c55e"} onChange={e => set("color", e.target.value)} /></Field>
            <Field label="Prestigio (0 a 5)"><input type="number" step="0.5" min={0} max={5} className="adm-input" value={form.prestige ?? 3} onChange={e => set("prestige", Number(e.target.value))} /></Field>
            <Field label="Duración (temporadas)"><input type="number" min={1} className="adm-input" value={form.duration_seasons ?? 1} onChange={e => set("duration_seasons", Number(e.target.value))} /></Field>
            <Field label="Pago inicial"><input type="number" className="adm-input" value={form.initial_payment ?? 0} onChange={e => set("initial_payment", Number(e.target.value))} /></Field>
            <Field label="Pago semanal"><input type="number" className="adm-input" value={form.weekly_payment ?? 0} onChange={e => set("weekly_payment", Number(e.target.value))} /></Field>
            <Field label="Bono por objetivos"><input type="number" className="adm-input" value={form.bonus_payment ?? 0} onChange={e => set("bonus_payment", Number(e.target.value))} /></Field>
            <Field label="Orden"><input type="number" className="adm-input" value={form.sort_order ?? 0} onChange={e => set("sort_order", Number(e.target.value))} /></Field>
            <Field label="Objetivos (uno por línea)">
              <textarea className="adm-input min-h-24" value={(form.objectives ?? []).join("\n")}
                onChange={e => set("objectives", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} />
            </Field>
            <Field label="Condiciones especiales">
              <textarea className="adm-input min-h-24" value={form.conditions ?? ""} onChange={e => set("conditions", e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.featured} onChange={e => set("featured", e.target.checked)} /> Destacado</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active !== false} onChange={e => set("active", e.target.checked)} /> Activo</label>
            <button onClick={submit} disabled={saving}
              className="ml-auto px-5 py-2 rounded-lg bg-hud-green text-background font-display disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sponsors.map(s => (
          <div key={s.id} className="hud-card p-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl border border-border/60 overflow-hidden"
                style={{ background: `linear-gradient(150deg, ${s.color}33, transparent)` }}>
                {s.logo_url ? <img src={s.logo_url} alt={`Logo de ${s.name}`} className="h-full w-full object-contain p-1" />
                  : <span className="font-display" style={{ color: s.color }}>{s.name.slice(0, 2).toUpperCase()}</span>}
              </span>
              <div className="min-w-0">
                <div className="font-display text-lg truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground truncate">{s.slogan}</div>
              </div>
              {s.featured && <span className="ml-auto text-[10px] font-display text-gold">★ DESTACADO</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              {money(s.initial_payment)} inicial · {money(s.weekly_payment)} semanal · Prestigio {s.prestige}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setForm(s)} className="text-xs px-3 py-1.5 rounded bg-secondary">Editar</button>
              <button onClick={() => toggleActive(s)} className="text-xs px-3 py-1.5 rounded border border-border">
                {s.active ? "Desactivar" : "Activar"}
              </button>
              <button onClick={() => remove(s)} className="text-xs px-3 py-1.5 rounded text-destructive border border-destructive/50">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
