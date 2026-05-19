// =========================================================
// LIGHTING EFFECT — uniforms
// =========================================================
// Three uniforms feed into every material's lighting block:
//
//   u_diffuse, u_specular, u_shininess, u_lightHeight
//
// When the effect is disabled, the host material's createUniforms()
// pre-populates these with its preset defaults (e.g. mercury =
// warm silver lighting, obsidian = tight dark-glass highlights).
// When enabled, the user's slider values override them.
//
// Because materials always read these uniforms, the effect's
// uniforms factory does NOT define defaults — the *material*
// defines defaults. This factory only exists so the effects
// host has a consistent API to call. It returns an empty object.
//
export function createUniforms() {
  return {};
}
