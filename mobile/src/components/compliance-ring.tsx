import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type ComplianceRingProps = {
  /** 0–100 */
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
};

export function ComplianceRing({ percent, size = 88, stroke = 9, color }: ComplianceRingProps) {
  const theme = useTheme();
  const ringColor = color ?? theme.primary;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={theme.border}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={ringColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        rotation={-90}
        originX={center}
        originY={center}
      />
    </Svg>
  );
}
