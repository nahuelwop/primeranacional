import { useState } from "react";
import { useSponsors, money, type Sponsor, type SponsorDeal } from "@/lib/sponsors";

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        return (
          <span key={i} className="relative text-base leading-none text-muted-foreground/40">
            ★
            <span className="absolute inset-0 overflow-hidden text-gold" style={{ width: `${fill * 100}%` }}>★</span>
          </span>
        );
      })}
    </span>
  );
}

function Logo({ s, size = 56 }: { s: Sponsor; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl border border-border/60 overflow-hidden"
      style={{
        width: size, height: size,
        background: `linear-gradient(150deg, ${s.color}33, oklch(0.18 0.04 250 / 0.9))`,
        boxShadow: `0 0 22px -8px ${s.color}`,
      }}>
      {s.logo_url
        ? <img src={s.logo_url} alt={`Logo de ${s.name}`} loading="lazy" className="h-full w-full object-contain p-1.5" />
        : <span className="font-display text-xl" style={{ color: s.color }}>{s.name.slice(0, 2).toUpperCase()}</span>}
    </span>
  );
}

function SponsorCard({ s, featured, onAccept, onNegotiate, onReject, disabled }: {
  s: Sponsor; featured?: boolean;
  onAccept: (s: Sponsor, mult: number) => void;
  onNegotiate: (s: Sponsor) => void;
  onReject: (s: Sponsor) => void;
  disabled?: boolean;
}) {
  return (
    <article className={`hud-card sponsor-card relative p-4 ${featured ? "sponsor-featured" : ""}`}>
      {featured && (
        <span className="sponsor-flag font-display text-[11px] tracking-[0.18em]">★ DESTACADO</span>
      )}
      <header className="flex items-start gap-3">
        <Logo s={s} size={featured ? 68 : 56} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl tracking-wide truncate">{s.name.toUpperCase()}</h3>
          <p className="text-xs text-muted-foreground truncate">{s.slogan}</p>
        </div>
        <div className="hidden sm:block text-right shrink-0">
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Prestigio:</div>
          <Stars value={Number(s.prestige)} />
        </div>
      </header>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <dl className="sponsor-box space-y-1.5 p-3 text-xs">
          <div className="flex items-center gap-2"><span>🪙</span><dt className="text-muted-foreground">Pago inicial:</dt><dd className="ml-auto font-display tabular-nums">{money(s.initial_payment)}</dd></div>
          <div className="flex items-center gap-2"><span>💵</span><dt className="text-muted-foreground">Pago semanal:</dt><dd className="ml-auto font-display tabular-nums">{money(s.weekly_payment)}</dd></div>
          <div className="flex items-center gap-2"><span>🏆</span><dt className="text-muted-foreground">Bono por objetivos:</dt><dd className="ml-auto font-display tabular-nums">{money(s.bonus_payment)}</dd></div>
        </dl>
        <div className="sponsor-box p-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><span>🎯</span>Objetivos:</div>
          <ul className="space-y-0.5">
            {s.objectives.map(o => <li key={o} className="truncate">• {o}</li>)}
            {s.objectives.length === 0 && <li className="text-muted-foreground">Sin objetivos.</li>}
          </ul>
        </div>
      </div>

      <div className="mt-2 sponsor-box flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-xs text-muted-foreground">
        <span>🕐 Duración: <span className="text-foreground">{s.duration_seasons} temporada{s.duration_seasons > 1 ? "s" : ""}</span></span>
        {s.conditions && <span>🏟️ {s.conditions}</span>}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button disabled={disabled} onClick={() => onAccept(s, 1)} data-sfx="accept"
          className="sponsor-btn sponsor-btn-accept">✔ Aceptar</button>
        <button disabled={disabled} onClick={() => onNegotiate(s)} className="sponsor-btn sponsor-btn-neutral">✎ Negociar</button>
        <button disabled={disabled} onClick={() => onReject(s)} className="sponsor-btn sponsor-btn-reject">✕ Rechazar</button>
      </div>
    </article>
  );
}

export function SponsorsPanel({ budget, deal, season, onSign, onCancel }: {
  budget: number;
  deal?: SponsorDeal | null;
  season: number;
  onSign: (deal: SponsorDeal) => void;
  onCancel: () => void;
}) {
  const { sponsors, loading } = useSponsors(true);
  const [rejected, setRejected] = useState<string[]>([]);
  const visible = sponsors.filter(s => !rejected.includes(s.id));
  const [featured, ...rest] = [...visible].sort((a, b) => Number(b.featured) - Number(a.featured));

  function sign(s: Sponsor, mult: number) {
    onSign({
      sponsorId: s.id, name: s.name, color: s.color, logo_url: s.logo_url,
      initial: Math.round(s.initial_payment * mult),
      weekly: Math.round(s.weekly_payment * mult),
      bonus: Math.round(s.bonus_payment * mult),
      seasons: s.duration_seasons, since: season,
    });
  }

  function negotiate(s: Sponsor) {
    const luck = Math.random();
    if (luck < 0.45) {
      if (confirm(`${s.name} acepta mejorar la oferta un 15%.\n¿Firmás el contrato?`)) sign(s, 1.15);
    } else if (luck < 0.8) {
      if (confirm(`${s.name} mantiene la oferta original.\n¿Firmás igual?`)) sign(s, 1);
    } else {
      alert(`${s.name} se ofendió con la contraoferta y baja las condiciones un 10%.`);
      if (confirm("¿Firmás igual con las condiciones reducidas?")) sign(s, 0.9);
    }
  }

  function reject(s: Sponsor) { setRejected(r => [...r, s.id]); }

  return (
    <section className="space-y-3">
      <header className="hud-card sponsor-header flex flex-wrap items-center gap-4 p-4">
        <span className="text-3xl">🤝</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl sm:text-3xl tracking-[0.06em]">PATROCINADORES DISPONIBLES</h2>
          <p className="text-xs text-muted-foreground">Mejora los ingresos del club aceptando acuerdos comerciales con empresas de la región.</p>
        </div>
        <div className="sponsor-box flex items-center gap-3 px-4 py-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-hud-green/20 text-hud-green text-lg">$</span>
          <span>
            <span className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Presupuesto actual:</span>
            <span className="block font-display text-xl text-hud-green tabular-nums">{money(budget)}</span>
          </span>
        </div>
      </header>

      {deal && (
        <div className="hud-card flex flex-wrap items-center gap-3 p-4">
          <span className="text-[11px] uppercase tracking-[0.18em] text-hud-green">Contrato vigente</span>
          <span className="font-display text-lg">{deal.name}</span>
          <span className="text-xs text-muted-foreground">
            {money(deal.weekly)} por fecha · bono {money(deal.bonus)} · {deal.seasons} temporada(s) desde T{deal.since}
          </span>
          <button onClick={onCancel} className="ml-auto sponsor-btn sponsor-btn-reject px-4">Rescindir</button>
        </div>
      )}

      {loading && <div className="hud-card p-8 text-center text-muted-foreground font-display tracking-widest">CARGANDO OFERTAS…</div>}
      {!loading && visible.length === 0 && (
        <div className="hud-card p-8 text-center text-sm text-muted-foreground">
          Todavía no hay patrocinadores cargados. El administrador puede crearlos desde el panel de administración.
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-3 md:grid-cols-2">
        {featured && (
          <div className="hud-rise"><SponsorCard s={featured} featured disabled={!!deal}
            onAccept={sign} onNegotiate={negotiate} onReject={reject} /></div>
        )}
        {rest.map((s, i) => (
          <div key={s.id} className="hud-rise" style={{ animationDelay: `${(i + 1) * 60}ms` }}>
            <SponsorCard s={s} disabled={!!deal} onAccept={sign} onNegotiate={negotiate} onReject={reject} />
          </div>
        ))}
      </div>

      <p className="hud-card px-4 py-3 text-xs">
        <span className="text-hud-green font-display tracking-wide">💡 Consejo: </span>
        Los patrocinadores más prestigiosos ofrecen mejores condiciones, pero también objetivos más exigentes. ¡Negocia para conseguir el mejor acuerdo!
      </p>
    </section>
  );
}
