import type { NewsItem } from "@/lib/news-generator";

export function RoundSummary({ round, news, onClose }: { round: number; news: NewsItem[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-4 grid place-items-center overflow-y-auto">
      <div className="w-full max-w-2xl bg-card rounded-2xl border border-border p-6">
        <div className="text-celeste font-display tracking-[0.3em] text-xs">RESUMEN</div>
        <h2 className="font-display text-4xl mb-4">FECHA {round}</h2>
        {news.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin noticias destacadas esta fecha.</p>
        ) : (
          <ul className="space-y-2">
            {news.map((n, i) => (
              <li key={i} className="flex gap-3 items-start p-3 rounded-lg bg-background border border-border">
                <span className="text-2xl leading-none">{n.icon}</span>
                <span className="text-sm">{n.text}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 text-right">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-celeste text-primary-foreground font-display tracking-wider">
            CONTINUAR
          </button>
        </div>
      </div>
    </div>
  );
}
