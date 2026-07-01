
# Entrega 7 — plan

Bloques independientes. Los ataco en paralelo cuando puedo.

## 1. Torneo: fechas en orden + auto-sim del resto

En `src/store/tournament.ts` y `src/routes/torneo.tsx`:
- El usuario solo puede jugar el partido de la **fecha activa** (`currentRound`); no se puede saltear.
- Al entrar a la fecha, se **auto-simulan** todos los partidos que no son del usuario (sin botón "simular"). Queda solo el botón "JUGAR mi partido".
- Al terminar el partido del usuario, la fecha se cierra sola y avanza `currentRound`.
- Mismo criterio en `carrera.tsx` (ya lo hace, verifico consistencia).

## 2. Reducido jugable (no solo simulado)

En `src/store/tournament.ts` + `src/routes/reducido.tsx`:
- Detecto si el usuario está en un `Pair` de la llave (octavos → final) o en la final directa.
- Si es su partido: botón **JUGAR** que abre `Game` con esos dos equipos; al terminar, se registra el resultado en el `Pair` y avanza la llave.
- El resto de partidos del bracket siguen simulándose con `advanceBracket()` pero automático por ronda.

## 3. Animación de marcador (gol)

En `src/components/Game.tsx`:
- Al detectar gol, disparo un pulso CSS/canvas sobre el marcador top: escala 1→1.4→1, glow del color del equipo, número que "flipea" (contador viejo → nuevo con desliz vertical), y confetti breve en el HUD.
- Ya existe replay; sumo esta animación antes del replay.

## 4. Modo carrera — mejoras de estadio y "corrupción"

Nueva pestaña **Club** en `src/routes/carrera.tsx` con presupuesto ya existente:

**Estadio (permanente, aumenta ingresos por partido):**
- Ampliar capacidad (+10% ingreso) — $200
- Mejorar cancha (+15%) — $350
- Palcos VIP (+25%) — $600
- Iluminación LED (+10%) — $250
Se acumulan; se guarda `stadiumUpgrades: {capacity, pitch, vip, led}` en `career_saves`.

**Corrupción (efecto temporal, se descuentan ingresos):**
| Nivel | Costo | Efecto | Penalidad |
|---|---|---|---|
| Leve | $150 | -1 gol al rival (1 partido) | — |
| Medio | $400 | arrancás 1-0 y anula 3 goles rivales | — |
| Obvio | $900 | anula TODOS los goles rivales (1 partido) | -40% ingresos por 5 partidos |
| Seca nuca | $0 | 5 partidos sin goles rivales + a veces 1 gol tuyo cuenta como 2 | -90% ingresos por 20 partidos |

Estado en el store de carrera: `activeCorruption: {kind, matchesLeft}`, `incomePenalty: {pct, matchesLeft}`.
El motor `Game.tsx` recibe props opcionales `startingScore`, `cancelOpponentGoals` (número o `Infinity`), `doubleGoalChance` — cuando se dispara `home` gol, aplico multiplicador. Cuando el rival mete gol, si `cancelOpponentGoals > 0`, lo descuento y muestro banner "GOL ANULADO POR EL VAR 🤨".

## 5. Tabla de las 2 zonas en carrera

`carrera.tsx` ya muestra la zona del usuario. Agrego una segunda tabla con la otra zona (simulada al vuelo por fecha, reutilizando `simulateMatch`). Nuevo estado `otherZoneStandings` en `src/lib/career.ts` que se actualiza junto con la propia.

## 6. Hinchadas más vivas (solo visual)

En `src/components/Game.tsx`, sin tocar física:
- **Más banderas animadas** en las tribunas (ya hay 2, subo a 8 con sway senoidal desfasado).
- **Más público en partidos decisivos**: prop `crowdIntensity: "normal" | "clasico" | "ascenso"`; aumenta densidad de puntitos en tribunas y frecuencia de "olas".
- **Ambientación por tipo**:
  - `clasico` (rival histórico) → humo de colores en primer minuto, bengalas.
  - `ascenso` (playoff/final) → papelitos toda la primera mitad, cartel "FINAL POR EL ASCENSO" en el LED.
- `amistoso.tsx`, `carrera.tsx`, `torneo.tsx`, `reducido.tsx` pasan la prop apropiada.

## 7. Fichas de clubes + edición por admin

**Base de datos** (nueva migración):
```sql
ALTER TABLE public.teams ADD COLUMN full_name text;
ALTER TABLE public.teams ADD COLUMN founded_year int;
ALTER TABLE public.teams ADD COLUMN province text;
ALTER TABLE public.teams ADD COLUMN nickname text;
ALTER TABLE public.teams ADD COLUMN rival_id text;
ALTER TABLE public.teams ADD COLUMN primera_seasons int;
ALTER TABLE public.teams ADD COLUMN achievements text;    -- markdown libre
ALTER TABLE public.teams ADD COLUMN history text;         -- markdown libre
```
(name, city, colors, estadio, capacidad ya existen — no los duplico.)

**UI:**
- Al hacer click en un club en `equipos.tsx`, en vez de ir directo a `equipos/$id`, abre un **modal ficha** con todos los datos + historia + logros. Botón "Ver plantel completo" lleva a la página.
- En `src/routes/admin.tsx` sumo formulario por equipo con esos campos (textareas para history/achievements), guarda vía server fn con `has_role('admin')`.

## Detalles técnicos

- Nuevos archivos: `src/components/ClubFicha.tsx`, `src/lib/corruption.ts`.
- Editados: `Game.tsx` (marcador anim + hinchadas + props corrupción/intensidad), `tournament.ts` store (orden estricto + auto-sim + reducido jugable), `reducido.tsx`, `carrera.tsx` (pestaña Club + tabla 2 zonas), `admin.tsx` (editor de fichas), `equipos.tsx` (modal ficha), migración SQL, `career-api.ts` (persistir upgrades + corrupción + penalty).
- `career_saves` ya guarda JSON; extiendo el payload sin migración.

## Orden de ejecución

1. Migración `teams` (bloquea admin/ficha hasta aprobar).
2. En paralelo mientras se aprueba: Game.tsx (marcador + hinchadas + props corrupción), tournament store (orden + auto-sim + reducido jugable), reducido.tsx.
3. Post-migración: admin editor, ClubFicha, carrera pestaña Club + 2 zonas + integración corrupción.

¿Arranco?
