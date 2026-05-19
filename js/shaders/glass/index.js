// =========================================================
// GLASS SHADER — manifest
// =========================================================
// A refraction-based material: ornament samples the background
// behind it with a normal-driven UV offset, optionally blurred
// for a frosted look. No iridescence — keep it clean.
//
import { vertexShader }       from './vertex.glsl.js';
import { fragmentShader }     from './fragment.glsl.js';
import { createUniforms }     from './uniforms.js';
import { initGlassControls }  from './controls.js';
import { defaults }           from './defaults.js';

function serializeForExport(snapshot) {
  const mat = snapshot?.material ?? defaults.material;

  const constants = `
const TRANSPARENCY = ${mat.transparency};
const REFRACTION   = ${mat.refraction};
const FROST        = ${mat.frost};
`.trim();

  const uniforms = `
    u_transparency: { value: TRANSPARENCY },
    u_refraction:   { value: REFRACTION },
    u_frost:        { value: FROST },
`.trim();

  return { constants, uniforms };
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
