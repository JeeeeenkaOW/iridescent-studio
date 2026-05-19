// =========================================================
// OBSIDIAN UNIFORMS
// =========================================================
import * as THREE from 'three';
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';
import { listEffects } from '../../effects/index.js';

export function createUniforms(shared) {
  const u = {
    u_resolution: shared.u_resolution,
    u_imgAspect:  shared.u_imgAspect,
    u_mouse:      shared.u_mouse,
    u_mouseVel:   shared.u_mouseVel,
    u_time:       shared.u_time,
    u_albedo:     shared.u_albedo,
    u_normal:     shared.u_normal,
    u_bloom:      shared.u_bloom,
    u_bgTex:      shared.u_bgTex,

    u_baseColor:    { value: hexToVec3(defaults.material.baseColor) },
    u_refraction:   { value: defaults.material.refraction },
    u_fresnel:      { value: defaults.material.fresnel },
    u_fresnelPower: { value: defaults.material.fresnelPower },
    u_roughness:    { value: defaults.material.roughness },
    u_f0:           { value: hexToVec3(defaults.material.f0Color) },

    u_diffuse:     { value: defaults.lighting.diffuse },
    u_specular:    { value: defaults.lighting.specular },
    u_shininess:   { value: defaults.lighting.shininess },
    u_lightHeight: { value: defaults.lighting.height },
    u_lightColor:  { value: hexToVec3(defaults.lighting.color) },

    u_skyColor:    { value: hexToVec3(defaults.ambient.sky) },
    u_groundColor: { value: hexToVec3(defaults.ambient.ground) },
  };

  listEffects().forEach(eff => {
    Object.assign(u, eff.createUniforms());
  });

  return u;
}
