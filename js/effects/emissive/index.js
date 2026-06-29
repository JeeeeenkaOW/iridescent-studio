// =========================================================
// EMISSIVE EFFECT — manifest
// =========================================================
// Procedural self-illumination layer. Adds glowing veins to the body of
// any material. Off by default. Works on Solid and Particles.
//
import { defaults } from './defaults.js';
import { createUniforms } from './uniforms.js';
import { uniforms as uniformsGlsl, helpers as helpersGlsl, apply as applyGlsl } from './glsl.js';
import { initControls } from './controls.js';

function serializeForExport(snap, enabled) {
  const strength = enabled ? (snap?.strength ?? defaults.strength) : 0.0;
  const color     = snap?.color     ?? defaults.color;
  const scale     = snap?.scale     ?? defaults.scale;
  const speed     = snap?.speed     ?? defaults.speed;
  const sharpness = snap?.sharpness ?? defaults.sharpness;
  const constants = `
const EMISSIVE          = ${strength};
const EMISSIVE_COLOR_HEX= ${JSON.stringify(color)};
const EMISSIVE_SCALE    = ${scale};
const EMISSIVE_SPEED    = ${speed};
const EMISSIVE_SHARP    = ${sharpness};
`.trim();
  const uniformEntries = `
    u_emissive:          { value: EMISSIVE },
    u_emissiveColor:     { value: hexToVec3(EMISSIVE_COLOR_HEX) },
    u_emissiveScale:     { value: EMISSIVE_SCALE },
    u_emissiveSpeed:     { value: EMISSIVE_SPEED },
    u_emissiveSharpness: { value: EMISSIVE_SHARP },
`.trim();
  return { constants, uniformEntries };
}

export const emissiveEffect = {
  id: 'emissive',
  name: 'Emissive',
  defaults,
  createUniforms,
  uniformsGlsl,
  helpersGlsl,
  applyGlsl,
  initControls,
  serializeForExport,
};
