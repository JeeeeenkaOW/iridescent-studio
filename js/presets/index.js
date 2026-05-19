// =========================================================
// PRESET REGISTRY
// =========================================================
// Single source of truth for which materials exist + button labels.
// To add a new preset: create the file, import here, add to MATERIALS.
//
import pearl  from './pearl.js';
import gold   from './gold.js';
import oil    from './oil.js';
import arctic from './arctic.js';

export const MATERIALS = {
  pearl,
  gold,
  oil,
  arctic,
};

export const DEFAULT_MATERIAL = 'pearl';
