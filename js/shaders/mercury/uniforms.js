// =========================================================
// MERCURY UNIFORMS
// =========================================================
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
    u_f0:          { value: hexToVec3(defaults.material.f0Color) },

    // Lighting (preset; Lighting effect overrides)
    u_diffuse:     { value: defaults.lighting.diffuse },
    u_specular:    { value: defaults.lighting.specular },
    u_shininess:   { value: defaults.lighting.shininess },
    u_lightHeight: { value: defaults.lighting.height },
    u_lightColor:  { value: hexToVec3(defaults.lighting.color) },

    // Ambient (hemisphere)
    u_skyColor:    { value: hexToVec3(defaults.ambient.sky) },
    u_groundColor: { value: hexToVec3(defaults.ambient.ground) },

    // Halo baseline (material-tuned; Bloom effect seeds its picker
    // from these and its strength slider multiplies u_haloBaseIntensity)
    u_haloBaseColor:     { value: hexToVec3('#ffffff') },
    u_haloBaseIntensity: { value: 0.32 },
  };

  listEffects().forEach(eff => {
    Object.assign(u, eff.createUniforms());
  });

  return u;
}
