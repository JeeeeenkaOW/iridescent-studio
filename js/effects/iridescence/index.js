// =========================================================
// IRIDESCENCE EFFECT — manifest
// =========================================================
// Iridescence is the cosine-palette rainbow that tints the specular
// highlight of any material. Off by default — enable from Effects.
//
// Effect manifest shape (all effects export this):
//   id, name              — registry/display
//   defaults              — initial values (includes `enabled`)
//   createUniforms()      — uniform entries to merge into the host
//   uniformsGlsl, helpersGlsl, applyGlsl — GLSL chunks
//   initControls()        — sidebar UI for this effect
//   serializeForExport()  — bake into the exported HTML
//
// The host material composes the GLSL chunks into its fragment shader
// (see materials' fragment.glsl.js) and merges createUniforms() into
// its uniform object.
//
import { defaults, PEARL_BASIS } from './defaults.js';
import { createUniforms } from './uniforms.js';
import { uniforms as uniformsGlsl, helpers as helpersGlsl, apply as applyGlsl } from './glsl.js';
import { initControls } from './controls.js';

function serializeForExport(snapshot, enabled) {
  const intensity = snapshot?.intensity ?? defaults.intensity;
  const hue       = snapshot?.hue ?? defaults.hue;
  const off       = (hue % 360) / 360;
  const phase     = snapshot?.phase ?? [
    PEARL_BASIS[0] + off,
    PEARL_BASIS[1] + off,
    PEARL_BASIS[2] + off,
  ];
  const iriIntensity = enabled ? intensity : 0;

  const constants = `
const IRI_PHASE      = ${JSON.stringify(phase)};
const IRI_INTENSITY  = ${iriIntensity};
`.trim();

  const uniformEntries = `
    u_iriPhase:     { value: new THREE.Vector3(...IRI_PHASE) },
    u_iriIntensity: { value: IRI_INTENSITY },
`.trim();

  return { constants, uniformEntries };
}

export const iridescenceEffect = {
  id: 'iridescence',
  name: 'Iridescence',
  defaults,
  createUniforms,
  uniformsGlsl,
  helpersGlsl,
  applyGlsl,
  initControls,
  serializeForExport,
};
