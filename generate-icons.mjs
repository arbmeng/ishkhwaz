import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

// Icon/logo filenames carry this version suffix on purpose — unlike Vite's
// hashed JS/CSS output, these keep the SAME url on every normal deploy, and
// Cloudflare's edge cache (plus every browser's own cache) happily keeps
// serving old bytes under that url forever unless the url itself changes.
// Bump this (v2 -> v3 -> ...) any time the source logo actually changes;
// every reference to these files (manifest.json, index.html, in-app <img>
// tags) has to be updated to match at the same time.
const V = 'v2';

// Source is now a rendered raster mark (teal briefcase-notched "I"), not the
// old vector logo.svg — sharp resizes a PNG source just as well as an SVG one.
const source = readFileSync('./public/logo-source.png');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

await Promise.all(sizes.map(s =>
  sharp(source).resize(s, s).png().toFile(`./public/icon-${s}x${s}-${V}.png`)
    .then(() => console.log(`✓ icon-${s}x${s}-${V}.png`))
));

await sharp(source).resize(512, 512).png().toFile(`./public/logo-${V}.png`);
console.log(`✓ logo-${V}.png`);

await sharp(source).resize(180, 180).png().toFile(`./public/apple-touch-icon-${V}.png`);
console.log(`✓ apple-touch-icon-${V}.png`);

await sharp(source).resize(32, 32).png().toFile(`./public/favicon-${V}.png`);
console.log(`✓ favicon-${V}.png`);

// Maskable variants — Android (and some browsers) crop "maskable" icons into
// a circle/squircle/rounded-square using their own mask, so anything near
// the edge of a full-bleed icon gets clipped. The source logo fills almost
// the entire frame with no margin, so it needs real padding here (~66% safe
// zone) or the PWA home-screen icon comes out looking cut off.
const maskableSizes = [192, 512];
await Promise.all(maskableSizes.map(async (s) => {
  const inner = Math.round(s * 0.66);
  const resized = await sharp(source).resize(inner, inner).toBuffer();
  await sharp({ create: { width: s, height: s, channels: 3, background: '#050505' } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(`./public/maskable-${s}x${s}-${V}.png`);
  console.log(`✓ maskable-${s}x${s}-${V}.png`);
}));

console.log('All icons done!');
