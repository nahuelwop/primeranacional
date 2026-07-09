export type Difficulty = "easy" | "normal" | "hard" | "expert";

export const DIFFICULTY_INFO: Record<Difficulty, { label: string; emoji: string; desc: string; color: string }> = {
  easy:   { label: "FÁCIL",   emoji: "🟢", desc: "IA más lenta, más errores, menor precisión.", color: "text-green-400" },
  normal: { label: "NORMAL",  emoji: "🟡", desc: "IA equilibrada.", color: "text-yellow-400" },
  hard:   { label: "DIFÍCIL", emoji: "🟠", desc: "IA más rápida y precisa, mejor posicionamiento.", color: "text-orange-400" },
  expert: { label: "EXPERTO", emoji: "🔴", desc: "Máxima velocidad, casi sin errores, aprovecha errores del jugador.", color: "text-red-500" },
};

// Traduce nuestra dificultad al prop aiDifficulty del componente Game.
export function toGameAi(d: Difficulty): "easy" | "normal" | "hard" | "expert" {
  return d;
}
