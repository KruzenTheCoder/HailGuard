import { Image } from 'expo-image';

const LOGO = require('../../assets/images/hailguard-logo.png');
const LOGO_ASPECT = 1376 / 1015;

export function BrandLogo({ height = 72 }: { height?: number }) {
  return (
    <Image
      source={LOGO}
      style={{ height, width: height * LOGO_ASPECT }}
      contentFit="contain"
      accessibilityLabel="HailGuard Zone Pass"
    />
  );
}
