// =========================================================
// IRIDESCENCE EFFECT — uniforms
// =========================================================
import * as THREE from 'three';
import { defaults, PEARL_BASIS } from './defaults.js';

export function phaseFromHue(hueDeg) {
  const off = (hueDeg % 360) / 360;
  return new THREE.Vector3(
    PEARL_BASIS[0] + off,
    PEARL_BASIS[1] + off,
    PEARL_BASIS[2] + off,
  );
}

// Each effect exports a createUniforms that returns the uniform
// entries to merge into the host shader's uniform object.
export function createUniforms() {
  return {
    u_iriPhase:     { value: phaseFromHue(defaults.hue) },
    u_iriIntensity: { value: defaults.enabled ? defaults.intensity : 0.0 },
  };
}
