import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield, Jersey } from "@/components/Shield";
import { useTeamsSync } from "@/lib/teams-sync";
import {
  getTeamsByDivision,
  getTeamsByZone,
  getZonesByDivision,
  getRegionalGroups,
  getRegionalTeams,
  getZoneDisplayName,
} from "@/data/teams-catalog";
import {
  COMPETITIONS,
  DIVISION_ORDER,
  type DivisionId,
} from "@/data/competitions";

export const Route = createFileRoute("/equipos/")({
  head: () => ({
    meta: [
      { title: "Equipos · Primera Heads" },
      {
        name: "description",
        content:
          "Clubes del fútbol argentino organizados por división, regiones y grupos geográficos.",
      },
    ],
  }),
  component: EquiposPage,
});

function regionalGroupLabel(region: string, group: string): string {
  const teams = getRegionalTeams(region, group);
  const places = Array.from(new Set(teams.map((t) => t.city).filter(Boolean)));
  if (places.length <= 2) return places.join(" · ");
  return `${places[0]} · ${places[1]} · ...`;
}

function EquiposPage() {
  const teamsVersion = useTeamsSync();
  const [selectedDivision, setSelectedDivision] =
    useState<DivisionId>("primera_nacional");
  const competition = COMPETITIONS[selectedDivision];

  const regionsOrZones = useMemo(
    () => getZonesByDivision(selectedDivision),
    [selectedDivision, teamsVersion],
  );
  const [selectedZone, setSelectedZone] = useState<string | null>("A");
  const [selectedRegionalGroup, setSelectedRegionalGroup] = useState<string | null>(null);

  const regional = selectedDivision === "regional_federal_amateur";

  const regionalGroups = useMemo(
    () => (regional && selectedZone ? getRegionalGroups(selectedZone) : []),
    [regional, selectedZone, teamsVersion],
  );

  const teams = useMemo(() => {
    if (regional) {
      if (!selectedZone) return [];
      const group = selectedRegionalGroup ?? regionalGroups[0];
      return group ? getRegionalTeams(selectedZone, group) : [];
    }

    if (competition.hasZones && selectedZone) {
      return getTeamsByZone(selectedDivision, selectedZone);
    }

    if (competition.hasZones) return [];
    return getTeamsByDivision(selectedDivision);
  }, [regional, selectedZone, selectedRegionalGroup, regionalGroups, selectedDivision, competition.hasZones, teamsVersion]);

  function handleDivisionChange(division: DivisionId) {
    setSelectedDivision(division);
    const next = getZonesByDivision(division);
    if (division === "regional_federal_amateur") {
      const firstRegion = next[0] ?? "Norte";
      setSelectedZone(firstRegion);
      const firstGroup = getRegionalGroups(firstRegion)[0] ?? null;
      setSelectedRegionalGroup(firstGroup);
      return;
    }
    setSelectedRegionalGroup(null);
    setSelectedZone(next[0] ?? null);
  }

  function handleZoneChange(zone: string) {
    setSelectedZone(zone);
    if (regional) setSelectedRegionalGroup(getRegionalGroups(zone)[0] ?? null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.25em] text-celeste uppercase">
                PRIMERA HEADS
              </p>
              <h1 className="font-display text-5xl sm:text-6xl leading-none">
                EQUIPOS
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                Seleccioná una división para explorar sus clubes.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Competición
              </div>
              <div className="font-display text-xl text-celeste">
                {competition.shortName}
              </div>
            </div>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">DIVISIÓN</h2>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {DIVISION_ORDER.indexOf(selectedDivision) + 1}/{DIVISION_ORDER.length}
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
            {DIVISION_ORDER.map((division) => {
              const item = COMPETITIONS[division];
              const active = division === selectedDivision;
              const count = getTeamsByDivision(division).length;
              return (
                <button
                  key={division}
                  type="button"
                  onClick={() => handleDivisionChange(division)}
                  className={[
                    "group relative shrink-0 snap-start w-[230px] sm:w-[270px] rounded-xl border p-4 text-left transition-all duration-200",
                    active
                      ? "border-celeste bg-celeste/10 shadow-[0_0_24px_rgba(126,200,255,0.12)]"
                      : "border-border bg-card hover:border-celeste/50",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "absolute left-0 top-0 h-1 w-full rounded-t-xl transition",
                      active ? "bg-celeste shadow-[0_0_12px_rgba(126,200,255,0.7)]" : "bg-transparent",
                    ].join(" ")}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={["font-display text-xl leading-none", active ? "text-celeste" : ""].join(" ")}>{item.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-2 uppercase tracking-wide">
                        {division === "regional_federal_amateur"
                          ? "8 regiones geográficas"
                          : item.hasZones
                            ? `${item.zones.length} zonas`
                            : "Sin zonas"}
                      </div>
                    </div>
                    <div className="font-display text-2xl text-muted-foreground/60">{count}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {active ? "SELECCIONADA" : "SELECCIONAR"}
                    </span>
                    <span className={["text-lg transition-transform", active ? "text-celeste translate-x-1" : "text-muted-foreground"].join(" ")}>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {regionsOrZones.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-2xl">{regional ? "REGIÓN" : "ZONA"}</h2>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{competition.shortName}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {regionsOrZones.map((zone) => {
                const active = selectedZone === zone;
                const zoneTeams = regional
                  ? getTeamsByZone(selectedDivision, zone)
                  : getTeamsByZone(selectedDivision, zone);
                return (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => handleZoneChange(zone)}
                    className={[
                      "rounded-lg border px-5 py-3 font-display text-lg transition-all",
                      active ? "border-celeste bg-celeste/10 text-celeste shadow-[0_0_18px_rgba(126,200,255,0.10)]" : "border-border bg-card hover:border-celeste/50",
                    ].join(" ")}
                  >
                    <div>{regional ? zone.toUpperCase() : getZoneDisplayName(selectedDivision, zone)}</div>
                    <div className="text-[10px] font-sans text-muted-foreground mt-1">
                      {zoneTeams.length} CLUBES
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {regional && selectedZone && (
          <section className="mt-7">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-2xl">GRUPOS GEOGRÁFICOS</h2>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{selectedZone}</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {regionalGroups.map((group) => {
                const active = (selectedRegionalGroup ?? regionalGroups[0]) === group;
                const groupTeams = getRegionalTeams(selectedZone, group);
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedRegionalGroup(group)}
                    className={[
                      "rounded-xl border p-4 text-left transition-all",
                      active ? "border-celeste bg-celeste/10" : "border-border bg-card hover:border-celeste/50",
                    ].join(" ")}
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">Grupo {group}</div>
                    <div className="font-display text-lg text-white mt-1">{regionalGroupLabel(selectedZone, group)}</div>
                    <div className="text-xs text-muted-foreground mt-2">{groupTeams.length} clubes · ida y vuelta</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-3xl text-celeste">{competition.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {regional
                  ? `${selectedZone ?? "Región"}${selectedRegionalGroup ? ` · Grupo ${selectedRegionalGroup}` : ""}`
                  : competition.hasZones && selectedZone
                    ? getZoneDisplayName(selectedDivision, selectedZone)
                    : "Clubes participantes"}
              </p>
            </div>
            {teams.length > 0 && (
              <div className="text-right">
                <div className="font-display text-2xl">{teams.length}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">CLUBES</div>
              </div>
            )}
          </div>

          {teams.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/50 p-10 text-center">
              <div className="font-display text-2xl">SIN EQUIPOS CARGADOS</div>
              <p className="text-sm text-muted-foreground mt-2">Esta selección no tiene clubes disponibles.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  to="/equipos/$id"
                  params={{ id: team.id }}
                  className="group relative overflow-hidden rounded-xl bg-card border border-border p-3 flex items-center gap-3 transition-all duration-200 hover:border-celeste hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80" style={{ backgroundColor: team.primary }} />
                  <Shield team={team} size={54} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg truncate">{team.name}</div>
                    <div className="text-xs text-muted-foreground">{team.city}</div>
                    <div className="text-[10px] mt-2 grid grid-cols-4 gap-1 text-muted-foreground">
                      <span>VEL {team.stats.speed}</span>
                      <span>SAL {team.stats.jump}</span>
                      <span>POT {team.stats.power}</span>
                      <span>DEF {team.stats.defense}</span>
                    </div>
                  </div>
                  <Jersey team={team} size={42} />
                  <div className="absolute right-2 bottom-1 text-celeste/0 group-hover:text-celeste transition">→</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
