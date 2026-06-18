Voy a dividirlo en 4 entregas separadas (una por turno) para que cada una quede bien probada. Confirmá el orden y arranco con la #1.

## Entrega 1 — Admin: plantel + estadio por equipo
- Nuevas tablas en la base:
  - `team_players` (team_id, nombre, posición [arquero/defensa/medio/delantero], dorsal, fecha nacimiento, altura, sort_order)
  - `team_stadiums` (team_id PK, nombre, capacidad, fundación, ciudad, dirección)
- Pantalla en `/admin`: por cada equipo, un panel expandible con:
  - Form de estadio (los 5 campos).
  - Lista de jugadores agrupada por posición + botón "Agregar jugador" + editar/eliminar inline.
  - Botón "Importar pegando texto" para cargar planteles masivos como los que pasaste (parser que detecta posición por palabras clave).
- Página `/equipos/:id` (o panel en `/equipos`) muestra plantel + ficha del estadio público.

## Entrega 2 — Relator único en amistoso 1v1
- En `/amistoso`, un solo selector "Relator" (en vez de uno por equipo) que se usa para los goles de ambos lados.
- En torneo/reducido sigue siendo uno por equipo.

## Entrega 3 — Clima dinámico
- Al iniciar partido, se sortea: despejado / lluvia / niebla / viento.
- Efectos visuales en canvas: partículas de lluvia, capa de niebla con opacidad, líneas de viento.
- Efectos en física: lluvia → más fricción; viento → fuerza horizontal constante sobre la pelota; niebla → solo visual.
- Indicador del clima arriba del marcador.
- Toggle en admin para activar/desactivar clima global, y en amistoso para forzar uno específico.

## Entrega 4 — Modo Carrera + Logros + Stats
- Tabla `career_saves` (user_id, team_id, temporada, presupuesto, jugada actual, json de stats).
- Tabla `achievements` (user_id, key, unlocked_at). Logros iniciales: Campeón Zona A, Campeón Zona B, Ascenso directo, 100 goles, 10 partidos invicto.
- Tabla `match_history` (user_id, fecha, local, visitante, gl, gv, modo) para alimentar:
  - Máximo goleador (del usuario).
  - Equipo más ganador.
  - Historial de campeones.
  - Récord de goles en un partido.
- Página `/carrera`: elegir equipo → jugar temporada completa (usa el fixture existente) → al terminar guarda presupuesto + chequea logros → siguiente temporada.
- Página `/estadisticas`: tablas con los rankings de arriba.

## Lo que queda fuera (para más adelante, son features grandes cada uno)
Camisetas alternativas, tribunas animadas con banderas/papelitos, cantitos por club, mercado con monedas/compras, ranking online entre usuarios, torneos semanales, repetición de goles, penales en empates de reducido. Los podemos ir agregando de a uno cuando termine los 4 de arriba.

## Detalles técnicos
- Migrations con GRANT + RLS (admins escriben, todos leen para teams; el usuario lee/escribe lo suyo en carrera/logros).
- Importador de planteles: regex por líneas, detecta encabezados "Arqueros/Defensores/Mediocampistas/Delanteros" y crea filas con la posición correspondiente.
- Subida masiva de audios ya está hecha (multi-file).
- Modo Carrera reusa la lógica de `tournament.ts` actual, solo persiste y avanza temporadas.

¿Arranco con la **Entrega 1 (Admin plantel + estadio)** o querés cambiar el orden?