// =========================================================
// SOLID MATERIAL — manifest
// =========================================================
import { vertexShader }   from './vertex.glsl.js';
import { fragmentShader } from './fragment.glsl.js';
import { createUniforms } from './uniforms.js';
import { initSolidControls } from './controls.js';
import { defaults } from './defaults.js';

function serializeForExport(snapshot) {
  const mat = snapshot?.material ?? defaults.material;
  const lit = defaults.lighting;
  const amb = defaults.ambient;

  const constants = `
const BASE_COLOR_HEX    = ${JSON.stringify(mat.baseColor)};
const F0_COLOR_HEX      = ${JSON.stringify(mat.f0Color ?? defaults.material.f0Color)};
const ROUGHNESS         = ${mat.roughness ?? defaults.material.roughness};
const REFRACTION        = ${typeof mat.refraction === 'number' ? mat.refraction : defaults.material.refraction};
const REFRACTION_MIX    = ${mat.refractionMix ?? defaults.material.refractionMix};
const FROST             = ${mat.frost ?? defaults.material.frost};
const SSS_COLOR_HEX     = ${JSON.stringify(mat.sssColor ?? defaults.material.sssColor)};
const SSS_STRENGTH      = ${mat.sssStrength ?? defaults.material.sssStrength};
const FRESNEL           = ${mat.fresnel ?? defaults.material.fresnel};
const FRESNEL_POWER     = ${mat.fresnelPower ?? defaults.material.fresnelPower};
const BLOB_ENABLED      = ${mat.blobEnabled !== false ? 1.0 : 0.0};
const BLOB_RADIUS       = ${mat.blobRadius ?? defaults.material.blobRadius};

const DIFFUSE_PRESET    = ${lit.diffuse};
const SPECULAR_PRESET   = ${lit.specular};
const SHININESS_PRESET  = ${lit.shininess};
const HEIGHT_PRESET     = ${lit.height};
const LIGHT_COLOR_HEX   = ${JSON.stringify(lit.color)};
const AMBIENT_STRENGTH  = ${lit.ambientStrength};
const SKY_HEX           = ${JSON.stringify(amb.sky)};
const GROUND_HEX        = ${JSON.stringify(amb.ground)};
const HALO_BASE_HEX     = "#ffffff";
const HALO_BASE_INT     = 0.32;
`.trim();

  const uniformEntries = `
    u_baseColor:         { value: hexToVec3(BASE_COLOR_HEX) },
    u_f0:                { value: hexToVec3(F0_COLOR_HEX) },
    u_roughness:         { value: ROUGHNESS },
    u_refraction:        { value: REFRACTION },
    u_refractionMix:     { value: REFRACTION_MIX },
    u_frost:             { value: FROST },
    u_sssColor:          { value: hexToVec3(SSS_COLOR_HEX) },
    u_sssStrength:       { value: SSS_STRENGTH },
    u_fresnel:           { value: FRESNEL },
    u_fresnelPower:      { value: FRESNEL_POWER },
    u_blobEnabled:       { value: BLOB_ENABLED },
    u_blobRadius:        { value: BLOB_RADIUS },
    u_diffuse:           { value: DIFFUSE_PRESET },
    u_specular:          { value: SPECULAR_PRESET },
    u_shininess:         { value: SHININESS_PRESET },
    u_lightHeight:       { value: HEIGHT_PRESET },
    u_lightColor:        { value: hexToVec3(LIGHT_COLOR_HEX) },
    u_ambientStrength:   { value: AMBIENT_STRENGTH },
    u_skyColor:          { value: hexToVec3(SKY_HEX) },
    u_groundColor:       { value: hexToVec3(GROUND_HEX) },
    u_haloBaseColor:     { value: hexToVec3(HALO_BASE_HEX) },
    u_haloBaseIntensity: { value: HALO_BASE_INT },
`.trim();

  return { constants, uniformEntries };
}

export const solidShader = {
  id: 'solid',
  name: 'Solid',
  description: 'Unified solid material — silver, dark glass, porcelain, and everything between via the slider set.',
  vertexShader,
  fragmentShader,
  createUniforms,
  initControls: initSolidControls,
  defaults,
  serializeForExport,
};
