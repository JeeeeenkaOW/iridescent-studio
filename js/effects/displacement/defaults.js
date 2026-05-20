// =========================================================
// DISPLACEMENT EFFECT — defaults
// =========================================================
// Heat-haze UV warp on the silhouette. Off by default.
//
//   strength — 0..1, scales the UV offset magnitude
//              (mapped to u_dispStrength = strength * 0.04 in shader space).
//              At 100% the silhouette wobbles dramatically; 30% is the
//              classic heat-haze feel.
//   scale    — frequency of the noise (higher = finer ripples)
//   speed    — animation rate. 1.0 is the calm default.
//
export const defaults = {
  enabled:  false,
  strength: 0.4,
  scale:    3.0,
  speed:    1.0,
};
