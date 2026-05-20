// =========================================================
// EFFECTS REGISTRY — single source of truth for effects
// =========================================================
// An "effect" is a layer that can be applied on top of any material:
//   - Lighting           — overrides material lighting params when on
//   - Iridescence        — tints specular with a cosine-palette rainbow
//   - Chromatic aberr.   — RGB-split fringe on silhouette edges
//
// Effects are composed into the material's fragment shader at assembly
// time. Each effect contributes:
//   - uniform declarations (uniformsGlsl)
//   - helper GLSL (helpersGlsl)
//   - inline apply GLSL (applyGlsl) injected at EFFECTS_APPLY in main()
//
// Materials declare an EFFECTS_APPLY slot in their fragment shader
// where effects' applyGlsl is concatenated, and an EFFECTS_HELPERS
// slot in their prelude where helpersGlsl is concatenated.
//
// To add a new effect: create a folder under /effects/, mirror the
// shape of iridescence (defaults, uniforms, glsl, controls, index)
// and add it to the EFFECTS array below.
//
import { lightingEffect }            from './lighting/index.js';
import { iridescenceEffect }         from './iridescence/index.js';
import { bloomEffect }               from './bloom/index.js';
import { chromaticAberrationEffect } from './chromatic-aberration/index.js';

// Ordered list — controls the order effects appear in the sidebar
// AND the order their applyGlsl runs in main().
//
//   Lighting       — no apply GLSL, just owns the lighting uniforms.
//   Iridescence    — multiplies `specular` by the palette and writes
//                    `halo` with a rainbow ring (only when enabled).
//   Bloom          — writes `halo`. Reads `iridescence(...)` so when
//                    Iridescence is on, the halo picks up its tint.
//                    MUST run after Iridescence's uniforms are set
//                    (which they always are — uniforms are constants
//                    for the duration of main()), but conceptually
//                    Bloom is downstream of Iridescence.
//   Chromatic ab.  — RGB fringe on edges; sample-space tweak that
//                    rewrites `mask`, last so it doesn't affect the
//                    above.
//
export const EFFECTS = [
  lightingEffect,
  iridescenceEffect,
  bloomEffect,
  chromaticAberrationEffect,
];

export function listEffects() {
  return EFFECTS;
}

export function getEffect(id) {
  return EFFECTS.find(e => e.id === id);
}
