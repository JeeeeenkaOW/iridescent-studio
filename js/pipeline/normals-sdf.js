// =========================================================
// SCULPTED NORMAL MAP — SDF / distance-transform approach
// =========================================================
// Treats the silhouette as a 2D region and computes the Euclidean
// distance from each interior pixel to the nearest background pixel.
// That distance becomes height: pixels at the center of thick areas
// rise higher than thin edges, producing a "puffy" sculpted look.
//
// Pipeline:
//   1. Binarize luminance at 0.5 → mask
//   2. Euclidean distance transform (Felzenszwalb-Huttenlocher, O(n))
//   3. Clamp to maxDistPx=14, take sqrt for a rounded falloff
//   4. Gaussian blur sigma=1.0 to smooth out staircasing
//   5. Sobel on the smoothed height field → normal vectors
//
import { gaussianBlur } from './gaussian-blur.js';

// Linear-time Euclidean Distance Transform (Felzenszwalb & Huttenlocher)
function distanceTransform(mask, w, h) {
  const INF = 1e20;
  const maxN = Math.max(w, h);
  const v = new Int32Array(maxN);
  const z = new Float32Array(maxN + 1);
  const dist = new Float32Array(w * h);

  // Init: foreground = INF (we'll compute distance to nearest BG)
  for (let i = 0; i < w*h; i++) dist[i] = mask[i] > 0.5 ? INF : 0;

  const edt1d = (input, output, n) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = ((input[q] + q*q) - (input[v[k]] + v[k]*v[k])) / (2*q - 2*v[k]);
      while (s <= z[k]) {
        k--;
        s = ((input[q] + q*q) - (input[v[k]] + v[k]*v[k])) / (2*q - 2*v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k+1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k+1] < q) k++;
      output[q] = (q - v[k])*(q - v[k]) + input[v[k]];
    }
  };

  const rowIn = new Float32Array(w);
  const rowOut = new Float32Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) rowIn[x] = dist[y*w + x];
    edt1d(rowIn, rowOut, w);
    for (let x = 0; x < w; x++) dist[y*w + x] = rowOut[x];
  }
  const colIn = new Float32Array(h);
  const colOut = new Float32Array(h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) colIn[y] = dist[y*w + x];
    edt1d(colIn, colOut, h);
    for (let y = 0; y < h; y++) dist[y*w + x] = colOut[y];
  }
  for (let i = 0; i < w*h; i++) dist[i] = Math.sqrt(dist[i]);
  return dist;
}

export function sculptedNormalMap(lum, w, h, strength) {
  const mask = new Float32Array(w*h);
  for (let i = 0; i < w*h; i++) mask[i] = lum[i] > 0.5 ? 1 : 0;
  const dist = distanceTransform(mask, w, h);
  const maxDistPx = 14.0;
  const heightF = new Float32Array(w*h);
  for (let i = 0; i < w*h; i++) {
    const v = Math.min(1, dist[i] / maxDistPx);
    heightF[i] = Math.sqrt(v);
  }
  const smoothed = gaussianBlur(heightF, w, h, 1.0);
  const hScaled = new Float32Array(w*h);
  for (let i = 0; i < w*h; i++) hScaled[i] = smoothed[i] * strength;

  const out = new Uint8ClampedArray(w*h*4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xm = Math.max(0, x-1), xp = Math.min(w-1, x+1);
      const ym = Math.max(0, y-1), yp = Math.min(h-1, y+1);
      const tl = hScaled[ym*w + xm], t  = hScaled[ym*w + x ], tr = hScaled[ym*w + xp];
      const l  = hScaled[y *w + xm],                          r  = hScaled[y *w + xp];
      const bl = hScaled[yp*w + xm], b  = hScaled[yp*w + x ], br = hScaled[yp*w + xp];
      const gx = (-tl + tr - 2*l + 2*r - bl + br);
      const gy = (-tl - 2*t - tr + bl + 2*b + br);
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
