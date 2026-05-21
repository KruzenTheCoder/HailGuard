export function BrandLogo({
  size = 32,
  color = "#16be66",
  hole = "#0d2236",
}: {
  size?: number;
  color?: string;
  hole?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <polygon
        points="32,3 57,18 57,46 32,61 7,46 7,18"
        stroke={color}
        strokeWidth={3}
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M32 17 C25.9 17 21 21.9 21 28 C21 37 32 48 32 48 C32 48 43 37 43 28 C43 21.9 38.1 17 32 17 Z"
        fill={color}
      />
      <circle cx={32} cy={28} r={4.6} fill={hole} />
    </svg>
  );
}
