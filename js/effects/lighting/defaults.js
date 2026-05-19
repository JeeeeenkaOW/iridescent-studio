// =========================================================
// LIGHTING EFFECT — defaults
// =========================================================
// Five parameters of the Blinn-Phong light every material uses for its
// baseline lit appearance. Materials have lighting internally — this
// effect lets the user override the parameters when enabled.
//
// Off by default = materials use their own preset values. When enabled,
// these uniforms override the preset values.
//
//   diffuse   — 0..1 diffuse gain (lit/matte balance)
//   specular  — 0..3 specular intensity
//   shininess — 1..128 specular exponent (higher = tighter)
//   height    — 0.02..0.8 virtual light Z height
//   color     — light tint. Multiplies into diffuse and spec.
//               White by default → no tint change.
//
export const defaults = {
  enabled:   false,
  diffuse:   0.45,
  specular:  1.6,
  shininess: 28.0,
  height:    0.16,
  color:     '#FFFFFF',
};
