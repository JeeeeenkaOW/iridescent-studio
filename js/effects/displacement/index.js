// =========================================================
// DISPLACEMENT EFFECT — manifest
// =========================================================
// Heat-haze UV warp. Off by default. Works on either material.
//
import { defaults } from './defaults.js';
import { createUniforms } from './uniforms.js';
import { uniforms as uniformsGlsl, helpers as helpersGlsl, apply as applyGlsl } from './glsl.js';
import { initControls } from './controls.js';

function serializeForExport(snap, enabled) {
  if (!enabled) {
    // Disabled → bake strength=0 so the apply branch is skipped.
    const constants = `
const DISP_STRENGTH = 0.0;
const DISP_SCALE    = ${defaults.scale};
const DISP_SPEED    = ${defaults.speed};
`.trim();
    const uniformEntries = `
    u_dispStrength: { value: DISP_STRENGTH },
    u_dispScale:    { value: DISP_SCALE },
    u_dispSpeed:    { value: DISP_SPEED },
`.trim();
    return { constants, uniformEntries };
  }
  const constants = `
const DISP_STRENGTH = ${(snap?.strength ?? defaults.strength) * 0.04};
const DISP_SCALE    = ${snap?.scale ?? defaults.scale};
const DISP_SPEED    = ${snap?.speed ?? defaults.speed};
`.trim();
  const uniformEntries = `
    u_dispStrength: { value: DISP_STRENGTH },
    u_dispScale:    { value: DISP_SCALE },
    u_dispSpeed:    { value: DISP_SPEED },
`.trim();
  return { constants, uniformEntries };
}

export const displacementEffect = {
  id: 'displacement',
  name: 'Displacement',
  defaults,
  createUniforms,
  uniformsGlsl,
  helpersGlsl,
  applyGlsl,
  initControls,
  serializeForExport,
};
