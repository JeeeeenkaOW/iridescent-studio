// =========================================================
// EMISSIVE EFFECT — uniforms
// =========================================================
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function createUniforms() {
  return {
    // u_emissive starts at 0 so the effect is a no-op until the Effects
    // host toggle flips it on (the controls push strength when enabled).
    u_emissive:          { value: 0.0 },
    u_emissiveColor:     { value: hexToVec3(defaults.color) },
    u_emissiveScale:     { value: defaults.scale },
    u_emissiveSpeed:     { value: defaults.speed },
    u_emissiveSharpness: { value: defaults.sharpness },
  };
}
