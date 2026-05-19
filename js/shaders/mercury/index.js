// =========================================================
// MERCURY MATERIAL — manifest
// =========================================================
// A material manifest is a self-contained bundle: its own GLSL,
// uniforms, sidebar controls, defaults. The top-level material picker
// (controls/shader.js) swaps between manifests like this.
//
// Material exports vs effect exports:
//   - Material owns base appearance + lighting *defaults*.
//   - Effects own iridescence / chromatic aberration / lighting
//     overrides. Their serializers run alongside the material's.
//
import { vertexShader }   from './vertex.glsl.js';
import { fragmentShader } from './fragment.glsl.js';
import { createUniforms } from './uniforms.js';
import { initMercuryControls } from './controls.js';
import { defaults } from './defaults.js';

// Serializer for the HTML exporter. Returns constants + uniform
// entries for the MATERIAL only. Effect serializers run separately
// and their output is merged in by the exporter.
function serializeForExport(snapshot) {
  const mat = snapshot?.material ?? defaults.material;
  const lit = defaults.lighting; // preset; Lighting effect overrides via its own serializer

  const constants = `
const BASE_COLOR_HEX = ${JSON.stringify(mat.baseColor)};
const DIFFUSE_PRESET   = ${lit.diffuse};
const SPECULAR_PRESET  = ${lit.specular};
const SHININESS_PRESET = ${lit.shininess};
const HEIGHT_PRESET    = ${lit.height};
`.trim();

  const uniformEntries = `
    u_baseColor:   { value: hexToVec3(BASE_COLOR_HEX) },
    u_diffuse:     { value: DIFFUSE_PRESET },
    u_specular:    { value: SPECULAR_PRESET },
    u_shininess:   { value: SHININESS_PRESET },
    u_lightHeight: { value: HEIGHT_PRESET },
`.trim();

  return { constants, uniformEntries };
}

export const mercuryShader = {
  id: 'mercury',
  name: 'Mercury',
  description: 'Warm silver Blinn-Phong with a mercury blob at the cursor. Layer iridescence and other effects on top.',
  vertexShader,
  fragmentShader,
  createUniforms,
  initControls: initMercuryControls,
  defaults,
  serializeForExport,
};
