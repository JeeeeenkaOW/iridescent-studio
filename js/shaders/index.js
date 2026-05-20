// =========================================================
// MATERIAL REGISTRY — single source of truth for available materials
// =========================================================
// Two materials:
//
//   Solid  — unified solid shader. Reaches the old Mercury, Obsidian,
//            and Ceramic looks via sliders (base/F0 color, roughness,
//            bg refraction + transparency, inner glow, fresnel rim,
//            cursor blob toggle).
//   Glass  — refractive transparent shader. Stays separate — different
//            math (full bg pass-through, frost as screen-space blur).
//
// Effects (Iridescence, Lighting overrides, Bloom, Chromatic ab.) are
// applied on top of either material — see /js/effects/.
//
import { solidShader } from './solid/index.js';
import { glassShader } from './glass/index.js';

export const SHADERS = {
  solid: solidShader,
  glass: glassShader,
};

export const DEFAULT_SHADER = 'solid';

export function getShader(id) {
  return SHADERS[id] || SHADERS[DEFAULT_SHADER];
}

export function listShaders() {
  return Object.values(SHADERS);
}
