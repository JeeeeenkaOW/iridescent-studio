// =========================================================
// CHROMATIC ABERRATION EFFECT — manifest
// =========================================================
import { defaults } from './defaults.js';
import { createUniforms } from './uniforms.js';
import { uniforms as uniformsGlsl, helpers as helpersGlsl, apply as applyGlsl } from './glsl.js';
import { initControls } from './controls.js';

function serializeForExport(snapshot, enabled) {
  const strength = snapshot?.strength ?? defaults.strength;
  const baked    = enabled ? strength : 0;

  const constants = `
const CA_STRENGTH    = ${baked};
`.trim();

  const uniformEntries = `
    u_caStrength: { value: CA_STRENGTH },
`.trim();

  return { constants, uniformEntries };
}

export const chromaticAberrationEffect = {
  id: 'chromaticAberration',
  name: 'Chromatic aberration',
  defaults,
  createUniforms,
  uniformsGlsl,
  helpersGlsl,
  applyGlsl,
  initControls,
  serializeForExport,
};
