// =========================================================
// PARTICLES UNIFORMS — factory
// =========================================================
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

    // Material — particle parameters
    u_baseColor:        { value: hexToVec3(defaults.material.baseColor) },
    u_particleDensity:  { value: defaults.material.density },
    u_particleSize:     { value: defaults.material.size },
    u_particleJitter:   { value: defaults.material.jitter },
    u_particleDrift:    { value: defaults.material.drift },
    u_particleMode:     { value: defaults.material.mode },
    u_particleSoftness: { value: defaults.material.softness },

    // Lighting preset (the top-level Lighting controls override these)
    u_diffuse:     { value: defaults.lighting.diffuse },
    u_specular:    { value: defaults.lighting.specular },
    u_shininess:   { value: defaults.lighting.shininess },
    u_lightHeight: { value: defaults.lighting.height },
    u_lightColor:  { value: hexToVec3(defaults.lighting.color) },

    // Ambient (hemisphere)
    u_skyColor:        { value: hexToVec3(defaults.ambient.sky) },
    u_groundColor:     { value: hexToVec3(defaults.ambient.ground) },
    u_ambientStrength: { value: defaults.lighting.ambientStrength ?? 1.0 },

    // Halo baseline — warm for particle aesthetic
    u_haloBaseColor:     { value: hexToVec3('#FFFFFF') },
    u_haloBaseIntensity: { value: 0.32 },
  };

  // Merge effect uniforms into this material's uniform set.
  listEffects().forEach(eff => {
    Object.assign(u, eff.createUniforms());
  });

  return u;
}
