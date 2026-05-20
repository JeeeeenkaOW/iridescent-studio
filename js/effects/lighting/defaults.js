// =========================================================
// LIGHTING EFFECT — defaults
// =========================================================
// Six parameters of the Blinn-Phong light every material uses for its
// baseline lit appearance. Materials have lighting internally — this
// effect lets the user override the parameters when enabled.
//
// Off by default = materials use their own preset values. When enabled,
// these uniforms override the preset values.
//
//   diffuse   — 0..1 diffuse gain (lit/matte balance)
//   specular  — 0..3 specular intensity
//   shininess — 1..256 specular exponent (higher = tighter)
//   height    — 0.02..0.8 virtual light Z height
//   color     — light tint. Multiplies into diffuse and spec.
//               White by default → no tint change.
//   ambient   — 0..3 scales the hemisphere ambient term. 1 = stock,
//               > 1 brightens the body away from the highlight,
//               0 = body goes dark outside the directly-lit area.
//
export const defaults = {
  enabled:   false,
  diffuse:   0.45,
  specular:  1.6,
  shininess: 28.0,
  height:    0.16,
  color:     '#FFFFFF',
  ambient:   1.0,
};
