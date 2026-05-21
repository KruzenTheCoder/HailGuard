type BarChartProps = {
  data: number[];
  width?: number;
  height?: number;
  /** Bar fill colour. */
  color?: string;
  /** Optional secondary tint used for low bars (e.g. lighter). */
  mutedColor?: string;
  /** Bars below this threshold of max are drawn in `mutedColor`. */
  mutedThreshold?: number;
  ariaLabel?: string;
  /** Minimum visible bar height in px even when value is 0. */
  baselinePx?: number;
};

/**
 * Dependency-free vertical bar histogram. Tuned for KPI cards — fixed viewBox
 * with auto-bar-width and rounded tops.
 */
export function BarChart({
  data,
  width = 240,
  height = 64,
  color = "#16BE66",
  mutedColor,
  mutedThreshold = 0.35,
  ariaLabel,
  baselinePx = 2,
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel ?? "no data"}
      />
    );
  }

  const max = Math.max(1, ...data);
  // Tight spacing — 1px gap between bars, bars fill the remainder.
  const gap = 2;
  const barWidth = Math.max(2, (width - gap * (data.length - 1)) / data.length);
  const radius = Math.min(barWidth / 2, 3);

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel ?? "trend"}
    >
      {data.map((value, i) => {
        const ratio = value / max;
        const drawnHeight = Math.max(baselinePx, ratio * height);
        const x = i * (barWidth + gap);
        const y = height - drawnHeight;
        const fill = mutedColor && ratio < mutedThreshold ? mutedColor : color;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={drawnHeight}
            rx={radius}
            ry={radius}
            fill={fill}
          />
        );
      })}
    </svg>
  );
}
