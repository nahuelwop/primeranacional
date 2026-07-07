import { DIFFICULTY_INFO, type Difficulty } from "@/lib/difficulty";

export function DifficultyPicker({ onPick, onCancel }: { onPick: (d: Difficulty) => void; onCancel?: () => void }) {
  const keys: Difficulty[] = ["easy", "normal", "hard", "expert"];
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-card rounded-2xl border border-border p-6">
        <p className="text-celeste font-display tracking-[0.3em] text-xs">TEMPORADA</p>
        <h2 className="font-display text-4xl mb-1">DIFICULTAD</h2>
        <p className="text-muted-foreground text-sm mb-6">Solo se puede cambiar al iniciar una nueva temporada. Afecta únicamente el comportamiento de la IA.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {keys.map(k => {
            const d = DIFFICULTY_INFO[k];
            return (
              <button key={k} onClick={() => onPick(k)}
                className="text-left p-4 rounded-xl bg-background border border-border hover:border-celeste hover:bg-celeste/5 transition">
                <div className="text-3xl mb-2">{d.emoji}</div>
                <div className={`font-display text-xl ${d.color}`}>{d.label}</div>
                <div className="text-xs text-muted-foreground mt-2">{d.desc}</div>
              </button>
            );
          })}
        </div>
        {onCancel && (
          <div className="mt-6 text-right">
            <button onClick={onCancel} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}
