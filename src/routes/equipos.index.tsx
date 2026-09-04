import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield, Jersey } from "@/components/Shield";
import { useTeamsSync } from "@/lib/teams-sync";
import { playUiBlip, playUiConfirm } from "@/lib/ui-blip";
import {
  getTeamsByDivision,
  getTeamsByZone,
  getZonesByDivision,
} from "@/data/teams-catalog";
import {
  COMPETITIONS,
  DIVISION_ORDER,
  type DivisionId,
} from "@/data/competitions";

export const Route = createFileRoute(
  "/equipos/",
)({
  head: () => ({
    meta: [
      {
        title:
          "Equipos · Primera Heads",
      },
      {
        name: "description",
        content:
          "Clubes del fútbol argentino organizados por división y zona.",
      },
    ],
  }),
  component: EquiposPage,
});

// ============================================================================
// REGIONES DEL REGIONAL FEDERAL AMATEUR
// ============================================================================

const REGIONAL_REGIONS = [
  "Norte",
  "Litoral Norte",
  "Litoral Sur",
  "Centro",
  "Cuyo",
  "Pampeana Norte",
  "Pampeana Sur",
  "Patagonia",
];

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

function EquiposPage() {
  // IMPORTANTE:
  // Guardamos el valor para que el componente se suscriba al store.
  // De esa manera, cuando Admin guarda un escudo y teams-sync actualiza
  // Supabase/Realtime, esta pantalla vuelve a renderizarse.
  const teamsVersion =
    useTeamsSync();

  const [selectedDivision, setSelectedDivision] =
    useState<DivisionId>(
      "primera_nacional",
    );

  const [selectedZone, setSelectedZone] =
    useState<string | null>(null);

  const competition =
    COMPETITIONS[selectedDivision];

  // ==========================================================================
  // ZONAS / REGIONES
  // ==========================================================================

  const zones = useMemo(
    () =>
      getZonesByDivision(
        selectedDivision,
      ),
    [
      selectedDivision,
      teamsVersion,
    ],
  );

  // ==========================================================================
  // EQUIPOS VISIBLES
  // ==========================================================================

  const teams = useMemo(() => {
    // ------------------------------------------------------------------------
    // REGIONAL AMATEUR
    // ------------------------------------------------------------------------

    if (
      selectedDivision ===
      "regional_federal_amateur"
    ) {
      return selectedZone
        ? getTeamsByZone(
            selectedDivision,
            selectedZone,
          )
        : [];
    }

    // ------------------------------------------------------------------------
    // OTRAS DIVISIONES
    // ------------------------------------------------------------------------

    if (
      zones.length > 0 &&
      selectedZone
    ) {
      return getTeamsByZone(
        selectedDivision,
        selectedZone,
      );
    }

    if (
      zones.length > 0
    ) {
      return [];
    }

    return getTeamsByDivision(
      selectedDivision,
    );
  }, [
    selectedDivision,
    selectedZone,
    zones,
    teamsVersion,
  ]);

  // ==========================================================================
  // CAMBIO DE DIVISIÓN
  // ==========================================================================

  function handleDivisionChange(
    division: DivisionId,
  ) {
    setSelectedDivision(
      division,
    );

    const next =
      getZonesByDivision(
        division,
      );

    setSelectedZone(
      next.length > 0
        ? next[0]
        : null,
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">

        {/* ================================================================= */}
        {/* CABECERA                                                          */}
        {/* ================================================================= */}

        <div className="mb-8 flex items-end justify-between gap-4">
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

        {/* ================================================================= */}
        {/* DIVISIONES                                                        */}
        {/* ================================================================= */}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">
              DIVISIÓN
            </h2>

            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {DIVISION_ORDER.indexOf(
                selectedDivision,
              ) + 1}
              /
              {DIVISION_ORDER.length}
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
            {DIVISION_ORDER.map(
              (divisionId) => {
                const item =
                  COMPETITIONS[
                    divisionId
                  ];

                const active =
                  divisionId ===
                  selectedDivision;

                const count =
                  getTeamsByDivision(
                    divisionId,
                  ).length;

                return (
                  <button
                    key={divisionId}
                    type="button"
                    onClick={() =>
                      handleDivisionChange(
                        divisionId,
                      )
                    }
                    className={`group relative shrink-0 w-[230px] sm:w-[270px] rounded-xl border p-4 text-left transition-all duration-200 ${
                      active
                        ? "border-celeste bg-celeste/10 shadow-[0_0_24px_rgba(126,200,255,0.12)]"
                        : "border-border bg-card hover:border-celeste/50"
                    }`}
                  >
                    <div
                      className={`absolute left-0 top-0 h-1 w-full rounded-t-xl ${
                        active
                          ? "bg-celeste"
                          : "bg-transparent"
                      }`}
                    />

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div
                          className={`font-display text-xl leading-none ${
                            active
                              ? "text-celeste"
                              : ""
                          }`}
                        >
                          {item.name}
                        </div>

                        <div className="text-[11px] text-muted-foreground mt-2 uppercase tracking-wide">
                          {divisionId ===
                          "regional_federal_amateur"
                            ? "8 regiones"
                            : item.hasZones
                              ? `${item.zones.length} zonas`
                              : "Tabla general"}
                        </div>
                      </div>

                      <div className="font-display text-2xl text-muted-foreground/60">
                        {count}
                      </div>
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </section>

        {/* ================================================================= */}
        {/* REGIONAL                                                         */}
        {/* ================================================================= */}

        {selectedDivision ===
        "regional_federal_amateur" ? (
          <RegionalView
            selectedZone={
              selectedZone
            }
            setSelectedZone={
              setSelectedZone
            }
            teamsVersion={
              teamsVersion
            }
          />
        ) : (
          <>
            {/* ============================================================= */}
            {/* ZONAS                                                         */}
            {/* ============================================================= */}

            {zones.length > 0 && (
              <section className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-2xl">
                    {selectedDivision ===
                    "promocional_amateur"
                      ? "ZONAS"
                      : selectedDivision ===
                          "federal_a"
                        ? "ZONAS"
                        : "ZONA"}
                  </h2>

                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {competition.shortName}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {zones.map(
                    (zone) => {
                      const active =
                        selectedZone ===
                        zone;

                      const zoneTeams =
                        getTeamsByZone(
                          selectedDivision,
                          zone,
                        );

                      return (
                        <button
                          key={zone}
                          type="button"
                          onClick={() =>
                            setSelectedZone(
                              zone,
                            )
                          }
                          className={`min-w-[130px] rounded-lg border px-5 py-3 font-display text-lg transition-all ${
                            active
                              ? "border-celeste bg-celeste/10 text-celeste"
                              : "border-border bg-card hover:border-celeste/50"
                          }`}
                        >
                          <div>
                            ZONA {zone}
                          </div>

                          <div className="text-[10px] font-sans text-muted-foreground mt-1">
                            {zoneTeams.length} CLUBES
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </section>
            )}

            {/* ============================================================= */}
            {/* LISTADO DE EQUIPOS                                             */}
            {/* ============================================================= */}

            <TeamGrid
              title={
                competition.name
              }
              subtitle={
                zones.length > 0 &&
                selectedZone
                  ? `Zona ${selectedZone}`
                  : "Clubes participantes"
              }
              teams={teams}
            />
          </>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// VISTA DEL REGIONAL FEDERAL AMATEUR
// ============================================================================

function RegionalView({
  selectedZone,
  setSelectedZone,
  teamsVersion,
}: {
  selectedZone:
    | string
    | null;

  setSelectedZone:
    (
      zone: string,
    ) => void;

  teamsVersion: number;
}) {
  const regions =
    REGIONAL_REGIONS;

  const [groupFilter, setGroupFilter] =
    useState<string | null>(
      null,
    );

  const regionalTeams =
    useMemo(
      () =>
        getTeamsByDivision(
          "regional_federal_amateur",
        ),
      [teamsVersion],
    );

  const regionTeams =
    useMemo(
      () =>
        selectedZone
          ? regionalTeams.filter(
              (team) =>
                team.regionalRegion ===
                selectedZone,
            )
          : [],
      [
        selectedZone,
        regionalTeams,
      ],
    );

  const groups =
    useMemo(
      () =>
        Array.from(
          new Set(
            regionTeams
              .map(
                (team) =>
                  team.regionalGroup,
              )
              .filter(
                (
                  value,
                ): value is string =>
                  typeof value ===
                    "string" &&
                  value.length > 0,
              ),
          ),
        ).sort(
          (
            a,
            b,
          ) =>
            Number(a) -
            Number(b),
        ),
      [regionTeams],
    );

  const visible =
    groupFilter
      ? regionTeams.filter(
          (team) =>
            team.regionalGroup ===
            groupFilter,
        )
      : regionTeams;

  return (
    <section className="mt-8">

      {/* =================================================================== */}
      {/* ENCABEZADO                                                         */}
      {/* =================================================================== */}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-2xl">
          REGIONES DEL REGIONAL
        </h2>

        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {regionalTeams.length} clubes
        </span>
      </div>

      {/* =================================================================== */}
      {/* REGIONES                                                           */}
      {/* =================================================================== */}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {regions.map(
          (region) => {
            const active =
              selectedZone ===
              region;

            const count =
              regionalTeams.filter(
                (team) =>
                  team.regionalRegion ===
                  region,
              ).length;

            return (
              <button
                key={region}
                type="button"
                onClick={() => {
                  setSelectedZone(
                    region,
                  );

                  setGroupFilter(
                    null,
                  );
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-celeste bg-celeste/10"
                    : "border-border bg-card hover:border-celeste/50"
                }`}
              >
                <div className="font-display text-lg">
                  {region}
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  {count} clubes
                </div>
              </button>
            );
          },
        )}
      </div>

      {/* =================================================================== */}
      {/* GRUPOS                                                             */}
      {/* =================================================================== */}

      {selectedZone && (
        <>
          <div className="mt-6 flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                setGroupFilter(
                  null,
                )
              }
              className={`px-4 py-2 rounded-lg border text-sm font-display ${
                !groupFilter
                  ? "border-celeste bg-celeste/10 text-celeste"
                  : "border-border bg-card"
              }`}
            >
              Todos los grupos
            </button>

            {groups.map(
              (group) => {
                const count =
                  regionTeams.filter(
                    (team) =>
                      team.regionalGroup ===
                      group,
                  ).length;

                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() =>
                      setGroupFilter(
                        group,
                      )
                    }
                    className={`px-4 py-2 rounded-lg border text-sm font-display ${
                      groupFilter ===
                      group
                        ? "border-celeste bg-celeste/10 text-celeste"
                        : "border-border bg-card"
                    }`}
                  >
                    Grupo {group} ·{" "}
                    {count}
                  </button>
                );
              },
            )}
          </div>

          {/* =============================================================== */}
          {/* EQUIPOS DE LA REGIÓN / GRUPO                                    */}
          {/* =============================================================== */}

          <TeamGrid
            title={`${selectedZone}${
              groupFilter
                ? ` · Grupo ${groupFilter}`
                : ""
            }`}
            subtitle="Clubes del grupo geográfico"
            teams={visible}
          />
        </>
      )}
    </section>
  );
}

// ============================================================================
// GRID DE EQUIPOS — estilo selector de equipo tipo videojuego de consola
// (panel con textura cálida + resplandor de fuego, escudos en grilla, el
// resaltado se agranda con borde dorado, navegable con flechas + sonido).
// ============================================================================

function TeamGrid({
  title,
  subtitle,
  teams,
}: {
  title: string;
  subtitle: string;
  teams: ReturnType<
    typeof getTeamsByDivision
  >;
}) {
  const navigate = useNavigate();
  const [focusIdx, setFocusIdx] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [cols, setCols] = useState(5);

  // Recalcula cuántas columnas tiene la grilla en este ancho de pantalla,
  // para que las flechas arriba/abajo salten la cantidad correcta de celdas.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      const n = style.gridTemplateColumns.split(" ").filter(Boolean).length;
      if (n > 0) setCols(n);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [teams.length]);

  useEffect(() => {
    if (focusIdx >= teams.length) setFocusIdx(0);
  }, [teams.length, focusIdx]);

  useEffect(() => {
    cellRefs.current[focusIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [focusIdx]);

  useEffect(() => {
    if (teams.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      let next = focusIdx;
      if (e.key === "ArrowRight") next = Math.min(teams.length - 1, focusIdx + 1);
      else if (e.key === "ArrowLeft") next = Math.max(0, focusIdx - 1);
      else if (e.key === "ArrowDown") next = Math.min(teams.length - 1, focusIdx + cols);
      else if (e.key === "ArrowUp") next = Math.max(0, focusIdx - cols);
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        playUiConfirm();
        navigate({ to: "/equipos/$id", params: { id: teams[focusIdx].id } });
        return;
      } else return;
      e.preventDefault();
      if (next !== focusIdx) {
        playUiBlip();
        setFocusIdx(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusIdx, cols, teams, navigate]);

  const active = teams[focusIdx];

  return (
    <section className="mt-8">

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-display text-2xl">
            {title}
          </h2>

          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        </div>

        <span className="text-xs text-muted-foreground">
          {teams.length} clubes
        </span>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No hay equipos para mostrar.
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border-2 border-[#7a5a2a] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          {/* Panel con textura cálida (madera/cuero envejecido), como los menús de selección clásicos */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 15% 15%, #6b4a22 0%, #2c1d0d 55%, #150d05 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-25 mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, rgba(255,220,150,0.10) 0px, rgba(255,220,150,0.10) 2px, transparent 2px, transparent 10px)",
            }}
          />
          {/* Resplandor de "fuego" en una esquina, animado */}
          <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(255,140,20,0.55)_0%,rgba(255,90,0,0.18)_45%,transparent_70%)] blur-2xl animate-pulse" />
          <div className="absolute inset-0 shadow-[inset_0_0_120px_50px_rgba(0,0,0,0.55)]" />

          {/* Barra superior con el nombre del equipo resaltado */}
          {active && (
            <div className="relative z-10 flex items-center gap-3 px-4 sm:px-6 py-3 bg-black/50 border-b border-[#c9a24b]/40">
              <Shield team={active} size={32} />
              <div className="min-w-0">
                <div className="font-display text-lg sm:text-xl text-[#f4d989] truncate drop-shadow-[0_0_10px_rgba(244,217,137,0.4)]">
                  {active.name}
                </div>
                <div className="text-[10px] sm:text-xs text-white/50 truncate">{active.city}</div>
              </div>
              <div className="ml-auto hidden sm:grid grid-cols-4 gap-1.5 text-[10px]">
                {([["VEL", active.stats.speed], ["SAL", active.stats.jump], ["POT", active.stats.power], ["DEF", active.stats.defense]] as const).map(([label, val]) => (
                  <div key={label} className="rounded bg-white/10 px-2 py-1 text-center min-w-[42px]">
                    <div className="text-white/50">{label}</div>
                    <div className="font-display text-[#f4d989]">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grilla de escudos */}
          <div
            ref={gridRef}
            className="relative z-10 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-2 sm:gap-3 p-4 sm:p-6 max-h-[70vh] overflow-y-auto"
          >
            {teams.map((team, i) => {
              const isFocused = i === focusIdx;
              return (
                <button
                  key={team.id}
                  ref={el => { cellRefs.current[i] = el; }}
                  type="button"
                  onMouseEnter={() => { if (focusIdx !== i) { playUiBlip(); setFocusIdx(i); } }}
                  onClick={() => { playUiConfirm(); navigate({ to: "/equipos/$id", params: { id: team.id } }); }}
                  title={team.name}
                  className={`relative aspect-square rounded-lg flex items-center justify-center transition-all duration-150 ${
                    isFocused
                      ? "scale-110 bg-[#3a2a12] ring-2 ring-[#f4d989] shadow-[0_0_18px_rgba(244,217,137,0.6)] z-10"
                      : "bg-black/25 hover:bg-black/40 ring-1 ring-white/10"
                  }`}
                >
                  <Shield team={team} size={isFocused ? 44 : 36} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
