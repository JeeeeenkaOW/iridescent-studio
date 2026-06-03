// =========================================================
// IRIDESCENCE EFFECT — defaults
// =========================================================
// Soap-film rainbow overlay. Material colors stay; a mean-zero
// rainbow sheen rides over the surface, strongest at grazing
// angles. Off by default — enable from the Effects panel.
//
// As of v20 the palette engine is a LUT (see lut.js). Two modes:
//   - 'pearl'  — LUT regenerated from the Pearl cosine palette.
//                The hue slider rotates the LUT lookup, intensity
//                scales the tint. Visually identical to the legacy
//                cosine-in-shader implementation.
//   - 'custom' — LUT regenerated from user-defined gradient stops.
//                The gradient editor in the Iridescence panel adds /
//                drags / recolors stops. Hue still rotates the
//                lookup, useful for animating brand-color gradients
//                around the highlight without redefining stops.
//
// PEARL_BASIS is re-exported from lut.js for back-compat — index.js
// used to import it from here.
//
export { PEARL_BASIS } from './lut.js';

export const defaults = {
  enabled:   false,
  intensity: 1.0,         // 0..1, scales the soap-film overlay
  hue:       0,           // 0..360, rotates the LUT lookup
  mode:      'pearl',     // 'pearl' | 'custom'

  // Initial Custom-mode stops. Hand-picked to approximate the Pearl
  // cosine palette at hue=0, so a user switching to Custom for the
  // first time sees a familiar rainbow as a starting point rather
  // than a default that surprises them. The controls also re-seed
  // these from the actual current Pearl LUT on first switch in a
  // given session — so if they've rotated hue, the seed reflects
  // that. These hand-picked values are the fallback (and the value
  // saved in fresh-session snapshots before any Custom edits).
  stops: [
    { pos: 0.00, color: '#FFCC00' },
    { pos: 0.17, color: '#FF4D7F' },
    { pos: 0.33, color: '#8C3DFF' },
    { pos: 0.50, color: '#3D7FFF' },
    { pos: 0.67, color: '#3DCCFF' },
    { pos: 0.83, color: '#7AFFCC' },
  ],
};
