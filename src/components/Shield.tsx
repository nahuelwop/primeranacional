import { useState } from "react";
import { Team } from "@/data/teams";

type ShieldProps = {
  team: Team;
  size?: number;
  eager?: boolean;
};

export function Shield({
  team,
  size = 48,
  eager = size >= 48,
}: ShieldProps) {
  const [imageError, setImageError] = useState(false);

  const logoUrl =
    typeof team.logoUrl === "string"
      ? team.logoUrl.trim()
      : "";

  const hasLogo =
    logoUrl.length > 0 && !imageError;

  if (hasLogo) {
    return (
      <img
        src={logoUrl}
        alt={team.name}
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        onError={() => setImageError(true)}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          display: "block",
        }}
        className="drop-shadow-md"
      />
    );
  }

  const {
    primary,
    secondary,
    short,
    stripe = "solid",
  } = team;

  const id =
    `shield-${team.id}-${size}`.replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    );

  const textColor =
    secondary === "#ffffff" ||
    secondary === "#f6c419"
      ? "#0a1424"
      : "#ffffff";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={team.name}
      style={{
        display: "block",
        flexShrink: 0,
      }}
    >
      <defs>
        <linearGradient
          id={id}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0"
            stopColor={primary}
          />
          <stop
            offset="1"
            stopColor={primary}
            stopOpacity="0.85"
          />
        </linearGradient>
      </defs>

      <path
        d="M32 2 L60 10 V32 C60 48 46 58 32 62 C18 58 4 48 4 32 V10 Z"
        fill={`url(#${id})`}
        stroke={secondary}
        strokeWidth="2.5"
      />

      {stripe === "vertical" && (
        <rect
          x="26"
          y="6"
          width="12"
          height="50"
          fill={secondary}
          opacity="0.85"
        />
      )}

      {stripe === "horizontal" && (
        <rect
          x="6"
          y="26"
          width="52"
          height="12"
          fill={secondary}
          opacity="0.85"
        />
      )}

      {stripe === "sash" && (
        <polygon
          points="6,18 18,6 58,46 46,58"
          fill={secondary}
          opacity="0.85"
        />
      )}

      <text
        x="32"
        y="40"
        textAnchor="middle"
        fontFamily="Bebas Neue, Archivo Black, sans-serif"
        fontSize="18"
        fontWeight="900"
        fill={textColor}
        stroke="#0a1424"
        strokeWidth="0.6"
      >
        {short}
      </text>
    </svg>
  );
}

export function Jersey({
  team,
  size = 56,
}: {
  team: Team;
  size?: number;
}) {
  const {
    primary,
    secondary,
    stripe = "solid",
  } = team;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`Camiseta de ${team.name}`}
    >
      <path
        d="M16 8 L24 4 L40 4 L48 8 L60 14 L54 24 L46 22 L46 60 L18 60 L18 22 L10 24 L4 14 Z"
        fill={primary}
        stroke="#0a1424"
        strokeWidth="1.5"
      />

      {stripe === "vertical" && (
        <>
          <rect
            x="22"
            y="6"
            width="6"
            height="54"
            fill={secondary}
          />
          <rect
            x="36"
            y="6"
            width="6"
            height="54"
            fill={secondary}
          />
        </>
      )}

      {stripe === "horizontal" && (
        <rect
          x="18"
          y="32"
          width="28"
          height="8"
          fill={secondary}
        />
      )}

      {stripe === "sash" && (
        <polygon
          points="18,22 46,40 46,46 18,28"
          fill={secondary}
        />
      )}
    </svg>
  );
}
