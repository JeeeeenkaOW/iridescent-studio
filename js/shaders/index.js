// =========================================================
// MATERIAL REGISTRY — single source of truth for available materials
// =========================================================
// Three materials:
//
//   Solid     — unified solid shader. Reaches the old Mercury,
//               Obsidian, Ceramic looks via sliders.
//   Glass     — refractive transparent shader.
//   Particles — the source ornament rendered as discrete dots
//               (Dust / Smoke / Stars / Fragments modes).
//
// Effects (Iridescence, Bloom, Chromatic ab., Displacement) apply
// on top of any material — see /js/effects/.
//
import { solidShader }     from './solid/index.js';
import { glassShader }     from './glass/index.js';
import { particlesShader } from './particles/index.js';

export const SHADERS = {
  solid:     solidShader,
  glass:     glassShader,
  particles: particlesShader,
};

export const DEFAULT_SHADER = 'solid';

export function getShader(id) {
  return SHADERS[id] || SHADERS[DEFAULT_SHADER];
}

export function listShaders() {
  return Object.values(SHADERS);
}
