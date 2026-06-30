// =========================================================
// SCRATCHES EFFECT — uniforms
// =========================================================
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function createUniforms() {
  return {
    // u_scratchStrength starts at 0 (no-op) until the toggle flips on.
    u_scratchStrength: { value: 0.0 },
    u_scratchScale:    { value: defaults.density },
    u_scratchAngle:    { value: defaults.angle * Math.PI / 180 },
    u_scratchCoverage: { value: defaults.coverage },
    u_scratchColor:    { value: hexToVec3(defaults.color) },
  };
}
