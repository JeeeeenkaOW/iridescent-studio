// =========================================================
// GAUSSIAN BLUR — separable, three-pass box blur approximation
// =========================================================
// Three repeated box blurs ≈ gaussian (central limit theorem). Much
// faster than a true gaussian kernel and visually indistinguishable
// for our purposes (smoothing height fields and bloom).
//
// Used by normals-sobel (sigma=1.5), normals-sdf (sigma=1.0), and
// bloom (sigma=8.0).
//
export function gaussianBlur(src, w, h, sigma) {
  if (sigma <= 0) return src.slice(0);
  const r = Math.max(1, Math.round(Math.sqrt(12*sigma*sigma/3 + 1) / 2));
  const boxBlur = (input) => {
    const tmp = new Float32Array(w*h);
    const out = new Float32Array(w*h);
    for (let y = 0; y < h; y++) {
      let sum = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) sum += input[row + Math.min(w-1, Math.max(0, x))];
      const div = 2*r + 1;
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum / div;
        sum -= input[row + Math.max(0, x - r)];
        sum += input[row + Math.min(w-1, x + r + 1)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += tmp[Math.min(h-1, Math.max(0, y)) * w + x];
      const div = 2*r + 1;
      for (let y = 0; y < h; y++) {
        out[y*w + x] = sum / div;
        sum -= tmp[Math.max(0, y - r) * w + x];
        sum += tmp[Math.min(h-1, y + r + 1) * w + x];
      }
    }
    return out;
  };
  let result = src;
  for (let i = 0; i < 3; i++) result = boxBlur(result);
  return result;
}
