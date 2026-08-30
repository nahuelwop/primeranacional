import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield, Jersey } from "@/components/Shield";
import { useTeamsSync } from "@/lib/teams-sync";
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
// GRID DE EQUIPOS
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {teams.map(
            (team) => (
              <Link
                key={team.id}
                to="/equipos/$id"
                params={{
                  id: team.id,
                }}
                className="group rounded-xl bg-card border border-border p-4 transition hover:border-celeste hover:bg-celeste/[0.04]"
              >
                <div className="flex flex-col items-center text-center">

                  <div className="h-20 w-20 flex items-center justify-center">
                    <Shield
                      team={team}
                      size={64}
                    />
                  </div>

                  <div className="mt-3 font-display text-sm truncate w-full">
                    {team.short ||
                      team.name}
                  </div>

                  <div className="text-[11px] text-muted-foreground truncate w-full mt-1">
                    {team.name}
                  </div>

                  <div className="text-[10px] text-muted-foreground truncate w-full mt-1">
                    {team.city}
                  </div>

                  {team.division ===
                    "regional_federal_amateur" &&
                    team.regionalRegion && (
                      <div className="text-[9px] text-celeste/80 mt-2">
                        {
                          team.regionalRegion
                        }{" "}
                        · Grupo{" "}
                        {
                          team.regionalGroup
                        }
                      </div>
                    )}

                  <div className="mt-3 grid grid-cols-4 gap-1 w-full text-[9px]">
                    <div className="rounded bg-secondary/60 px-1 py-1">
                      <div className="text-muted-foreground">
                        VEL
                      </div>
                      <div className="font-display">
                        {
                          team.stats
                            .speed
                        }
                      </div>
                    </div>

                    <div className="rounded bg-secondary/60 px-1 py-1">
                      <div className="text-muted-foreground">
                        SAL
                      </div>
                      <div className="font-display">
                        {
                          team.stats
                            .jump
                        }
                      </div>
                    </div>

                    <div className="rounded bg-secondary/60 px-1 py-1">
                      <div className="text-muted-foreground">
                        POT
                      </div>
                      <div className="font-display">
                        {
                          team.stats
                            .power
                        }
                      </div>
                    </div>

                    <div className="rounded bg-secondary/60 px-1 py-1">
                      <div className="text-muted-foreground">
                        DEF
                      </div>
                      <div className="font-display">
                        {
                          team.stats
                            .defense
                        }
                      </div>
                    </div>
                  </div>

                  {team.logoUrl ? (
                    <div className="mt-2 text-[9px] text-hud-green">
                      ESCUDO CARGADO
                    </div>
                  ) : null}
                </div>
              </Link>
            ),
          )}
        </div>
      )}
    </section>
  );
}
