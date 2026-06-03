// =========================================================
// IRIDESCENCE LUT — palette → 1D texture
// =========================================================
// Replaces the compute-the-cosine-palette-in-the-shader approach with
// a lookup texture. Two reasons:
//   1. It decouples the palette from the shader, so the same shader
//      code works for both the cosine palette ("Pearl" mode) and
//      user-defined gradient stops ("Custom" mode).
//   2. It makes the palette a piece of data we can serialize and
//      replay deterministically — including baked into Shader HTML
//      exports as a JSON array.
//
// The LUT is 256 RGB texels arranged 256×1. We use RepeatWrapping on
// wrapS so the shader's `fract(t + hueShift)` sample wraps cleanly
// across the 255→0 boundary instead of clamping to the edge texel
// (which would produce a thin discontinuity exactly where the user
// most wants smoothness).
//
// Pearl mode uses the original cosine palette `a + b·cos(2π·(c·t +
// phase))` with `a=b=0.5`, `c=1.0`, and the Pearl phase basis. This
// reproduces the legacy hue=0 look exactly when the LUT is sampled
// at u=t.
//
// Custom mode interpolates linearly between user-defined stops in a
// cyclic manner: the stop with the largest position wraps forward to
// the smallest-position stop, treating the palette as a circular
// gradient. This matches how the iridescence math uses t — it's a
// periodic field, not a bounded range.
//
import * as THREE from 'three';

export const LUT_SIZE = 256;

// Pearl phase basis. Hue rotation is applied at sample time in the
// shader (u_iriHueShift), NOT baked into the LUT, so hue drags don't
// trigger LUT regeneration — they're free.
export const PEARL_BASIS = [0.00, 0.18, 0.42];

// =========================================================
// PEARL PALETTE — cosine formula, identical to the legacy GLSL
// =========================================================
// Returns Uint8Array of size LUT_SIZE * 4 (RGBA — modern THREE
// dropped RGBFormat, so we pad alpha=255 and ignore it in the shader).
//
export function generatePearlLUT(size = LUT_SIZE) {
  const out = new Uint8Array(size * 4);
  const TAU = Math.PI * 2;
  for (let i = 0; i < size; i++) {
    const t = i / size;
    const r = 0.5 + 0.5 * Math.cos(TAU * (t + PEARL_BASIS[0]));
    const g = 0.5 + 0.5 * Math.cos(TAU * (t + PEARL_BASIS[1]));
    const b = 0.5 + 0.5 * Math.cos(TAU * (t + PEARL_BASIS[2]));
    out[i * 4]     = Math.round(Math.max(0, Math.min(1, r)) * 255);
    out[i * 4 + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
    out[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
    out[i * 4 + 3] = 255;
  }
  return out;
}

// =========================================================
// CUSTOM STOPS PALETTE — cyclic linear interpolation
// =========================================================
// stops: [{ pos: 0..1, color: '#rrggbb' }, ...] — order doesn't matter,
// we sort internally. Position values outside [0,1) are wrapped.
//
// For each LUT texel, find the two stops that bracket its position
// (treating the strip as cyclic) and lerp between their colors.
//
export function generateStopsLUT(stops, size = LUT_SIZE) {
  const out = new Uint8Array(size * 4);
  // Initialize alpha to 255 once — colour writes will fill RGB.
  for (let i = 0; i < size; i++) out[i * 4 + 3] = 255;
  if (!stops || stops.length === 0) return out;

  // Sort + normalize positions to [0,1).
  const sorted = stops
    .map(s => ({
      pos: ((s.pos % 1) + 1) % 1,
      rgb: hexToRgb(s.color),
    }))
    .sort((a, b) => a.pos - b.pos);

  // Single stop: solid color.
  if (sorted.length === 1) {
    const [r, g, b] = sorted[0].rgb;
    for (let i = 0; i < size; i++) {
      out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b;
    }
    return out;
  }

  for (let i = 0; i < size; i++) {
    const t = i / size;
    // Find the two stops bracketing t in the cyclic gradient.
    // Default to last→first (wrap segment); update if t falls inside
    // a regular forward segment.
    let lo = sorted[sorted.length - 1];
    let hi = sorted[0];
    for (let j = 0; j < sorted.length - 1; j++) {
      if (sorted[j].pos <= t && t < sorted[j + 1].pos) {
        lo = sorted[j];
        hi = sorted[j + 1];
        break;
      }
    }
    // Segment width — distance from lo.pos forward to hi.pos around
    // the cycle. If hi is earlier than lo numerically, we crossed the
    // wrap boundary, so add 1.
    let segWidth = hi.pos - lo.pos;
    if (segWidth <= 0) segWidth += 1;
    let segT = t - lo.pos;
    if (segT < 0) segT += 1;
    const f = segWidth > 0 ? segT / segWidth : 0;
    out[i * 4]     = Math.round(lo.rgb[0] + (hi.rgb[0] - lo.rgb[0]) * f);
    out[i * 4 + 1] = Math.round(lo.rgb[1] + (hi.rgb[1] - lo.rgb[1]) * f);
    out[i * 4 + 2] = Math.round(lo.rgb[2] + (hi.rgb[2] - lo.rgb[2]) * f);
  }
  return out;
}

// =========================================================
// TEXTURE FACTORY + WRITE
// =========================================================
// Creates a 256×1 RGB DataTexture with linear filtering and repeat
// wrap. Caller owns the texture; controls write into it as palette
// state changes.
//
export function makeLUTTexture(initial) {
  const data = initial || generatePearlLUT(LUT_SIZE);
  const tex = new THREE.DataTexture(data, LUT_SIZE, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function writeLUT(texture, data) {
  texture.image.data = data;
  texture.needsUpdate = true;
}

// =========================================================
// HELPERS
// =========================================================
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return [255, 255, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r, g, b) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

// Sample N stops evenly from an RGBA LUT (Uint8Array length = size*4),
// returning [{pos, color}, ...]. Used to seed Custom mode from the
// current Pearl LUT so the visual transition is continuous.
//
export function sampleLUTToStops(lutData, n = 6, sizeOverride) {
  const size = sizeOverride || (lutData.length / 4);
  const stops = [];
  for (let i = 0; i < n; i++) {
    const pos = i / n;
    const idx = Math.round(pos * size) % size;
    stops.push({
      pos,
      color: rgbToHex(lutData[idx * 4], lutData[idx * 4 + 1], lutData[idx * 4 + 2]),
    });
  }
  return stops;
}
