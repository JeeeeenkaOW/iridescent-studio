// =========================================================
// SOLID UNIFORMS — uniforms factory for the unified material
// =========================================================
// Pulls shared uniforms from main.js, seeds material/lighting/ambient
// from defaults, then merges in each effect's createUniforms() so
// effect uniforms live alongside material ones in a single object.
//
import * as THREE from 'three';
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';
import { listEffects } from '../../effects/index.js';

export function createUniforms(shared) {
  const u = {
    // Shared
    u_resolution:   shared.u_resolution,
    u_imgAspect:    shared.u_imgAspect,
    u_mouse:        shared.u_mouse,
    u_mouseVel:     shared.u_mouseVel,
    u_time:         shared.u_time,
    u_loopMode:     shared.u_loopMode,
    u_loopDuration: shared.u_loopDuration,
    u_albedo:       shared.u_albedo,
    u_normal:       shared.u_normal,
    u_bloom:        shared.u_bloom,
    u_bgTex:        shared.u_bgTex,

    // Material — base + reflection
    u_baseColor:    { value: hexToVec3(defaults.material.baseColor) },
    u_f0:           { value: hexToVec3(defaults.material.f0Color) },

    // Material — optional features
    u_roughness:    { value: defaults.material.roughness },
    u_refraction:   { value: defaults.material.refraction },
    u_refractionMix:{ value: defaults.material.refractionMix },
    u_sssColor:     { value: hexToVec3(defaults.material.sssColor) },
    u_sssStrength:  { value: defaults.material.sssStrength },
    u_fresnel:      { value: defaults.material.fresnel },
    u_fresnelPower: { value: defaults.material.fresnelPower },
    u_blobEnabled:  { value: defaults.material.blobEnabled ? 1.0 : 0.0 },

    // Lighting (preset; the top-level Lighting controls override these)
    u_diffuse:        { value: defaults.lighting.diffuse },
    u_specular:       { value: defaults.lighting.specular },
    u_shininess:      { value: defaults.lighting.shininess },
    u_lightHeight:    { value: defaults.lighting.height },
    u_lightColor:     { value: hexToVec3(defaults.lighting.color) },
    u_ambientStrength:{ value: defaults.lighting.ambientStrength },

    // Ambient (hemisphere)
    u_skyColor:    { value: hexToVec3(defaults.ambient.sky) },
    u_groundColor: { value: hexToVec3(defaults.ambient.ground) },

    // Halo baseline (Bloom effect reads these)
    u_haloBaseColor:     { value: hexToVec3('#ffffff') },
    u_haloBaseIntensity: { value: 0.32 },
  };

  listEffects().forEach(eff => {
    Object.assign(u, eff.createUniforms());
  });

  return u;
}
