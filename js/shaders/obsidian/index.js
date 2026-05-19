// =========================================================
// OBSIDIAN MATERIAL — manifest
// =========================================================
// Dark-glass material inspired by D20 dice reference: near-black body,
// coloured inner attenuation, sharp clearcoat highlight, fresnel rim.
//
import { vertexShader }   from './vertex.glsl.js';
import { fragmentShader } from './fragment.glsl.js';
import { createUniforms } from './uniforms.js';
import { initObsidianControls } from './controls.js';
import { defaults } from './defaults.js';

function serializeForExport(snapshot) {
  const mat = snapshot?.material ?? defaults.material;
  const lit = defaults.lighting; // preset; Lighting effect overrides via its own serializer

  const constants = `
const BASE_COLOR_HEX   = ${JSON.stringify(mat.baseColor)};
const ACCENT_COLOR_HEX = ${JSON.stringify(mat.accentColor)};
const ACCENT_STRENGTH  = ${mat.accentStrength};
const REFRACTION       = ${mat.refraction};
const FRESNEL          = ${mat.fresnel};
const FRESNEL_POWER    = ${mat.fresnelPower};
const DIFFUSE_PRESET   = ${lit.diffuse};
const SPECULAR_PRESET  = ${lit.specular};
const SHININESS_PRESET = ${lit.shininess};
const HEIGHT_PRESET    = ${lit.height};
`.trim();

  const uniformEntries = `
    u_baseColor:      { value: hexToVec3(BASE_COLOR_HEX) },
    u_accentColor:    { value: hexToVec3(ACCENT_COLOR_HEX) },
    u_accentStrength: { value: ACCENT_STRENGTH },
    u_refraction:     { value: REFRACTION },
    u_fresnel:        { value: FRESNEL },
    u_fresnelPower:   { value: FRESNEL_POWER },
    u_diffuse:        { value: DIFFUSE_PRESET },
    u_specular:       { value: SPECULAR_PRESET },
    u_shininess:      { value: SHININESS_PRESET },
    u_lightHeight:    { value: HEIGHT_PRESET },
`.trim();

  return { constants, uniformEntries };
}

export const obsidianShader = {
  id: 'obsidian',
  name: 'Obsidian',
  description: 'Dark glass with a coloured inner glow, fresnel rim, and clearcoat highlight. Inspired by D20 obsidian dice.',
  vertexShader,
  fragmentShader,
  createUniforms,
  initControls: initObsidianControls,
  defaults,
  serializeForExport,
};
