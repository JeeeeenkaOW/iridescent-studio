// =========================================================
// CHROMATIC ABERRATION EFFECT — defaults
// =========================================================
// RGB-channel split along X, weighted by silhouette edge bloom so the
// fringing appears at ornament edges where lensing would happen.
// Off by default. As a generic effect this applies regardless of
// material — it's a screen-space sample tweak on the albedo read.
//
export const defaults = {
  enabled:  false,
  strength: 0.5,    // 0..1 slider, mapped internally to a small UV offset
};
