// =========================================================
// LIGHTING EFFECT — defaults
// =========================================================
// Exposes the parameters of the Blinn-Phong light that every material
// uses for its baseline lit appearance. Materials always have lighting
// internally (otherwise they would render flat) — this effect just lets
// the user tune diffuse mix, specular intensity, shininess, and the
// virtual light's height.
//
// Off by default = materials use their own preset defaults. When the
// user enables this effect, the four uniforms below override those
// defaults and let the user push the values around.
//
export const defaults = {
  enabled:   false,
  diffuse:   0.45,    // 0..1 diffuse gain (lit/matte balance)
  specular:  1.6,     // 0..3 specular intensity
  shininess: 28.0,    // 1..128 specular exponent (higher = tighter)
  height:    0.16,    // 0.02..0.8 virtual light Z height
};
