type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  /** Stroke colour (also drives the gradient fill). */
  color?: string;
  /** Render a soft area fill beneath the line. */
  area?: boolean;
  /** Optional aria label for assistive tech. */
  ariaLabel?: string;
};

/**
 * Tiny dependency-free SVG sparkline. Designed for KPI cards — fixed viewBox,
 * normalises the supplied series and supports a gradient area fill.
 */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  color = "#16BE66",
  area = true,
  ariaLabel,
}: SparklineProps) {
  if (data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel ?? "no data"}
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((v, i) => {
    const x = i * stepX;
    // Leave 2px of headroom top + bottom so strokes aren't clipped.
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${(points.at(-1)?.[0] ?? 0).toFixed(2)} ${height} L0 ${height} Z`;
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? "trend"}
    >
      {area ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
