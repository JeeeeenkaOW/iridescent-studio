// =========================================================
// PARTICLES MATERIAL — manifest
// =========================================================
// Renders the source SVG as a field of discrete dots. Four
// independent motion modes (Drift / Rise / Twinkle / Scatter) can
// be combined. Four shapes (Circle / Square / Diamond / Ring).
// Same lighting + effects integration as Solid/Glass.
//
import { vertexShader }       from './vertex.glsl.js';
import { fragmentShader }     from './fragment.glsl.js';
import { createUniforms }     from './uniforms.js';
import { initParticlesControls } from './controls.js';
import { defaults }           from './defaults.js';

function serializeForExport(snapshot) {
  const mat = snapshot?.material ?? defaults.material;
  const lit = defaults.lighting;
  const amb = defaults.ambient;

  const constants = `
const BASE_COLOR_HEX     = ${JSON.stringify(mat.baseColor ?? defaults.material.baseColor)};
const PARTICLE_DENSITY   = ${mat.density   ?? defaults.material.density};
const PARTICLE_SIZE      = ${mat.size      ?? defaults.material.size};
const PARTICLE_JITTER    = ${mat.jitter    ?? defaults.material.jitter};
const PARTICLE_SOFTNESS  = ${mat.softness  ?? defaults.material.softness};
const PARTICLE_SHAPE     = ${mat.shape     ?? defaults.material.shape};
const MOTION_DRIFT       = ${mat.motionDrift   ?? defaults.material.motionDrift};
const MOTION_RISE        = ${mat.motionRise    ?? defaults.material.motionRise};
const MOTION_TWINKLE     = ${mat.motionTwinkle ?? defaults.material.motionTwinkle};
const MOTION_SCATTER     = ${mat.motionScatter ?? defaults.material.motionScatter};

const DIFFUSE_PRESET     = ${lit.diffuse};
const SPECULAR_PRESET    = ${lit.specular};
const SHININESS_PRESET   = ${lit.shininess};
const HEIGHT_PRESET      = ${lit.height};
const LIGHT_COLOR_HEX    = ${JSON.stringify(lit.color)};
const AMBIENT_STRENGTH   = ${lit.ambientStrength};
const SKY_HEX            = ${JSON.stringify(amb.sky)};
const GROUND_HEX         = ${JSON.stringify(amb.ground)};
const HALO_BASE_HEX      = "#ffffff";
const HALO_BASE_INT      = 0.32;
`.trim();

  const uniformEntries = `
    u_baseColor:         { value: hexToVec3(BASE_COLOR_HEX) },
    u_particleDensity:   { value: PARTICLE_DENSITY },
    u_particleSize:      { value: PARTICLE_SIZE },
    u_particleJitter:    { value: PARTICLE_JITTER },
    u_particleSoftness:  { value: PARTICLE_SOFTNESS },
    u_particleShape:    { value: PARTICLE_SHAPE },
    u_motionDrift:       { value: MOTION_DRIFT },
    u_motionRise:        { value: MOTION_RISE },
    u_motionTwinkle:     { value: MOTION_TWINKLE },
    u_motionScatter:     { value: MOTION_SCATTER },
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

export const particlesShader = {
  id: 'particles',
  name: 'Particles',
  vertexShader,
  fragmentShader,
  createUniforms,
  initControls: initParticlesControls,
  defaults,
  serializeForExport,
};
