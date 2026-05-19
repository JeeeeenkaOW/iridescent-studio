# Web Material Forge

WebGL fragment shader playground that turns SVG/PNG ornaments into
animated material previews. Internal Overwolf tool.

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

## Architecture

The studio is built around **shader presets**. Each shader preset is a
self-contained bundle in `js/shaders/<id>/`:

- its own GLSL (vertex + fragment + feature files)
- its own uniforms factory
- its own sidebar controls
- its own defaults

The top-level shader picker (in the sidebar, under "Shader") swaps
between them. Shared concerns — the texture pipeline, background,
normals, motion, export — live outside any shader and feed all of them.

## File map

```
index.html                        ← page shell, importmap, mounts main.js
css/styles.css                    ← all styling, Overwolf brand
js/
  main.js                         ← boot, three.js setup, shared uniforms, render loop
  default-svg.js                  ← the ornamental medallion shown by default
  util/
    color.js                      ← hex ↔ THREE.Vector3 helpers
  pipeline/                       ← SVG/PNG → textures (CPU, runs on rebuild)
    rasterize.js                  ← raster + normalize + luminance extraction
    gaussian-blur.js              ← shared 3-pass box blur ≈ gaussian
    normals-sobel.js              ← edge-emphasis normal map
    normals-sdf.js                ← sculpted (distance-transform) normal map
    bloom.js                      ← blurred luminance, used for halo/shadow
  controls/                       ← shared sidebar sections (not shader-specific)
    upload.js                     ← drop zone for source SVG/PNG
    background.js                 ← Solid / Gradient / Image bg modes
    normals.js                    ← Sobel/SDF + strength slider
    motion.js                     ← auto-drift toggle
    export.js                     ← PNG snapshot + WebM recording
    shader.js                     ← top-level shader picker (swaps active shader)
    shader-export.js              ← single-file HTML export of active shader
  shaders/                        ← shader preset registry
    index.js                      ← SHADERS map + DEFAULT_SHADER
    mercury/                      ← the original iridescent silver shader
      index.js                    ← manifest (id, name, GLSL, uniforms, controls, defaults)
      defaults.js                 ← initial uniform values + iri color quick-picks
      controls.js                 ← Mercury's sidebar UI (iridescence + tint)
      uniforms.js                 ← Mercury's uniforms factory
      vertex.glsl.js              ← passthrough vertex shader
      fragment.glsl.js            ← stitches feature files into final shader
      features/                   ← GLSL feature files for Mercury
        noise.glsl.js
        iridescence.glsl.js       ← IQ cosine palette + on/off + color tint
        fit-uv.glsl.js
        sample.glsl.js
        metaball.glsl.js
        lighting.glsl.js
        flow-fbm.glsl.js
        chromatic-aberration.glsl.js
        composite.glsl.js
        output.glsl.js
```

## Where things live (quick lookup)

| If you want to tune…              | Open…                                              |
|-----------------------------------|----------------------------------------------------|
| Iridescence math (Mercury)        | `shaders/mercury/features/iridescence.glsl.js`     |
| Mercury cursor blob               | `shaders/mercury/features/metaball.glsl.js`        |
| Mercury highlights / shininess    | `shaders/mercury/features/lighting.glsl.js`        |
| Mercury color flow / shimmer      | `shaders/mercury/features/flow-fbm.glsl.js`        |
| Halo / vignette / grain           | `shaders/mercury/features/output.glsl.js`          |
| Chromatic aberration              | `shaders/mercury/features/chromatic-aberration.glsl.js` |
| Base "silver" color               | `shaders/mercury/features/composite.glsl.js`       |
| Mercury default uniform values    | `shaders/mercury/defaults.js`                      |
| Mercury sidebar UI                | `shaders/mercury/controls.js`                      |
| Phase quick-picks (Pearl/Gold/…)  | `shaders/mercury/defaults.js`                      |
| Edge-style normals                | `pipeline/normals-sobel.js`                        |
| Sculpted-style normals            | `pipeline/normals-sdf.js`                          |
| Auto-drift path                   | `main.js` (autoPath function)                      |
| Shader HTML export                | `controls/shader-export.js`                        |
| Add a new shader preset           | duplicate `shaders/mercury/`, register in `shaders/index.js` |

## Adding a new shader preset

1. Copy `js/shaders/mercury/` to `js/shaders/<your-id>/`.
2. Edit the GLSL in `features/` and `fragment.glsl.js` for the new look.
3. Edit `defaults.js` and `uniforms.js` to declare the uniforms your
   shader needs. (Shared uniforms — resolution, mouse, time, textures,
   bg — are passed in automatically; you only declare your own.)
4. Edit `controls.js` to expose the knobs you want the user to tune.
5. Edit `index.js` (the manifest) — update `id`, `name`, `description`.
6. Register it in `js/shaders/index.js` by importing and adding to the
   `SHADERS` map.

The shader picker, render loop, texture pipeline, background, and
HTML export will pick it up automatically.

## Mercury

The default shader. Warm silver base + Blinn-Phong specular +
cosine-palette iridescence on the highlight + mercury blob at the
cursor. Iridescence can be toggled off entirely (intensity → 0,
material becomes plain silver), tinted toward any hex color, and the
phase can be set via the Pearl / Gold / Oil / Arctic quick-picks.

With iridescence enabled at full intensity and color strength 0 +
Pearl phase, the output is byte-identical to the original studio.

## Shader HTML export

The "Shader HTML" button in the Export section produces a single,
self-contained HTML file with:

- the active shader's GLSL inlined
- all current uniform values hardcoded
- the three generated textures (albedo, normal, bloom) baked as base64
  PNG data URLs
- the same pointer + idle-drift loop as the studio

No build step, no upload UI, no dependencies besides three.js via CDN.
The dev gets exactly what they're seeing in the viewport.
