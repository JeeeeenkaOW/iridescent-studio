// =========================================================
// BLOOM EFFECT — uniforms
// =========================================================
// Three uniforms own the bloom halo:
//
//   u_bloomStrength — 0..2 multiplier on the material's baseline
//                     halo intensity. 0 means halo is off.
//   u_bloomColor    — vec3, halo tint (defaults to material's baseline
//                     tint at mount; user can override via picker).
//   u_bloomUserColor — bool-ish (float 0/1). 1 means "user picked a
//                     color, ignore material default." Set to 0 at
//                     mount so a material switch re-seeds cleanly,
//                     1 the first time the user touches the picker.
//
// The material's halo block reads u_haloBaseColor and u_haloBaseIntensity
// (set per-material). The Bloom effect's apply uses those when the
// user hasn't overridden, and uses u_bloomColor when they have.
//
import * as THREE from 'three';
import { defaults } from './defaults.js';

export function createUniforms() {
  return {
    u_bloomStrength:  { value: defaults.enabled ? defaults.strength : 0.0 },
    u_bloomColor:     { value: new THREE.Vector3(1, 1, 1) },
    u_bloomUserColor: { value: 0.0 },
  };
}
