// =========================================================
// BLOOM MAP — heavily-blurred luminance
// =========================================================
// Used by the shader for two effects:
//   - Iridescent halo around the ornament edges (dark mode)
//   - Drop shadow projected on parchment (light mode)
//
// Sigma=8 is large enough that the bloom extends well beyond the
// silhouette. R=G=B because we only need a single channel — keeping
// it as RGBA simplifies CanvasTexture upload.
//
import { gaussianBlur } from './gaussian-blur.js';

export function bloomMap(lum, w, h) {
  const blurred = gaussianBlur(lum, w, h, 8.0);
  const out = new Uint8ClampedArray(w*h*4);
  for (let i = 0; i < w*h; i++) {
    const v = blurred[i] * 255;
    out[i*4]   = v;
    out[i*4+1] = v;
    out[i*4+2] = v;
    out[i*4+3] = 255;
  }
  return out;
}
