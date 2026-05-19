// =========================================================
// MERCURY UNIFORMS — three.js uniform object for this shader
// =========================================================
// Each shader preset exports its own uniforms factory. Shared uniforms
// (resolution, mouse, time, textures, bg) are passed in from main.js
// so the texture pipeline and pointer logic don't need to know which
// shader is active.
//
import * as THREE from 'three';
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

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

    // Mercury-specific
    u_iriPhase:         { value: new THREE.Vector3(...defaults.iridescence.phase) },
    u_iriIntensity:     { value: defaults.iridescence.enabled ? defaults.iridescence.intensity : 0.0 },
    u_iriColor:         { value: hexToVec3(defaults.iridescence.color) },
    u_iriColorStrength: { value: defaults.iridescence.colorStrength },
    u_tintColor:        { value: hexToVec3(defaults.tint.color) },
    u_tintStrength:     { value: defaults.tint.strength },
  };
}
