// =========================================================
// EFFECTS REGISTRY — single source of truth for effects
// =========================================================
// An "effect" is a layer that can be applied on top of any material:
//   - Iridescence        — tints specular with a cosine-palette rainbow
//   - Bloom              — silhouette halo glow
//   - Chromatic aberr.   — RGB-split fringe on silhouette edges
//   - Displacement       — heat-haze UV warp on the silhouette
//
// (Lighting USED to live here too but it was conceptually different —
// it overrides material uniforms rather than adding a composite layer
// — so it now has its own top-level sidebar section, not an effect.)
//
// Effects are composed into the material's fragment shader at assembly
// time. Each effect contributes:
//   - uniform declarations (uniformsGlsl)
//   - helper GLSL (helpersGlsl)
//   - inline apply GLSL (applyGlsl) injected at EFFECTS_APPLY in main()
//
// To add a new effect: create a folder under /effects/, mirror the
// shape of iridescence (defaults, uniforms, glsl, controls, index)
// and add it to the EFFECTS array below.
//
import { iridescenceEffect }         from './iridescence/index.js';
import { displacementEffect }        from './displacement/index.js';
import { bloomEffect }               from './bloom/index.js';
import { chromaticAberrationEffect } from './chromatic-aberration/index.js';
import { emissiveEffect }            from './emissive/index.js';
import { scratchesEffect }           from './scratches/index.js';

// Ordered list — controls the order effects appear in the sidebar
// AND the order their applyGlsl runs in main().
//
//   Displacement   — runs FIRST so subsequent effects see the warped
//                    `mask`, `bloom`, and `haloMask`. Without this
//                    ordering, Iridescence's halo would be the
//                    pre-warped shape while Bloom's would be warped —
//                    visible mismatch.
//   Iridescence    — multiplies `specular` by the palette and writes
//                    `halo` with a rainbow ring (only when enabled).
//   Bloom          — writes `halo`. Reads `iridescence(...)` so when
//                    Iridescence is on, the halo picks up its tint.
//   Chromatic ab.  — RGB fringe on edges; rewrites `mask`, last so it
//                    doesn't affect the above.
//
export const EFFECTS = [
  displacementEffect,
  iridescenceEffect,
  bloomEffect,
  chromaticAberrationEffect,
  // Emissive adds into the per-material `emissiveTerm` accumulator
  // (independent of the others), so its order here only sets sidebar
  // position, not compositing.
  emissiveEffect,
  // Scratches modulates `specular` (uneven gloss + bright streaks).
  scratchesEffect,
];

export function listEffects() {
  return EFFECTS;
}

export function getEffect(id) {
  return EFFECTS.find(e => e.id === id);
}
