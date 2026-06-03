// =========================================================
// IRIDESCENCE EFFECT — uniforms
// =========================================================
// As of v20 the palette is a LUT (DataTexture). The texture is owned
// here so that all materials using this effect share the same texture
// instance — the LUT is logically one piece of state.
//
// Updates happen via controls calling regenerate() on the controls'
// returned object, which writes new bytes into the texture and flips
// needsUpdate. The hue slider does NOT regenerate the LUT — hue is a
// separate uniform applied at sample time in the shader, so dragging
// the hue slider stays free.
//
// Legacy `u_iriPhase` (vec3) is removed; legacy `phaseFromHue` helper
// stays as a back-compat export but no longer feeds a uniform. It was
// only ever called from controls.js (here in this effect's folder),
// which now uses LUT generation instead.
//
import * as THREE from 'three';
import { defaults } from './defaults.js';
import { makeLUTTexture, generatePearlLUT, PEARL_BASIS } from './lut.js';

// Created on first createUniforms() call. Reused across material
// rebuilds so the texture handle stays stable for the controls that
// already grabbed it.
let sharedLUTTexture = null;

export function getSharedLUT() {
  if (!sharedLUTTexture) {
    sharedLUTTexture = makeLUTTexture(generatePearlLUT());
  }
  return sharedLUTTexture;
}

export function createUniforms() {
  return {
    u_iriLUT:       { value: getSharedLUT() },
    u_iriHueShift:  { value: defaults.hue / 360 },
    u_iriIntensity: { value: defaults.enabled ? defaults.intensity : 0.0 },
  };
}

// Back-compat — kept so any external import still resolves. Not used
// internally any more.
export function phaseFromHue(hueDeg) {
  const off = (hueDeg % 360) / 360;
  return new THREE.Vector3(
    PEARL_BASIS[0] + off,
    PEARL_BASIS[1] + off,
    PEARL_BASIS[2] + off,
  );
}
