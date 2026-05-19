// =========================================================
// SOBEL NORMAL MAP — gradient-of-luminance approach
// =========================================================
// Fast, edge-emphasizing normals. Treats luminance as a height field
// and uses a Sobel kernel to compute X/Y gradients, then derives the
// surface normal as (-gx, -gy, 1) normalized.
//
// Pre-blurred with sigma=1.5 to suppress aliasing on hard SVG edges
// (matches the Python reference make_normal_edge()).
//
// "Strength" multiplies the gradients before normalization — higher
// values produce more dramatic relief but flatten the Z component.
//
import { gaussianBlur } from './gaussian-blur.js';

export function sobelNormalMap(lum, w, h, strength) {
  const blurred = gaussianBlur(lum, w, h, 1.5);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xm = Math.max(0, x-1), xp = Math.min(w-1, x+1);
      const ym = Math.max(0, y-1), yp = Math.min(h-1, y+1);
      const tl = blurred[ym*w + xm], t  = blurred[ym*w + x ], tr = blurred[ym*w + xp];
      const l  = blurred[y *w + xm],                          r  = blurred[y *w + xp];
      const bl = blurred[yp*w + xm], b  = blurred[yp*w + x ], br = blurred[yp*w + xp];

      // scipy.ndimage.sobel axis=1 (horizontal gradient)
      const gx = (-tl + tr - 2*l + 2*r - bl + br) * strength;
      // axis=0 (vertical gradient)
      const gy = (-tl - 2*t - tr + bl + 2*b + br) * strength;

      let nx = -gx, ny = -gy, nz = 1.0;
      const L = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      nx /= L; ny /= L; nz /= L;

      const idx = (y*w + x) * 4;
      out[idx]   = (nx*0.5 + 0.5) * 255;
      out[idx+1] = (ny*0.5 + 0.5) * 255;
      out[idx+2] = (nz*0.5 + 0.5) * 255;
      out[idx+3] = 255;
    }
  }
  return out;
}
