// =========================================================
// CHROMATIC ABERRATION EFFECT — uniforms
// =========================================================
import { defaults } from './defaults.js';

export function createUniforms() {
  return {
    u_caStrength: { value: defaults.enabled ? defaults.strength : 0.0 },
  };
}
