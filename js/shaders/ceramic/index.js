// =========================================================
// CERAMIC MATERIAL — manifest
// =========================================================
import { vertexShader }   from './vertex.glsl.js';
import { fragmentShader } from './fragment.glsl.js';
import { createUniforms } from './uniforms.js';
import { initCeramicControls } from './controls.js';
import { defaults } from './defaults.js';

function serializeForExport(snapshot) {
  const mat = snapshot?.material ?? defaults.material;
  const lit = defaults.lighting;
  const amb = defaults.ambient;

  const constants = `
const BASE_COLOR_HEX    = ${JSON.stringify(mat.baseColor)};
const SSS_COLOR_HEX     = ${JSON.stringify(mat.sssColor)};
const SSS_STRENGTH      = ${mat.sssStrength};
const F0_COLOR_HEX      = ${JSON.stringify(mat.f0Color ?? defaults.material.f0Color)};
const DIFFUSE_PRESET    = ${lit.diffuse};
const SPECULAR_PRESET   = ${lit.specular};
const SHININESS_PRESET  = ${lit.shininess};
const HEIGHT_PRESET     = ${lit.height};
const LIGHT_COLOR_HEX   = ${JSON.stringify(lit.color)};
const SKY_HEX           = ${JSON.stringify(amb.sky)};
const GROUND_HEX        = ${JSON.stringify(amb.ground)};
`.trim();

  const uniformEntries = `
    u_baseColor:   { value: hexToVec3(BASE_COLOR_HEX) },
    u_sssColor:    { value: hexToVec3(SSS_COLOR_HEX) },
    u_sssStrength: { value: SSS_STRENGTH },
    u_f0:          { value: hexToVec3(F0_COLOR_HEX) },
    u_diffuse:     { value: DIFFUSE_PRESET },
    u_specular:    { value: SPECULAR_PRESET },
    u_shininess:   { value: SHININESS_PRESET },
    u_lightHeight: { value: HEIGHT_PRESET },
    u_lightColor:  { value: hexToVec3(LIGHT_COLOR_HEX) },
    u_skyColor:    { value: hexToVec3(SKY_HEX) },
    u_groundColor: { value: hexToVec3(GROUND_HEX) },
`.trim();

  return { constants, uniformEntries };
}

export const ceramicShader = {
  id: 'ceramic',
  name: 'Ceramic',
  description: 'White porcelain: matte body with soft Fresnel highlight, fake subsurface inner glow, hemisphere ambient, and ACES tonemap.',
  vertexShader,
  fragmentShader,
  createUniforms,
  initControls: initCeramicControls,
  defaults,
  serializeForExport,
};
