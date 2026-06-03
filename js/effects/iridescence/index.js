// =========================================================
// IRIDESCENCE EFFECT — manifest
// =========================================================
// Palette engine is a LUT (256×1 DataTexture); see lut.js and
// uniforms.js. Two modes: 'pearl' (Pearl cosine baked into LUT) and
// 'custom' (user-defined gradient stops). The shader is identical
// for both — it just samples u_iriLUT at fract(t + u_iriHueShift).
//
// Bloom reads `iridescence(...)` from this effect's helpers to tint
// the halo when iridescence is enabled. The function name and shape
// are unchanged from the cosine era — only the palette implementation
// moved into the LUT.
//
// SHADER HTML EXPORT: the LUT (256 RGBA bytes = 1024 entries) is
// baked into the exported file as a base64 string. The exported page
// reconstructs a DataTexture from it. Custom-mode brand-color
// gradients export cleanly with this — the exported HTML contains
// exactly the colors the user picked.
//
import { defaults, PEARL_BASIS } from './defaults.js';
import { createUniforms } from './uniforms.js';
import { uniforms as uniformsGlsl, helpers as helpersGlsl, apply as applyGlsl } from './glsl.js';
import { initControls } from './controls.js';
import { generatePearlLUT, generateStopsLUT, LUT_SIZE } from './lut.js';

function lutToBase64(uint8) {
  // btoa needs a binary string. 1024 bytes fits comfortably in one
  // String.fromCharCode call without blowing stack limits.
  let s = '';
  for (let i = 0; i < uint8.length; i++) s += String.fromCharCode(uint8[i]);
  return btoa(s);
}

function serializeForExport(snapshot, enabled) {
  const intensity = snapshot?.intensity ?? defaults.intensity;
  const hue       = snapshot?.hue ?? defaults.hue;
  const mode      = snapshot?.mode ?? defaults.mode;
  const stops     = snapshot?.stops ?? defaults.stops;
  const iriIntensity = enabled ? intensity : 0;
  const hueShift = (hue % 360) / 360;

  // Bake the LUT for whichever mode the user has active.
  const lutData = (mode === 'custom')
    ? generateStopsLUT(stops, LUT_SIZE)
    : generatePearlLUT(LUT_SIZE);

  const constants = `
const IRI_INTENSITY  = ${iriIntensity};
const IRI_HUE_SHIFT  = ${hueShift};
const IRI_LUT_BASE64 = ${JSON.stringify(lutToBase64(lutData))};
const IRI_LUT_SIZE   = ${LUT_SIZE};
function decodeIriLUT(){
  const bin = atob(IRI_LUT_BASE64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const tex = new THREE.DataTexture(u8, IRI_LUT_SIZE, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}
`.trim();

  const uniformEntries = `
    u_iriLUT:       { value: decodeIriLUT() },
    u_iriHueShift:  { value: IRI_HUE_SHIFT },
    u_iriIntensity: { value: IRI_INTENSITY },
`.trim();

  return { constants, uniformEntries };
}

export const iridescenceEffect = {
  id: 'iridescence',
  name: 'Iridescence',
  defaults,
  createUniforms,
  uniformsGlsl,
  helpersGlsl,
  applyGlsl,
  initControls,
  serializeForExport,
};
