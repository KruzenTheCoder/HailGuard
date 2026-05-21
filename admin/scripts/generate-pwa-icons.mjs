// Generates PWA PNG icons from the HailGuard hexagon-pin mark using sharp.
// Run: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const NAVY = "#0D2236";
const GREEN = "#16BE66";
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// The mark is authored in a 64x64 viewBox (matches components/brand-logo).
const MARK = `
  <polygon points="32,3 57,18 57,46 32,61 7,46 7,18" fill="none" stroke="${GREEN}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M32 17 C25.9 17 21 21.9 21 28 C21 37 32 48 32 48 C32 48 43 37 43 28 C43 21.9 38.1 17 32 17 Z" fill="${GREEN}"/>
  <circle cx="32" cy="28" r="4.6" fill="${NAVY}"/>
`;

/** Build a 512x512 SVG. `rounded` for normal icons; `markScale` controls safe-zone. */
function buildSvg({ rounded, markScale }) {
  const size = 512;
  const markPx = 64 * markScale;
  const offset = (size - markPx) / 2;
  const bg = rounded
    ? `<rect width="${size}" height="${size}" rx="96" ry="96" fill="${NAVY}"/>`
    : `<rect width="${size}" height="${size}" fill="${NAVY}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg}
    <g transform="translate(${offset},${offset}) scale(${markScale})">${MARK}</g>
  </svg>`;
}

async function render(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(publicDir, file));
  console.log("wrote", file);
}

const any = buildSvg({ rounded: true, markScale: 5 }); // mark ~320px, centered
const maskable = buildSvg({ rounded: false, markScale: 4 }); // mark ~256px, safe zone

await render(any, 192, "icon-192.png");
await render(any, 512, "icon-512.png");
await render(maskable, 512, "icon-maskable-512.png");
