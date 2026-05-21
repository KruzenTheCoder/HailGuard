import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGO_ASPECT = 1376 / 1015;

export function BrandLogo({
  height = 40,
  className,
}: {
  height?: number;
  className?: string;
}) {
  const width = Math.round(height * LOGO_ASPECT);
  return (
    <Image
      src="/hailguard-logo.png"
      alt="HailGuard Zone Pass"
      width={width}
      height={height}
      priority
      className={cn("object-contain", className)}
    />
  );
}
