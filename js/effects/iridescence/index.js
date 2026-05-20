// =========================================================
// IRIDESCENCE EFFECT — manifest
// =========================================================
// Soap-film thin-film rainbow that rides OVER any material without
// retinting the body. Adds a mean-zero rainbow oscillation strongest
// at grazing angles, faint head-on — matches how real soap films
// and oil-on-water films behave. Off by default.
//
// Each material composes the GLSL chunks into its fragment shader
// (see materials' fragment.glsl.js) and adds `ornament += iriOverlay`
// in its composite block.
//
// The Bloom effect reads `iridescence(...)` from this effect's helpers
// to tint the halo when iridescence is enabled — that's why this
// effect's helpers also export the white-blended `iridescence()`
// function alongside the soap-film palette.
//
// Mercury's composite has an additional hardcoded line
// `diffuse += iridescence(iriT) * blob * 0.4` that pre-dates this
// effect's rewrite — it's a signature look for Mercury and stays.
// `iridescence()` returns vec3(1.0) when the effect is off, so that
// line is a no-op for Mercury when iridescence is disabled.
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
