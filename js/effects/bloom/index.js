// =========================================================
// BLOOM EFFECT — manifest
// =========================================================
// Owns the silhouette halo. Was previously hardcoded into each
// material's haloBlock (with iridescence-tinted halo when iridescence
// was on); now factored out so it can be enabled/disabled and tuned
// independently of iridescence.
//
// The material's haloBlock still computes haloMask + sets initial
// halo=vec3(0). This effect's apply writes halo when enabled.
//
import { defaults } from './defaults.js';
import { createUniforms } from './uniforms.js';
import { uniforms as uniformsGlsl, helpers as helpersGlsl, apply as applyGlsl } from './glsl.js';
import { initControls } from './controls.js';
import { hexToVec3 } from '../../util/color.js';

function serializeForExport(snapshot, enabled) {
  const strength    = snapshot?.strength    ?? defaults.strength;
  const colorHex    = snapshot?.color       ?? '#ffffff';
  const userColored = !!snapshot?.userColored;
  const baked       = enabled ? strength : 0;

  const constants = `
const BLOOM_STRENGTH   = ${baked};
const BLOOM_COLOR_HEX  = ${JSON.stringify(colorHex)};
const BLOOM_USER_COLOR = ${userColored ? 1 : 0};
`.trim();

  const uniformEntries = `
    u_bloomStrength:  { value: BLOOM_STRENGTH },
    u_bloomColor:     { value: hexToVec3(BLOOM_COLOR_HEX) },
    u_bloomUserColor: { value: BLOOM_USER_COLOR },
`.trim();

  return { constants, uniformEntries };
}

export const bloomEffect = {
  id: 'bloom',
  name: 'Bloom',
  defaults,
  createUniforms,
  uniformsGlsl,
  helpersGlsl,
  applyGlsl,
  initControls,
  serializeForExport,
};
