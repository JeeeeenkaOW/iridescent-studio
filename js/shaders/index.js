// =========================================================
// MATERIAL REGISTRY — single source of truth for available materials
// =========================================================
// Each material is a distinct fragment shader with its own uniforms
// and material controls. Effects (iridescence, lighting overrides,
// chromatic aberration) are separate — see /js/effects/.
//
// To add a new material: create a folder under /shaders/, build the
// manifest, and import + add here.
//
import { mercuryShader }  from './mercury/index.js';
import { glassShader }    from './glass/index.js';
import { obsidianShader } from './obsidian/index.js';
import { ceramicShader }  from './ceramic/index.js';

export const SHADERS = {
  mercury:  mercuryShader,
  glass:    glassShader,
  obsidian: obsidianShader,
  ceramic:  ceramicShader,
};

export const DEFAULT_SHADER = 'mercury';

export function getShader(id) {
  return SHADERS[id] || SHADERS[DEFAULT_SHADER];
}

export function listShaders() {
  return Object.values(SHADERS);
}
