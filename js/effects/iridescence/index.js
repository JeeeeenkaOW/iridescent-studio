// =========================================================
// IRIDESCENCE EFFECT — manifest
// =========================================================
// Pearl-cosine palette tints the specular highlight and writes a
// rainbow halo ring around the silhouette + bloom-bright interior
// details. Matches the OG Mercury+iridescence look (multi-hue pearl
// distribution across the ornament), minus the global hue drift over
// time (the time term was removed from each material's iriT).
//
// Each material composes the GLSL chunks into its fragment shader
// (see materials' fragment.glsl.js). The effect's apply directly
// modifies `specular` and `halo` — no new material-side variables
// needed beyond what the materials already declare.
//
// The Bloom effect reads `iridescence(...)` from this effect's helpers
// to tint the halo when iridescence is enabled — that's why this
// effect's helpers also export the white-blended `iridescence()`
// function alongside the raw palette.
//
// Mercury's composite has an additional hardcoded line
// `diffuse += iridescence(iriT) * blob * 0.4` — Mercury's signature
// metaball iridescence stays unchanged.
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
