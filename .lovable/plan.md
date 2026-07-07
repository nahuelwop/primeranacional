## Mejoras Modo Torneo y Carrera — Primera Heads

Voy a agregar 8 sistemas nuevos manteniendo el gameplay y la estética actuales (celeste/oscuro, tipografía display, escudos). Todo se integra en las pantallas ya existentes de `/torneo` y `/carrera`, sin tocar `Game.tsx`.

### 1. Intro cinematográfica de temporada
- Nuevo componente `SeasonIntro.tsx` con secuencia de 18s: logo Primera Heads → logo Primera Nacional → tomas de estadios (usa imágenes de `team_stadiums`) → escudos animados de los 32 clubes → trofeo → texto "PRIMERA NACIONAL 2026 · Una nueva temporada comienza…" → club elegido + objetivo.
- Botón "OMITIR" siempre visible.
- Estado `introVista: boolean` guardado en el save (Carrera: `career_saves.state`; Torneo: nueva columna en `tournament_progress.state` o en el store persistido). Se resetea a `false` cuando `season` cambia.
- Panel admin: campo `intro_video_url` en tabla nueva `game_settings` (singleton). Si hay video, se reproduce en vez de la secuencia por defecto (con fallback si falla).

### 2. Selección de dificultad
- Pantalla previa al inicio de nueva temporada con 4 tarjetas: Fácil / Normal / Difícil / Experto.
- Se guarda en el save (`state.difficulty`) y se pasa al `<Game aiDifficulty={…} />` (el prop ya existe, se extiende a `easy | normal | hard | expert`).
- Sólo modificable al iniciar nueva temporada. No toca stats de clubes.

### 3. Ver ambas zonas
- Nueva pestaña "AMBAS ZONAS" en `/torneo` y en `/carrera`: dos tablas lado a lado + acordeón de resultados por fecha de cada zona. Reutiliza `StandingsTable` existente.

### 4. Simular partido individual
- En el card del partido del usuario, además de "JUGAR" se agrega "SIMULAR".
- Nuevo componente `MatchSimOverlay.tsx`: muestra minutos animados (15', 37', 74', Final) durante ~3s usando `simulateMatch()`. Aplica el resultado igual que un partido jugado (mismo `recordUserMatch`).

### 5. Resumen de la fecha
- Al completarse todos los partidos de una fecha, overlay `RoundSummary.tsx` con noticias generadas por reglas:
  - líder actual, entradas/salidas del reducido, rachas ≥5, mayor goleada, clásicos jugados, caídas de puesto, cortes de racha.
- Se dispara desde el `useEffect` que detecta cambio de `currentRound`.

### 6. Predicción del partido destacado
- Componente `MatchPrediction.tsx` mostrado arriba del fixture cuando la próxima fecha del usuario incluye un partido "importante" (clásico, top-4 vs top-4, o zona de descenso).
- Porcentajes calculados con posición, últimos 5 resultados, puntos y `teamRating`.

### 7. Centro de Resultados
- Nueva ruta `/resultados` accesible desde `Nav` y desde botón en `/torneo`/`/carrera`. Muestra todos los resultados de la fecha activa (ambas zonas) con accesos rápidos a Tabla y Próxima Fecha.

### 8. Sistema "Coimas & Arreglos" (extiende el actual de corrupción)
- Toggle global `coimas_enabled` + toggles por función en `game_settings` (admin): `forzar_victoria`, `forzar_empate`, `forzar_derrota`, `clasificar_reducido`, `forzar_ascensos`, `forzar_descensos`, `anular_goles_enabled`, `anular_goles_ratio` (numérico, ej. 3 = 1 de cada 3).
- Si `coimas_enabled=false`: no aparece el botón en Carrera/Torneo.
- Si está activo: menú muestra sólo las opciones habilitadas por el admin.
- "Anular goles" se aplica a los goles del RIVAL en `onEnd` del Game según el ratio.

### 9. Pantalla oficial de inicio de temporada
- Tras la intro (o al skip), overlay estático 3s:
  ```
  TEMPORADA 2026
  {club elegido}
  Objetivo: {ascender/reducido/mantener}
  ```
- Luego auto-inicia Fecha 1.

---

### Sección técnica

**Nuevos archivos:**
- `src/components/SeasonIntro.tsx`
- `src/components/DifficultyPicker.tsx`
- `src/components/MatchSimOverlay.tsx`
- `src/components/RoundSummary.tsx`
- `src/components/MatchPrediction.tsx`
- `src/components/SeasonStartCard.tsx`
- `src/components/CoimasMenu.tsx` (reemplaza panel corrupción actual con toggles admin-gated)
- `src/routes/resultados.tsx`
- `src/lib/game-settings.ts` (fetch/update singleton)
- `src/lib/news-generator.ts` (reglas de noticias)
- `src/lib/predictions.ts`

**Archivos editados:**
- `src/routes/torneo.tsx`, `src/routes/carrera.tsx` — integrar intro, difficulty, simular, resumen, predicción, ambas zonas, coimas.
- `src/routes/admin.tsx` — nueva sección "Ajustes del juego" con video intro + toggles Coimas.
- `src/store/tournament.ts` — agregar `introVista`, `difficulty`, `season`, acción `simulateUserMatch`, `newSeason()`.
- `src/lib/career.ts` — extender `CareerState` con `introVista`, `difficulty`, `objetivo`, `coimas` (toggles seleccionados).
- `src/components/Nav.tsx` — link "Resultados".

**DB (una migración):**
- Tabla `game_settings` (singleton `id='global'`) con: `intro_video_url text`, `coimas_enabled bool default false`, `coimas_flags jsonb default '{}'`, `anular_goles_ratio int default 3`, timestamps. RLS: SELECT público (anon+authenticated), UPDATE sólo admins vía `has_role`. GRANTs correspondientes.

**Compatibilidad:** todos los campos nuevos del save son opcionales con defaults, así las partidas actuales siguen funcionando (`introVista ?? true` para saves antiguos, `difficulty ?? 'normal'`).
