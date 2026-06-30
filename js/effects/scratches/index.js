// =========================================================
// SCRATCHES EFFECT — manifest
// =========================================================
// Directional surface scratches + uneven gloss for brushed / distressed
// metal. Off by default. Works on any material (modulates specular).
//
import { defaults } from './defaults.js';
import { createUniforms } from './uniforms.js';
import { uniforms as uniformsGlsl, helpers as helpersGlsl, apply as applyGlsl } from './glsl.js';
import { initControls } from './controls.js';

function serializeForExport(snap, enabled) {
  const strength = enabled ? (snap?.strength ?? defaults.strength) : 0.0;
  const density  = snap?.density  ?? defaults.density;
  const angle    = snap?.angle    ?? defaults.angle;
  const coverage = snap?.coverage ?? defaults.coverage;
  const color    = snap?.color    ?? defaults.color;
  const constants = `
const SCRATCH_STRENGTH = ${strength};
const SCRATCH_SCALE    = ${density};
const SCRATCH_ANGLE    = ${angle * Math.PI / 180};
const SCRATCH_COVERAGE = ${coverage};
const SCRATCH_COLOR_HEX= ${JSON.stringify(color)};
`.trim();
  const uniformEntries = `
    u_scratchStrength: { value: SCRATCH_STRENGTH },
    u_scratchScale:    { value: SCRATCH_SCALE },
    u_scratchAngle:    { value: SCRATCH_ANGLE },
    u_scratchCoverage: { value: SCRATCH_COVERAGE },
    u_scratchColor:    { value: hexToVec3(SCRATCH_COLOR_HEX) },
`.trim();
  return { constants, uniformEntries };
}

export const scratchesEffect = {
  id: 'scratches',
  name: 'Scratches',
  defaults,
  createUniforms,
  uniformsGlsl,
  helpersGlsl,
  applyGlsl,
  initControls,
  serializeForExport,
};
