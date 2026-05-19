// =========================================================
// GLASS MATERIAL — manifest
// =========================================================
// Refraction-based material: ornament samples the background behind
// it with a normal-driven UV offset, optionally frosted. Effects layer
// in on top (iridescence will tint the spec & halo if enabled).
//
import { vertexShader }       from './vertex.glsl.js';
import { fragmentShader }     from './fragment.glsl.js';
import { createUniforms }     from './uniforms.js';
import { initGlassControls }  from './controls.js';
import { defaults }           from './defaults.js';

function serializeForExport(snapshot) {
  const mat = snapshot?.material ?? defaults.material;
  const lit = defaults.lighting;

  const constants = `
const TRANSPARENCY     = ${mat.transparency};
const REFRACTION       = ${mat.refraction};
const FROST            = ${mat.frost};
const DIFFUSE_PRESET   = ${lit.diffuse};
const SPECULAR_PRESET  = ${lit.specular};
const SHININESS_PRESET = ${lit.shininess};
const HEIGHT_PRESET    = ${lit.height};
`.trim();

  const uniformEntries = `
    u_transparency: { value: TRANSPARENCY },
    u_refraction:   { value: REFRACTION },
    u_frost:        { value: FROST },
    u_diffuse:      { value: DIFFUSE_PRESET },
    u_specular:     { value: SPECULAR_PRESET },
    u_shininess:    { value: SHININESS_PRESET },
    u_lightHeight:  { value: HEIGHT_PRESET },
`.trim();

  return { constants, uniformEntries };
}

export const glassShader = {
  id: 'glass',
  name: 'Glass',
  description: 'Refractive material. Background reads through the ornament with normal-driven distortion and optional frost.',
  vertexShader,
  fragmentShader,
  createUniforms,
  initControls: initGlassControls,
  defaults,
  serializeForExport,
};
