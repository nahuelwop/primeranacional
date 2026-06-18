import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchPlayers, fetchStadium, upsertStadium, insertPlayer, insertPlayers,
  updatePlayer, deletePlayer, parseSquad,
  POSITION_LABEL, type Player, type Stadium, type Position,
} from "@/lib/squads";

const POSITIONS: Position[] = ["arquero", "defensa", "medio", "delantero"];

export function SquadStadiumEditor({ teamId }: { teamId: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stadium, setStadium] = useState<Stadium>({
    team_id: teamId, name: "", capacity: null, founded: null, city: "", address: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  async function reload() {
    setLoading(true);
    try {
      const [ps, st] = await Promise.all([fetchPlayers(teamId), fetchStadium(teamId)]);
      setPlayers(ps);
      if (st) setStadium(st);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [teamId]);

  async function saveStadium() {
    setBusy(true); setErr(null);
    try { await upsertStadium(stadium); } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function addPlayer(position: Position) {
    setBusy(true); setErr(null);
    try {
      const sort = players.filter(p => p.position === position).length;
      await insertPlayer({ team_id: teamId, name: "Nuevo jugador", position, shirt_number: null, birth_date: null, height_cm: null, sort_order: sort });
      await reload();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function patchPlayer(p: Player, patch: Partial<Player>) {
    setPlayers(ps => ps.map(x => x.id === p.id ? { ...x, ...patch } : x));
    try { await updatePlayer(p.id, patch); } catch (e) { setErr((e as Error).message); }
  }

  async function removePlayer(p: Player) {
    if (!confirm(`¿Eliminar a ${p.name}?`)) return;
    try { await deletePlayer(p.id); setPlayers(ps => ps.filter(x => x.id !== p.id)); }
    catch (e) { setErr((e as Error).message); }
  }

  async function importBulk() {
    const rows = parseSquad(bulkText, teamId);
    if (!rows.length) { setErr("No se detectaron jugadores. Asegurate de incluir los encabezados Arqueros/Defensores/Mediocampistas/Delanteros."); return; }
    setBusy(true); setErr(null);
    try {
      await insertPlayers(rows);
      setBulkText(""); setBulkOpen(false);
      await reload();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="text-xs text-muted-foreground">Cargando plantel...</div>;

  return (
    <div className="space-y-4">
      {/* Estadio */}
      <div className="rounded border border-border p-3 space-y-2">
        <div className="font-display text-sm uppercase">Estadio</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <div><label className="text-[10px] text-muted-foreground uppercase">Nombre</label>
            <Input value={stadium.name} onChange={e => setStadium(s => ({ ...s, name: e.target.value }))} /></div>
          <div><label className="text-[10px] text-muted-foreground uppercase">Capacidad</label>
            <Input type="number" value={stadium.capacity ?? ""} onChange={e => setStadium(s => ({ ...s, capacity: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><label className="text-[10px] text-muted-foreground uppercase">Fundación (año)</label>
            <Input type="number" value={stadium.founded ?? ""} onChange={e => setStadium(s => ({ ...s, founded: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><label className="text-[10px] text-muted-foreground uppercase">Ciudad</label>
            <Input value={stadium.city} onChange={e => setStadium(s => ({ ...s, city: e.target.value }))} /></div>
          <div className="sm:col-span-2"><label className="text-[10px] text-muted-foreground uppercase">Dirección</label>
            <Input value={stadium.address} onChange={e => setStadium(s => ({ ...s, address: e.target.value }))} /></div>
        </div>
        <Button size="sm" onClick={saveStadium} disabled={busy}>Guardar estadio</Button>
      </div>

      {/* Plantel */}
      <div className="rounded border border-border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-display text-sm uppercase">Plantel ({players.length})</div>
          <button onClick={() => setBulkOpen(o => !o)} className="text-xs text-celeste underline">
            {bulkOpen ? "× cerrar importador" : "+ importar pegando texto"}
          </button>
        </div>

        {bulkOpen && (
          <div className="rounded bg-muted/40 p-2 space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Pegá un plantel con encabezados <strong>Arqueros / Defensores / Mediocampistas / Delanteros</strong>.
              Cada línea con un nombre se agrega a la posición actual. Se ignoran fechas, alturas y números sueltos.
            </p>
            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
              className="w-full h-40 text-xs rounded border border-input bg-background p-2 font-mono"
              placeholder={"Arqueros\nJuan Pérez\nMartín García\n\nDefensores\n..."} />
            <Button size="sm" onClick={importBulk} disabled={busy || !bulkText.trim()}>Importar</Button>
          </div>
        )}

        {POSITIONS.map(pos => {
          const group = players.filter(p => p.position === pos);
          return (
            <div key={pos}>
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase text-celeste">{POSITION_LABEL[pos]} ({group.length})</div>
                <button onClick={() => addPlayer(pos)} className="text-xs text-celeste underline">+ agregar</button>
              </div>
              <div className="mt-1 space-y-1">
                {group.map(p => (
                  <div key={p.id} className="grid grid-cols-[2fr_60px_120px_60px_auto] gap-1 items-center">
                    <Input value={p.name} onChange={e => patchPlayer(p, { name: e.target.value })} className="h-8" />
                    <Input type="number" placeholder="#" value={p.shirt_number ?? ""}
                      onChange={e => patchPlayer(p, { shirt_number: e.target.value ? Number(e.target.value) : null })} className="h-8" />
                    <Input type="date" value={p.birth_date ?? ""}
                      onChange={e => patchPlayer(p, { birth_date: e.target.value || null })} className="h-8" />
                    <Input type="number" placeholder="cm" value={p.height_cm ?? ""}
                      onChange={e => patchPlayer(p, { height_cm: e.target.value ? Number(e.target.value) : null })} className="h-8" />
                    <button onClick={() => removePlayer(p)} className="text-destructive text-xs hover:underline">×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {err && <div className="text-sm text-destructive">{err}</div>}
    </div>
  );
}
