import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield, Jersey } from "@/components/Shield";
import { useTeamsSync } from "@/lib/teams-sync";
import { getTeamsByDivision, getTeamsByZone, getZonesByDivision, getRegionalTeamMeta } from "@/data/teams-catalog";
import { COMPETITIONS, DIVISION_ORDER, type DivisionId } from "@/data/competitions";

export const Route = createFileRoute("/equipos/")({
  head: () => ({ meta: [{ title: "Equipos · Primera Heads" }, { name: "description", content: "Clubes del fútbol argentino organizados por división y zona." }] }),
  component: EquiposPage,
});

const REGIONAL_REGIONS = ["Norte", "Litoral Norte", "Litoral Sur", "Centro", "Cuyo", "Pampeana Norte", "Pampeana Sur", "Patagonia"];

function EquiposPage() {
  useTeamsSync();
  const [selectedDivision, setSelectedDivision] = useState<DivisionId>("primera_nacional");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const competition = COMPETITIONS[selectedDivision];

  const zones = useMemo(() => getZonesByDivision(selectedDivision), [selectedDivision]);

  const teams = useMemo(() => {
    if (selectedDivision === "regional_federal_amateur") {
      return selectedZone ? getTeamsByZone(selectedDivision, selectedZone) : [];
    }
    return zones.length > 0 && selectedZone ? getTeamsByZone(selectedDivision, selectedZone) : zones.length > 0 ? [] : getTeamsByDivision(selectedDivision);
  }, [selectedDivision, selectedZone, zones]);

  function handleDivisionChange(division: DivisionId) {
    setSelectedDivision(division);
    const next = getZonesByDivision(division);
    setSelectedZone(next.length ? next[0] : null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] text-celeste uppercase">PRIMERA HEADS</p>
            <h1 className="font-display text-5xl sm:text-6xl leading-none">EQUIPOS</h1>
            <p className="text-muted-foreground text-sm mt-2">Seleccioná una división para explorar sus clubes.</p>
          </div>
          <div className="hidden sm:block text-right"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Competición</div><div className="font-display text-xl text-celeste">{competition.shortName}</div></div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3"><h2 className="font-display text-2xl">DIVISIÓN</h2><span className="text-[10px] uppercase tracking-widest text-muted-foreground">{DIVISION_ORDER.indexOf(selectedDivision)+1}/{DIVISION_ORDER.length}</span></div>
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
            {DIVISION_ORDER.map(d => { const item=COMPETITIONS[d], active=d===selectedDivision, count=getTeamsByDivision(d).length; return (
              <button key={d} type="button" onClick={()=>handleDivisionChange(d)} className={`group relative shrink-0 w-[230px] sm:w-[270px] rounded-xl border p-4 text-left transition-all duration-200 ${active?"border-celeste bg-celeste/10 shadow-[0_0_24px_rgba(126,200,255,0.12)]":"border-border bg-card hover:border-celeste/50"}`}>
                <div className={`absolute left-0 top-0 h-1 w-full rounded-t-xl ${active?"bg-celeste":"bg-transparent"}`} />
                <div className="flex items-start justify-between gap-3"><div><div className={`font-display text-xl leading-none ${active?"text-celeste":""}`}>{item.name}</div><div className="text-[11px] text-muted-foreground mt-2 uppercase tracking-wide">{item.hasZones ? `${item.zones.length} zonas/regiones` : "Tabla general"}</div></div><div className="font-display text-2xl text-muted-foreground/60">{count}</div></div>
              </button>
            ); })}
          </div>
        </section>

        {selectedDivision === "regional_federal_amateur" ? (
          <RegionalView selectedZone={selectedZone} setSelectedZone={setSelectedZone} />
        ) : (
          <>
            {zones.length > 0 && <section className="mt-8"><div className="flex items-center justify-between mb-3"><h2 className="font-display text-2xl">{selectedDivision === "promocional_amateur" ? "ZONAS" : selectedDivision === "federal_a" ? "ZONAS" : "ZONA"}</h2><span className="text-[10px] uppercase tracking-widest text-muted-foreground">{competition.shortName}</span></div><div className="flex flex-wrap gap-2">
              {zones.map(zone=>{const active=selectedZone===zone; const zoneTeams=getTeamsByZone(selectedDivision,zone); return <button key={zone} onClick={()=>setSelectedZone(zone)} className={`min-w-[130px] rounded-lg border px-5 py-3 font-display text-lg transition-all ${active?"border-celeste bg-celeste/10 text-celeste":"border-border bg-card hover:border-celeste/50"}`}><div>{selectedDivision === "federal_a" ? `ZONA ${zone}` : `ZONA ${zone}`}</div><div className="text-[10px] font-sans text-muted-foreground mt-1">{zoneTeams.length} CLUBES</div></button>})}
            </div></section>}

            <TeamGrid title={competition.name} subtitle={zones.length && selectedZone ? `Zona ${selectedZone}` : "Clubes participantes"} teams={teams} />
          </>
        )}
      </main>
    </div>
  );
}

function RegionalView({ selectedZone, setSelectedZone }: { selectedZone: string | null; setSelectedZone: (z: string) => void }) {
  const regions = REGIONAL_REGIONS;
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const regionalTeams = getTeamsByDivision("regional_federal_amateur");
  const regionTeams = selectedZone ? regionalTeams.filter(t => t.regionalRegion === selectedZone) : [];
  const groups = useMemo(() => Array.from(new Set(regionTeams.map(t => t.regionalGroup).filter(Boolean) as string[])).sort((a,b)=>Number(a)-Number(b)), [regionTeams]);
  const visible = groupFilter ? regionTeams.filter(t=>t.regionalGroup===groupFilter) : regionTeams;
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3"><h2 className="font-display text-2xl">REGIONES DEL REGIONAL</h2><span className="text-[10px] uppercase tracking-widest text-muted-foreground">{regionalTeams.length} clubes</span></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {regions.map(r=>{const active=selectedZone===r; const count=regionalTeams.filter(t=>t.regionalRegion===r).length; return <button key={r} onClick={()=>{setSelectedZone(r);setGroupFilter(null)}} className={`rounded-xl border p-4 text-left transition ${active?"border-celeste bg-celeste/10":"border-border bg-card hover:border-celeste/50"}`}><div className="font-display text-lg">{r}</div><div className="text-xs text-muted-foreground mt-1">{count} clubes</div></button>})}
      </div>
      {selectedZone && <>
        <div className="mt-6 flex flex-wrap gap-2"><button onClick={()=>setGroupFilter(null)} className={`px-4 py-2 rounded-lg border text-sm font-display ${!groupFilter?"border-celeste bg-celeste/10 text-celeste":"border-border bg-card"}`}>Todos los grupos</button>{groups.map(g=><button key={g} onClick={()=>setGroupFilter(g)} className={`px-4 py-2 rounded-lg border text-sm font-display ${groupFilter===g?"border-celeste bg-celeste/10 text-celeste":"border-border bg-card"}`}>Grupo {g} · {regionTeams.filter(t=>t.regionalGroup===g).length}</button>)}</div>
        <TeamGrid title={`${selectedZone}${groupFilter?` · Grupo ${groupFilter}`:""}`} subtitle="Clubes del grupo geográfico" teams={visible} />
      </>}
      {!selectedZone && <div className="mt-6 rounded-xl border border-border bg-card/50 p-10 text-center"><div className="font-display text-2xl">ELEGÍ UNA REGIÓN</div><p className="text-sm text-muted-foreground mt-2">El Regional no usa una tabla nacional única: cada región contiene sus grupos geográficos.</p></div>}
    </section>
  );
}

function TeamGrid({ title, subtitle, teams }: { title: string; subtitle: string; teams: ReturnType<typeof getTeamsByDivision> }) {
  return <section className="mt-10"><div className="flex items-end justify-between gap-4 mb-4"><div><h2 className="font-display text-3xl text-celeste">{title}</h2><p className="text-sm text-muted-foreground mt-1">{subtitle}</p></div>{teams.length>0&&<div className="text-right"><div className="font-display text-2xl">{teams.length}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">CLUBES</div></div>}</div>{teams.length===0?<div className="rounded-xl border border-border bg-card/50 p-10 text-center"><div className="font-display text-2xl">{subtitle === "Clubes participantes" ? "SIN EQUIPOS CARGADOS" : "ELEGÍ UNA ZONA"}</div></div>:<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{teams.map(team=><Link key={team.id} to="/equipos/$id" params={{id:team.id}} className="group relative overflow-hidden rounded-xl bg-card border border-border p-3 flex items-center gap-3 transition-all duration-200 hover:border-celeste hover:-translate-y-0.5"><div className="absolute left-0 top-0 bottom-0 w-1" style={{backgroundColor:team.primary}}/><Shield team={team} size={54}/><div className="flex-1 min-w-0"><div className="font-display text-lg truncate">{team.name}</div><div className="text-xs text-muted-foreground">{team.city}{team.regionalGroup?` · Grupo ${team.regionalGroup}`:""}</div><div className="text-[10px] mt-2 grid grid-cols-4 gap-1 text-muted-foreground"><span>VEL {team.stats.speed}</span><span>SAL {team.stats.jump}</span><span>POT {team.stats.power}</span><span>DEF {team.stats.defense}</span></div></div><Jersey team={team} size={42}/></Link>)}</div>}</section>;
}
