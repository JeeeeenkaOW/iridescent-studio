// =========================================================
// DISPLACEMENT EFFECT — uniforms
// =========================================================
import { defaults } from './defaults.js';

export function createUniforms() {
  return {
    // Off at mount: enabled flag is held by the Effects host, but the
    // uniform strength is what the shader actually reads. We start at
    // 0 so the effect is a no-op until the toggle flips on.
    u_dispStrength: { value: 0.0 },
    u_dispScale:    { value: defaults.scale },
    u_dispSpeed:    { value: defaults.speed },
  };
}
