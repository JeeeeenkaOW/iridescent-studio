# Iridescent Shader Studio

WebGL fragment shader playground that turns SVG/PNG ornaments into
animated iridescent material. Internal Overwolf tool.

## Running locally

This project uses ES modules, so it can't be opened by double-clicking
`index.html` — browsers block module loading from `file://`. You need a
local web server. Three options, pick whichever fits:

**Easiest — VS Code Live Server extension:** install the "Live Server"
extension by Ritwick Dey, then right-click `index.html` → "Open with
Live Server". Browser opens automatically.

**Python (Mac comes with it pre-installed):**
```
cd iridescent-studio
python3 -m http.server 8000
```
Open `http://localhost:8000` in your browser.

**Node:**
```
cd iridescent-studio
npx serve
```

## Deploying

Drag the whole folder onto Netlify's deploy page. Live URL in ~30s.
No build step, no config — Netlify serves the static files as-is.

## File map

```
index.html                        ← page shell, importmap, mounts main.js
css/styles.css                    ← all styling, Overwolf brand
js/
  main.js                         ← boot, state, three.js setup, render loop
  default-svg.js                  ← the ornamental medallion shown by default
  pipeline/                       ← SVG/PNG → textures (CPU, runs on rebuild)
    rasterize.js                  ← raster + normalize + luminance extraction
    gaussian-blur.js              ← shared 3-pass box blur ≈ gaussian
    normals-sobel.js              ← edge-emphasis normal map
    normals-sdf.js                ← sculpted (distance-transform) normal map
    bloom.js                      ← blurred luminance, used for halo/shadow
  shader/                         ← GLSL, assembled at startup
    vertex.glsl.js                ← passthrough vertex shader
    fragment.glsl.js              ← stitches feature files into final shader
    features/
      noise.glsl.js               ← hash, value noise, FBM
      iridescence.glsl.js         ← IQ cosine palette function
      fit-uv.glsl.js              ← letterbox/pillarbox helper
      sample.glsl.js              ← read albedo/normal/bloom textures
      metaball.glsl.js            ← mercury blob at cursor + velocity tail
      lighting.glsl.js            ← Blinn-Phong with cursor as point light
      flow-fbm.glsl.js            ← animated FBM driving iridescence T
      chromatic-aberration.glsl.js← RGB split inside the blob
      composite.glsl.js           ← combine base metal + iridescent specular
      output.glsl.js              ← final dark/light mode compositing
  controls/                       ← one file per sidebar section
    upload.js                     ← drop zone + file input + clear
    material.js                   ← Pearl/Gold/Oil/Arctic picker
    background.js                 ← Dark void vs Parchment
    normals.js                    ← Sobel/SDF + strength slider
    motion.js                     ← auto-drift toggle
    export.js                     ← PNG snapshot + WebM recording
  presets/
    schema.js                     ← full Material type + DEFAULTS + mergeMaterial
    index.js                      ← registry of all presets
    pearl.js                      ← the original
    gold.js
    oil.js
    arctic.js
```

## Where things live (quick lookup)

| If you want to tune…              | Open…                                       |
|-----------------------------------|---------------------------------------------|
| Iridescent colors per preset      | `presets/pearl.js` (etc.)                   |
| Iridescence math                  | `shader/features/iridescence.glsl.js`       |
| Mercury cursor blob               | `shader/features/metaball.glsl.js`          |
| Highlights / shininess            | `shader/features/lighting.glsl.js`          |
| Color flow / shimmer speed        | `shader/features/flow-fbm.glsl.js`          |
| Halo around the ornament          | `shader/features/output.glsl.js`            |
| Drop shadow in light mode         | `shader/features/output.glsl.js`            |
| Vignette                          | `shader/features/output.glsl.js`            |
| Grain                             | `shader/features/output.glsl.js`            |
| Chromatic aberration              | `shader/features/chromatic-aberration.glsl.js` |
| Base "silver" color               | `shader/features/composite.glsl.js`         |
| Edge-style normals                | `pipeline/normals-sobel.js`                 |
| Sculpted-style normals            | `pipeline/normals-sdf.js`                   |
| Auto-drift path                   | `main.js` (autoPath function)               |
| Add a new material preset         | copy a file in `presets/`, add to `index.js`|
| Add a new sidebar control         | new `controls/*.js`, wire in `main.js`      |

## Workflow

Each chat = one feature. Open the README and the 2–3 files for that
feature. Examples:

- *"Tune Oil's halo to be more saturated"* → open `presets/oil.js`,
  `shader/features/output.glsl.js`, this README.
- *"Add a chromatic aberration intensity slider"* →
  `shader/features/chromatic-aberration.glsl.js`,
  `controls/material.js`, all preset files, this README.
- *"Add a Mercury preset"* → copy `presets/pearl.js` to `mercury.js`,
  edit numbers, add it to `presets/index.js`, add a button in
  `index.html`'s material segmented control.

## Schema

The full Material schema (currently only `palette.phase` is wired into
the shader as a uniform; the rest are documented targets) is in
`presets/schema.js`. As we expose more knobs as uniforms, we update
`controls/material.js` to push those values too.
