// =========================================================
// MERCURY UNIFORMS
// =========================================================
// Returns a uniform object containing:
//   - shared uniforms from main.js (resolution, mouse, time, textures)
//   - mercury's own material uniforms (base color)
//   - the four lighting uniforms every material declares
//     (preset to mercury's lighting defaults; the Lighting effect
//     can override them)
//   - each effect's uniforms (from each effect's createUniforms())
//
// Effects' uniforms live in the same object as the material's so a
// single ShaderMaterial covers everything. Effects controls write
// to them through the shared uniforms object handed back to them
// by the Effects host.
//
import * as THREE from 'three';
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';
import { listEffects } from '../../effects/index.js';

export function createUniforms(shared) {
  const u = {
    // Shared
    u_resolution: shared.u_resolution,
    u_imgAspect:  shared.u_imgAspect,
    u_mouse:      shared.u_mouse,
    u_mouseVel:   shared.u_mouseVel,
    u_time:       shared.u_time,
    u_albedo:     shared.u_albedo,
    u_normal:     shared.u_normal,
    u_bloom:      shared.u_bloom,
    u_bgTex:      shared.u_bgTex,

    // Material
    u_baseColor:   { value: hexToVec3(defaults.material.baseColor) },

    // Lighting (preset defaults for this material; Lighting effect overrides)
    u_diffuse:     { value: defaults.lighting.diffuse },
    u_specular:    { value: defaults.lighting.specular },
    u_shininess:   { value: defaults.lighting.shininess },
    u_lightHeight: { value: defaults.lighting.height },
  };

  // Merge in each effect's uniforms.
  listEffects().forEach(eff => {
    Object.assign(u, eff.createUniforms());
  });

  return u;
}
