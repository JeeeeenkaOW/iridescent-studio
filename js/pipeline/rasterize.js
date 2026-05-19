// =========================================================
// RASTERIZE — SVG or PNG file → HTMLCanvas at target resolution
// =========================================================
// For SVG: parses width/height (or viewBox), targets RASTER_TARGET on
// the longest edge to preserve aspect.
// For PNG: caps the longest edge at MAX_LONG_EDGE so we don't blow up
// the GPU with 8K screenshots.
//
// Both paths add transparent PADDING around the source image. The
// downstream Sobel normals and bloom both sample neighbouring pixels —
// without padding, content touching the source edge gets clipped and
// produces hard cut-offs in the normal map and bloom. Padding gives
// those samplers room to read black/transparent pixels outside the
// silhouette, which is what they want at silhouette edges anyway.
//
// PAD_RATIO is fraction of the longest edge added as padding on EACH
// side. 0.06 = ~6% per side, ~12% total growth.
//
const MAX_LONG_EDGE = 1536;
const RASTER_TARGET = 1024;
const PAD_RATIO     = 0.06;

export async function rasterize(svgOrPng) {
  return new Promise((resolve, reject) => {
    if (svgOrPng.kind === 'svg') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgOrPng.text, 'image/svg+xml');
      const svg = doc.documentElement;
      let w = parseFloat(svg.getAttribute('width')) || 0;
      let h = parseFloat(svg.getAttribute('height')) || 0;
      if (!w || !h) {
        const vb = svg.getAttribute('viewBox');
        if (vb) {
          const p = vb.split(/[\s,]+/).map(Number);
          w = p[2]; h = p[3];
        } else { w = h = 600; }
      }
      const aspect = w / h;
      let rw, rh;
      if (aspect >= 1) { rw = RASTER_TARGET; rh = Math.round(RASTER_TARGET / aspect); }
      else { rh = RASTER_TARGET; rw = Math.round(RASTER_TARGET * aspect); }

      const blob = new Blob([svgOrPng.text], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const pad = Math.round(Math.max(rw, rh) * PAD_RATIO);
        const cw = rw + pad * 2;
        const ch = rh + pad * 2;
        const c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        const ctx = c.getContext('2d');
        // Canvas is transparent by default; normalize() composites
        // over black later. Draw image centred inside the padded canvas.
        ctx.drawImage(img, pad, pad, rw, rh);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    } else {
      const url = URL.createObjectURL(svgOrPng.blob);
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        const maxEdge = Math.max(w, h);
        let scale = 1;
        if (maxEdge > MAX_LONG_EDGE) scale = MAX_LONG_EDGE / maxEdge;
        const rw = Math.round(w * scale), rh = Math.round(h * scale);
        const pad = Math.round(Math.max(rw, rh) * PAD_RATIO);
        const cw = rw + pad * 2;
        const ch = rh + pad * 2;
        const c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, pad, pad, rw, rh);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    }
  });
}

// =========================================================
// NORMALIZE — composite over black, auto-invert if mean luma > 0.5
// =========================================================
// Ensures the ornament reads "white-on-black" regardless of source.
// If the user uploads a black-on-white logo, we invert it so the shader
// (which treats luminance as the silhouette mask) still works correctly.
//
export function normalize(sourceCanvas) {
  const w = sourceCanvas.width, h = sourceCanvas.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(sourceCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  let sum = 0;
  const N = w * h;
  for (let i = 0; i < N; i++) {
    const r = data[i*4]/255, g = data[i*4+1]/255, b = data[i*4+2]/255;
    sum += 0.299*r + 0.587*g + 0.114*b;
  }
  const meanLum = sum / N;
  if (meanLum > 0.5) {
    for (let i = 0; i < N; i++) {
      data[i*4]   = 255 - data[i*4];
      data[i*4+1] = 255 - data[i*4+1];
      data[i*4+2] = 255 - data[i*4+2];
    }
    ctx.putImageData(imgData, 0, 0);
  }
  return c;
}

// =========================================================
// LUMINANCE — extract a Float32 grayscale buffer
// =========================================================
// Returns { lum, w, h }. Standard Rec.601 weights.
// Used as input to both normal map generators and bloom.
//
export function getLuminance(canvas) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const N = w * h;
  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i*4]/255, g = data[i*4+1]/255, b = data[i*4+2]/255;
    lum[i] = 0.299*r + 0.587*g + 0.114*b;
  }
  return { lum, w, h };
}
