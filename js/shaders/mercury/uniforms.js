// =========================================================
// MERCURY UNIFORMS — three.js uniform object for this shader
// =========================================================
// Each shader preset exports its own uniforms factory. Shared uniforms
// (resolution, mouse, time, textures, bg) are passed in from main.js
// so the texture pipeline and pointer logic don't need to know which
// shader is active.
//
import * as THREE from 'three';
import { defaults, PEARL_BASIS } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

// Apply a hue rotation (degrees) to the Pearl-basis phase vector.
// hue is added to every channel, which rotates the cosine palette
// around the color wheel while preserving Pearl's channel offsets.
export function phaseFromHue(hueDeg) {
  const off = (hueDeg % 360) / 360;
  return new THREE.Vector3(
    PEARL_BASIS[0] + off,
    PEARL_BASIS[1] + off,
    PEARL_BASIS[2] + off,
  );
}

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

    // Material (Blinn-Phong)
    u_baseColor:  { value: hexToVec3(defaults.material.baseColor) },
    u_diffuse:    { value: defaults.material.diffuse },
    u_specular:   { value: defaults.material.specular },
    u_shininess:  { value: defaults.material.shininess },

    // Iridescence
    u_iriPhase:     { value: phaseFromHue(defaults.iridescence.hue) },
    u_iriIntensity: { value: defaults.iridescence.enabled ? defaults.iridescence.intensity : 0.0 },
  };
}
