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

The studio is built around two registries that compose at runtime:

**Materials** (`js/shaders/<id>/`) — the base appearance of the ornament.
Mercury, Glass, and Obsidian are all materials. A material is a
self-contained bundle: its own GLSL, uniforms, sidebar controls, defaults.
Only one material is active at a time; the top-level material picker
swaps between them.

**Effects** (`js/effects/<id>/`) — independent layers that can be applied
on top of any material. Iridescence, Chromatic Aberration, and Lighting
overrides are all effects. Each effect declares uniforms, GLSL helpers,
an "apply" block, and a controls UI. Multiple effects can be enabled at
once, and they work across all materials — iridescence on glass, on
obsidian, on mercury, anywhere.

At assembly time, each material's fragment shader includes effect-uniform
declarations, effect helpers, and an `EFFECTS_APPLY` slot where each
effect's apply block runs in order. With every effect disabled, materials
render their plain baseline; the registry is the same shape either way.

Shared concerns — texture pipeline, background, normals, motion, export —
live outside both registries and feed every material.

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
                                    (also adds 6% padding around the SVG so
                                     Sobel/bloom don't clip at the edges)
    gaussian-blur.js              ← shared 3-pass box blur ≈ gaussian
    normals-sobel.js              ← edge-emphasis normal map
    normals-sdf.js                ← sculpted (distance-transform) normal map
    bloom.js                      ← blurred luminance, used for halo/shadow
  controls/                       ← shared sidebar sections
    upload.js                     ← drop zone for source SVG/PNG
    background.js                 ← Solid / Gradient / Image bg modes
    normals.js                    ← Sobel/SDF + strength slider
    motion.js                     ← auto-drift toggle
    export.js                     ← PNG snapshot + WebM recording
    shader.js                     ← top-level material picker
    effects.js                    ← Effects panel host (cards + toggles)
    shader-export.js              ← single-file HTML export of active material+effects
  shaders/                        ← material registry
    index.js                      ← SHADERS map + DEFAULT_SHADER
    _shared/                      ← GLSL helpers used by every material
      helpers.glsl.js             ← Schlick Fresnel, hemisphere ambient, ACES tonemap
      ambient.js                  ← shared sky/ground default hex colors
    mercury/                      ← warm silver Blinn-Phong + cursor mercury blob
    glass/                        ← refractive bg sampling + Fresnel reflectance
    obsidian/                     ← dark glass + 3-octave rough surface + fresnel rim
    ceramic/                      ← white porcelain + subsurface inner glow
      index.js                    ← manifest (id, name, GLSL, uniforms, controls, defaults)
      defaults.js                 ← initial uniform values + lighting preset
      controls.js                 ← material's sidebar UI (just material params,
                                    no lighting/iridescence/CA — those are effects)
      uniforms.js                 ← uniforms factory; merges in each effect's uniforms
      vertex.glsl.js              ← passthrough vertex shader
      fragment.glsl.js            ← stitches feature files + effect slots
      features/                   ← GLSL feature files for this material
        sample.glsl.js            ← albedo/normal/bloom reads + mask
        lighting.glsl.js          ← Blinn-Phong (reads u_lightHeight, u_shininess)
        flow-fbm.glsl.js          ← flow noise + baseline `specular` vec3
        composite.glsl.js         ← diffuse + specular → ornament
        output.glsl.js            ← halo block + final compositing
        …                         ← plus material-specific blocks
                                    (metaball for Mercury, refraction for Glass/Obsidian,
                                     fresnel for Obsidian)
  effects/                        ← effect registry
    index.js                      ← EFFECTS array — order = sidebar order = apply order
    lighting/                     ← override material lighting params when enabled
    iridescence/                  ← cosine-palette tint on specular + halo
    chromatic-aberration/         ← RGB-split fringe on silhouette edges
      index.js                    ← manifest (defaults, glsl, controls, serializer)
      defaults.js                 ← initial values incl. `enabled` flag
      uniforms.js                 ← createUniforms() — merged into material's uniforms
      glsl.js                     ← three named exports: uniforms, helpers, apply
      controls.js                 ← effect's own slider UI (rendered inside its card)
```

## Where things live (quick lookup)

| If you want to tune…              | Open…                                              |
|-----------------------------------|----------------------------------------------------|
| Iridescence math                  | `effects/iridescence/glsl.js`                      |
| Chromatic aberration math         | `effects/chromatic-aberration/glsl.js`             |
| Mercury cursor blob               | `shaders/mercury/features/metaball.glsl.js`        |
| Mercury silver / preset lighting  | `shaders/mercury/defaults.js`                      |
| Obsidian dark-glass body          | `shaders/obsidian/features/composite.glsl.js`      |
| Obsidian rough surface texture    | `shaders/obsidian/features/roughness.glsl.js`      |
| Obsidian fresnel rim              | `shaders/obsidian/features/fresnel.glsl.js`        |
| Obsidian default values           | `shaders/obsidian/defaults.js`                     |
| Glass refraction + frost          | `shaders/glass/features/refraction.glsl.js`        |
| Halo / vignette / grain (per mat) | `shaders/<material>/features/output.glsl.js`       |
| SVG/PNG padding                   | `pipeline/rasterize.js` (PAD_RATIO)                |
| Edge-style normals                | `pipeline/normals-sobel.js`                        |
| Sculpted-style normals            | `pipeline/normals-sdf.js`                          |
| Auto-drift path                   | `main.js` (autoPath function)                      |
| Shader HTML export                | `controls/shader-export.js`                        |
| Add a new material                | duplicate a folder under `shaders/`, register      |
| Add a new effect                  | duplicate a folder under `effects/`, register      |

## Adding a new material

1. Copy `js/shaders/mercury/` to `js/shaders/<your-id>/`.
2. Edit the GLSL in `features/` and `fragment.glsl.js` for the new look.
3. Edit `defaults.js` — set `material` params and a `lighting` preset
   (the four lighting uniforms every material declares).
4. Edit `uniforms.js` to declare your material's uniforms. Keep the
   `listEffects().forEach(eff => Object.assign(u, eff.createUniforms()))`
   block at the bottom so effect uniforms get merged in.
5. In `fragment.glsl.js`, follow the assembly contract:
   - Declare the four lighting uniforms (`u_diffuse`, `u_specular`,
     `u_shininess`, `u_lightHeight`) — effects rely on them.
   - In `main()`, set up `specular` (vec3), `iriT` (float), `flow` (float),
     `blob` (float — use 0.0 if your material has no metaball), and `halo`
     (vec3) **before** the `EFFECTS_APPLY` slot. Effects read or modify them.
   - Do the final composite AFTER `EFFECTS_APPLY` so any tint to `specular`
     survives into the ornament.
6. Edit `controls.js` to expose your material parameters (no lighting or
   iridescence controls — those belong in Effects).
7. Update `serializeForExport` in `index.js` to bake your uniforms.
8. Register in `js/shaders/index.js`.

## Adding a new effect

1. Copy `js/effects/chromatic-aberration/` to `js/effects/<your-id>/`.
2. In `glsl.js`, export `uniforms` (declarations), `helpers` (functions),
   and `apply` (the inline block injected at `EFFECTS_APPLY`).
3. Inside `apply`, you can read any of the intermediates every material
   exposes: `specular` (vec3), `iriT`, `flow`, `blob`, `texUV`, `sUV`,
   `mask`, `bloom`, `N`, `NdotL`, `halo`, `haloMask`, `haloIntensity`.
   You can modify `specular`, `halo`, and `mask` (the CA effect rewrites
   `mask` to produce its fringe).
4. Edit `defaults.js`, `uniforms.js`, `controls.js`, `index.js`.
5. Register in `js/effects/index.js`. Order matters — it determines
   both sidebar order and apply order in `main()`.

## Materials

All four materials share a realism baseline: Schlick Fresnel
reflectance, hemisphere ambient (sky/ground directional ambient),
light-color-tinted diffuse and specular, and ACES filmic tonemap on
the final output. Each adds its own character on top.

**Mercury** — Warm silver Blinn-Phong with a mercury blob that follows
the cursor. F0 reflectance is a slightly warm silver (metals inherit
their tint in reflection). With the Iridescence effect on, you get
the original studio's rainbow on the highlight; with everything off,
it's plain warm silver.

**Glass** — Refractive bg sampling with optional frost. The realism
pass added grazing-angle reflectance via Fresnel, which is what makes
glass look like glass (reflective at the edges, transparent through
the middle) instead of a flat tinted hole.

**Obsidian** — Deep near-black glass body with a 3-octave procedural
rough surface that breaks up specular reflections into a fine stippled
volcanic-glass look, plus a fresnel clearcoat rim. Inspired by the D20
obsidian dice reference. Roughness slider goes from polished glass
(0%) to coarse pumice (100%).

**Ceramic** — White porcelain: opaque matte body with a soft Fresnel
highlight, a fake subsurface inner glow (warm tint × bloom), and the
hemisphere ambient. Light, soft, and recognizable as bone china. The
inner glow color and strength are tunable.

## Effects

**Lighting** — Override the active material's preset Blinn-Phong
parameters: diffuse, specular, shininess, light height, AND light
color. Off by default → material's preset values rule (white light,
preset gain). On → sliders take over and the color picker tints both
diffuse and specular.

**Iridescence** — Cosine-palette rainbow tint on the specular
highlight and silhouette halo. Off by default. Works on any material.

**Chromatic Aberration** — RGB channel split along X, weighted by
silhouette edge bloom so fringing appears on ornament edges. Works
on any material.

## Shader HTML export

The "Shader HTML" button in the Export section produces a single,
self-contained HTML file with:

- the active material's GLSL (including effect helpers/apply blocks
  and the shared Fresnel/ambient/tonemap helpers) inlined
- all current uniform values hardcoded — both material and enabled
  effects, including light color
- if the Lighting effect is enabled, its slider values bake in and
  override the material's preset lighting uniforms
- the three generated textures (albedo, normal, bloom) baked as base64
  PNG data URLs
- the same pointer + idle-drift loop as the studio

No build step, no upload UI, no dependencies besides three.js via CDN.
The dev gets exactly what they're seeing in the viewport.
