// =========================================================
// LIGHTING EFFECT — manifest
// =========================================================
// Special case: lighting has no GLSL of its own. Materials read its
// four uniforms (u_diffuse, u_specular, u_shininess, u_lightHeight)
// from their own internal lighting blocks. This effect exists as
// the user-facing override — when enabled, sliders override the
// material's preset values.
//
import { defaults } from './defaults.js';
import { createUniforms } from './uniforms.js';
import { uniforms as uniformsGlsl, helpers as helpersGlsl, apply as applyGlsl } from './glsl.js';
import { initControls } from './controls.js';

// Lighting's exported state is just whatever the user set — but
// when disabled, we still need to export *something*: the material's
// preset values, which the exporter pulls from the snapshot's
// `preset` field. The material's serializeForExport runs first and
// puts its preset values into the uniforms; we just no-op here.
function serializeForExport(/* snapshot, enabled */) {
  return { constants: '', uniformEntries: '' };
}

export const lightingEffect = {
  id: 'lighting',
  name: 'Lighting',
  defaults,
  createUniforms,
  uniformsGlsl,
  helpersGlsl,
  applyGlsl,
  initControls,
  serializeForExport,
};
