import { Team } from "@/data/teams";

// Si el equipo tiene logoUrl (oficial o subido por admin), lo mostramos como
// imagen. Si no, caemos al SVG estilizado con los colores del club.
export function Shield({ team, size = 48 }: { team: Team; size?: number }) {
  if (team.logoUrl) {
    return (
      <img
        src={team.logoUrl}
        alt={team.name}
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size, objectFit: "contain" }}
        className="drop-shadow-md"
      />
    );
  }
  const { primary, secondary, short, stripe = "solid" } = team;
  const id = `g-${team.id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label={team.name}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={primary} />
          <stop offset="1" stopColor={primary} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path
        d="M32 2 L60 10 V32 C60 48 46 58 32 62 C18 58 4 48 4 32 V10 Z"
        fill={`url(#${id})`}
        stroke={secondary}
        strokeWidth="2.5"
      />
      {stripe === "vertical" && (
        <rect x="26" y="6" width="12" height="50" fill={secondary} opacity="0.85" />
      )}
      {stripe === "horizontal" && (
        <rect x="6" y="26" width="52" height="12" fill={secondary} opacity="0.85" />
      )}
      {stripe === "sash" && (
        <polygon points="6,18 18,6 58,46 46,58" fill={secondary} opacity="0.85" />
      )}
      <text
        x="32" y="40" textAnchor="middle"
        fontFamily="Bebas Neue, Archivo Black, sans-serif"
        fontSize="18" fontWeight="900"
        fill={secondary === "#ffffff" || secondary === "#f6c419" ? "#0a1424" : "#ffffff"}
        stroke="#0a1424" strokeWidth="0.6"
      >
        {short}
      </text>
    </svg>
  );
}

export function Jersey({ team, size = 56 }: { team: Team; size?: number }) {
  const { primary, secondary, stripe = "solid" } = team;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path
        d="M16 8 L24 4 L40 4 L48 8 L60 14 L54 24 L46 22 L46 60 L18 60 L18 22 L10 24 L4 14 Z"
        fill={primary} stroke="#0a1424" strokeWidth="1.5"
      />
      {stripe === "vertical" && (
        <>
          <rect x="22" y="6" width="6" height="54" fill={secondary} />
          <rect x="36" y="6" width="6" height="54" fill={secondary} />
        </>
      )}
      {stripe === "horizontal" && (
        <rect x="18" y="32" width="28" height="8" fill={secondary} />
      )}
      {stripe === "sash" && (
        <polygon points="18,22 46,40 46,46 18,28" fill={secondary} />
      )}
    </svg>
  );
}
