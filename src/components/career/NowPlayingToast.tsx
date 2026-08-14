import type { MusicTrack } from "@/lib/career-music";

export function NowPlayingToast({ track, show }: { track: MusicTrack | null; show: boolean }) {
  if (!track) return null;
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-card/95 backdrop-blur border border-border shadow-xl px-3 py-2.5 max-w-xs transition-all duration-300 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      {track.cover_url ? (
        <img src={track.cover_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-secondary grid place-items-center shrink-0 text-lg">🎵</div>
      )}
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-celeste">Sonando ahora</div>
        <div className="font-display text-sm truncate">{track.title}</div>
        <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
      </div>
    </div>
  );
}
