/**
 * Regenerates raster brand assets from the stacked-sheet SVG geometry
 * (keep in sync with `app/components/nota-logo.tsx` and `public/favicon.svg`).
 *
 * Usage (repo root): `npm run generate:nota-icons`
 *
 * Outputs:
 * - `public/apple-touch-icon.png` (180×180, light background)
 * - `../nota-electron/buildResources/icon.icns` (macOS only, via iconutil)
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTA_APP_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(NOTA_APP_ROOT, 'public');
const ELECTRON_BUILD_RESOURCES = path.resolve(
  NOTA_APP_ROOT,
  '..',
  'nota-electron',
  'buildResources',
);

/** Same geometry as favicon / NotaLogo; light-mode fills for raster export. */
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44">
  <rect x="4" y="4" width="30" height="30" rx="5.5" fill="#171717" fill-opacity="0.35"/>
  <rect x="7" y="7" width="30" height="30" rx="5.5" fill="#171717" fill-opacity="0.7"/>
  <rect x="10" y="10" width="30" height="30" rx="5.5" fill="#171717" fill-opacity="1"/>
</svg>`;

function pngFromMark(size) {
  return sharp(Buffer.from(MARK_SVG)).resize(size, size).png();
}

async function writeAppleTouchIcon() {
  const markSize = 140;
  const markBuf = await pngFromMark(markSize).toBuffer();
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: markBuf, gravity: 'centre' }])
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Wrote public/apple-touch-icon.png');
}

const ICONSET_SIZES = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024],
];

async function writeIcns() {
  if (process.platform !== 'darwin') {
    console.warn(
      'Skipping icon.icns (iconutil requires macOS). Run this script on a Mac to refresh Electron icons.',
    );
    return;
  }

  const iconsetDir = path.join(
    os.tmpdir(),
    `nota-brand-${Date.now()}-${process.pid}.iconset`,
  );
  fs.mkdirSync(iconsetDir, { recursive: true });

  try {
    for (const [filename, size] of ICONSET_SIZES) {
      const outPath = path.join(iconsetDir, filename);
      await pngFromMark(size).toFile(outPath);
    }

    const icnsOut = path.join(ELECTRON_BUILD_RESOURCES, 'icon.icns');
    execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', icnsOut], {
      stdio: 'inherit',
    });
    console.log('Wrote', icnsOut);
  } finally {
    fs.rmSync(iconsetDir, { recursive: true, force: true });
  }
}

await writeAppleTouchIcon();
await writeIcns();
