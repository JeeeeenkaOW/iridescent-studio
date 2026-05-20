// =========================================================
// GLASS MATERIAL — manifest
// =========================================================
import { vertexShader }       from './vertex.glsl.js';
import { fragmentShader }     from './fragment.glsl.js';
import { createUniforms }     from './uniforms.js';
import { initGlassControls }  from './controls.js';
import { defaults }           from './defaults.js';

function serializeForExport(snapshot) {
  const mat = snapshot?.material ?? defaults.material;
  const lit = defaults.lighting;
  const amb = defaults.ambient;

  const constants = `
const TRANSPARENCY     = ${mat.transparency};
const REFRACTION       = ${mat.refraction};
const FROST            = ${mat.frost};
const F0_COLOR_HEX     = ${JSON.stringify(mat.f0Color ?? defaults.material.f0Color)};
const DIFFUSE_PRESET   = ${lit.diffuse};
const SPECULAR_PRESET  = ${lit.specular};
const SHININESS_PRESET = ${lit.shininess};
const HEIGHT_PRESET    = ${lit.height};
const LIGHT_COLOR_HEX  = ${JSON.stringify(lit.color)};
const SKY_HEX          = ${JSON.stringify(amb.sky)};
const GROUND_HEX       = ${JSON.stringify(amb.ground)};
const HALO_BASE_HEX    = "#b2cce6";
const HALO_BASE_INT    = 0.25;
`.trim();

  const uniformEntries = `
    u_transparency:      { value: TRANSPARENCY },
    u_refraction:        { value: REFRACTION },
    u_frost:             { value: FROST },
    u_f0:                { value: hexToVec3(F0_COLOR_HEX) },
    u_diffuse:           { value: DIFFUSE_PRESET },
    u_specular:          { value: SPECULAR_PRESET },
    u_shininess:         { value: SHININESS_PRESET },
    u_lightHeight:       { value: HEIGHT_PRESET },
    u_lightColor:        { value: hexToVec3(LIGHT_COLOR_HEX) },
    u_skyColor:          { value: hexToVec3(SKY_HEX) },
    u_groundColor:       { value: hexToVec3(GROUND_HEX) },
    u_haloBaseColor:     { value: hexToVec3(HALO_BASE_HEX) },
    u_haloBaseIntensity: { value: HALO_BASE_INT },
`.trim();

  return { constants, uniformEntries };
}

export const glassShader = {
  id: 'glass',
  name: 'Glass',
  description: 'Refractive material with Schlick Fresnel grazing-angle reflectance. Background reads through the ornament with normal-driven distortion and optional frost.',
  vertexShader,
  fragmentShader,
  createUniforms,
  initControls: initGlassControls,
  defaults,
  serializeForExport,
};
