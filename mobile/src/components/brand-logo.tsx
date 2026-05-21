import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type BrandLogoProps = {
  size?: number;
  /** Mark colour. Defaults to the theme's brand green. */
  color?: string;
  /** Colour of the pin's inner hole (sits behind the mark). */
  hole?: string;
};

/** HailGuard mark — a hexagon badge with a location pin. */
export function BrandLogo({ size = 44, color, hole = '#0D2236' }: BrandLogoProps) {
  const theme = useTheme();
  const stroke = color ?? theme.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Polygon
        points="32,3 57,18 57,46 32,61 7,46 7,18"
        stroke={stroke}
        strokeWidth={3}
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M32 17 C25.9 17 21 21.9 21 28 C21 37 32 48 32 48 C32 48 43 37 43 28 C43 21.9 38.1 17 32 17 Z"
        fill={stroke}
      />
      <Circle cx={32} cy={28} r={4.6} fill={hole} />
    </Svg>
  );
}
