// =========================================================
// GLASS UNIFORMS
// =========================================================
import { defaults } from './defaults.js';

export function createUniforms(shared) {
  return {
    // shared (driven by main.js render loop / texture pipeline)
    u_resolution: shared.u_resolution,
    u_imgAspect:  shared.u_imgAspect,
    u_mouse:      shared.u_mouse,
    u_mouseVel:   shared.u_mouseVel,
    u_time:       shared.u_time,
    u_albedo:     shared.u_albedo,
    u_normal:     shared.u_normal,
    u_bloom:      shared.u_bloom,
    u_bgTex:      shared.u_bgTex,

    // Glass-specific
    u_transparency: { value: defaults.material.transparency },
    u_refraction:   { value: defaults.material.refraction },
    u_frost:        { value: defaults.material.frost },
  };
}
