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
Solid (a unified silver / dark-glass / porcelain shader, reachable via
sliders) and Glass (separate refractive shader) are the two registered
materials. A material is a self-contained bundle: its own GLSL,
uniforms, sidebar controls, defaults. Only one material is active at
a time; the top-level material picker swaps between them.

**Effects** (`js/effects/<id>/`) — independent layers applied on top of
any material. Displacement, Iridescence, Bloom, and Chromatic Aberration
are the registered effects. Each effect declares uniforms, GLSL helpers,
an "apply" block, and a controls UI. Multiple effects can be enabled
at once, and they work across all materials.

(Lighting USED to be in the effects registry but it was conceptually
different — overrides material uniforms rather than adding a composite
layer — so in v7 it was promoted to its own top-level sidebar section.
See `js/controls/lighting.js`.)

At assembly time, each material's fragment shader includes effect-uniform
declarations, effect helpers, and an `EFFECTS_APPLY` slot where each
effect's apply block runs in order. With every effect disabled, materials
render their plain baseline; the registry is the same shape either way.

Shared concerns — texture pipeline, background, normals, motion, export,
lighting, history — live outside both registries and feed every material.

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
    lighting.js                   ← top-level Lighting section (override material
                                    lighting uniforms — was an effect in v6,
                                    promoted to its own section in v7)
    effects.js                    ← Effects panel host (cards + toggles)
    shader-export.js              ← single-file HTML export of active material+effects
    collapsibles.js               ← click-to-toggle handler for sidebar sections
                                    (any `.section.collapsible` accordion-toggles
                                    via event delegation)
    tabs.js                       ← mobile tab bar — partitions the sidebar into
                                    5 tabs (Material / Lighting / Effects / Setup /
                                    Export). No-op on desktop (tab bar hidden via
                                    media query)
    history.js                    ← undo/redo with keyboard bindings
  shaders/                        ← material registry
    index.js                      ← SHADERS map + DEFAULT_SHADER
    _shared/                      ← GLSL helpers used by every material
      helpers.glsl.js             ← Schlick Fresnel, hemisphere ambient, ACES tonemap
      ambient.js                  ← shared sky/ground default hex colors
    solid/                        ← unified opaque material — silver / dark glass /
                                    porcelain / anything in between via sliders.
                                    Mercury, Obsidian and Ceramic were merged here.
    glass/                        ← refractive transparent shader (frost = normal
                                    perturbation + bg blur, brighten on N scatter)
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
        …                         ← plus material-specific blocks. Solid has
                                    metaball, roughness, refraction, fresnel rim,
                                    subsurface — all gated by uniform=0 → no-op.
                                    Glass has its own refraction + frost.
  effects/                        ← effect registry
    index.js                      ← EFFECTS array — order = sidebar order = apply order
    displacement/                 ← heat-haze UV warp on the silhouette
    iridescence/                  ← cosine-palette rainbow on specular + halo
    bloom/                        ← silhouette halo; strength + color picker
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
| Iridescence palette + intensity   | `effects/iridescence/glsl.js`                      |
| Displacement (heat-haze)          | `effects/displacement/glsl.js`                     |
| Bloom halo math                   | `effects/bloom/glsl.js`                            |
| Chromatic aberration math         | `effects/chromatic-aberration/glsl.js`             |
| Lighting overrides (ambient too)  | `controls/lighting.js`                             |
| Solid material cursor blob        | `shaders/solid/features/metaball.glsl.js`          |
| Solid material roughness          | `shaders/solid/features/roughness.glsl.js`         |
| Solid material subsurface         | `shaders/solid/features/subsurface.glsl.js`        |
| Solid material fresnel rim        | `shaders/solid/features/fresnel.glsl.js`           |
| Solid material refraction         | `shaders/solid/features/refraction.glsl.js`        |
| Solid material composite math     | `shaders/solid/features/composite.glsl.js`         |
| Solid material defaults           | `shaders/solid/defaults.js`                        |
| Glass refraction + frost          | `shaders/glass/features/refraction.glsl.js`        |
| Glass solid/frost composite       | `shaders/glass/features/output.glsl.js`            |
| Halo default color/intensity      | each material's `uniforms.js` (u_haloBase*)        |
| Vignette / grain (per material)   | `shaders/<material>/features/output.glsl.js`       |
| SVG/PNG padding                   | `pipeline/rasterize.js` (PAD_RATIO)                |
| Edge-style normals                | `pipeline/normals-sobel.js`                        |
| Sculpted-style normals            | `pipeline/normals-sdf.js`                          |
| Auto-drift path                   | `main.js` (autoPath function)                      |
| Shader HTML export                | `controls/shader-export.js`                        |
| Sidebar collapsibles              | `controls/collapsibles.js` + CSS `.collapsible`    |
| Mobile tab bar layout             | `controls/tabs.js` + `css/styles.css` @media block |
| Add a new material                | duplicate a folder under `shaders/`, register      |
| Add a new effect                  | duplicate a folder under `effects/`, register      |

## Adding a new material

1. Copy `js/shaders/solid/` to `js/shaders/<your-id>/`.
2. Edit the GLSL in `features/` and `fragment.glsl.js` for the new look.
3. Edit `defaults.js` — set `material` params, a `lighting` preset
   (the six lighting uniforms every material declares — five Blinn-Phong
   params plus `ambientStrength`), and ambient sky/ground tints.
4. Edit `uniforms.js` to declare your material's uniforms. Keep the
   `listEffects().forEach(eff => Object.assign(u, eff.createUniforms()))`
   block at the bottom so effect uniforms get merged in.
5. In `fragment.glsl.js`, follow the assembly contract:
   - Declare the lighting uniforms (`u_diffuse`, `u_specular`,
     `u_shininess`, `u_lightHeight`, `u_lightColor`, `u_ambientStrength`)
     — the top-level Lighting controls write into these when its
     override toggle is on.
   - Declare `u_haloBaseColor` (vec3) and `u_haloBaseIntensity` (float)
     — the Bloom effect reads these to seed its color picker and
     scale its strength.
   - In `main()`, set up `specular` (vec3), `iriT` (float), `flow` (float),
     `blob` (float — use 0.0 if your material has no metaball), `halo`
     (vec3, initialized to 0), and `haloMask` (float) **before** the
     `EFFECTS_APPLY` slot. The Iridescence effect multiplies `specular`
     by its palette and overwrites `halo` with a rainbow when enabled;
     the Bloom effect overwrites `halo` after that.
   - Do the final composite AFTER `EFFECTS_APPLY` so any tint applied
     to `specular` by effects reaches the output.
6. Edit `controls.js` to expose your material parameters (no lighting,
   iridescence, or CA controls — those belong in Effects).
7. Update `serializeForExport` in `index.js` to bake your uniforms.
8. Register in `js/shaders/index.js`.

## Adding a new effect

1. Copy `js/effects/chromatic-aberration/` to `js/effects/<your-id>/`.
2. In `glsl.js`, export `uniforms` (declarations), `helpers` (functions),
   and `apply` (the inline block injected at `EFFECTS_APPLY`).
3. Inside `apply`, you can read any of the intermediates every material
   exposes: `specular` (vec3), `iriT`, `flow`, `blob`, `texUV`, `sUV`,
   `mask`, `bloom`, `N`, `NdotL`, `NdotV`, `spec`, `halo`, `haloMask`,
   plus the halo baseline uniforms `u_haloBaseColor` and
   `u_haloBaseIntensity`. You can modify `specular`, `halo`, and `mask`
   (the CA effect rewrites `mask` to produce its fringe; Bloom writes
   `halo`; Iridescence multiplies `specular` and writes `halo`).
4. Edit `defaults.js`, `uniforms.js`, `controls.js`, `index.js`.
5. Register in `js/effects/index.js`. Order matters — it determines
   both sidebar order and apply order in `main()`.

## Materials

Both materials share a realism baseline: Schlick Fresnel reflectance,
hemisphere ambient (sky/ground directional ambient), light-color-tinted
diffuse and specular, and ACES filmic tonemap on the final output. Each
adds its own character on top.

**Solid** — The unified opaque material. A single fragment shader with
optional features that each disappear at strength = 0. Tunable knobs:

- *Base color* — diffuse albedo.
- *Reflection* — F0 colour. High and warm = metallic silver (old
  Mercury). Low and cool = dielectric (old Obsidian, old Ceramic).
- *Roughness* — 3-octave normal perturbation, 0 = smooth clearcoat,
  high = stippled volcanic-glass.
- *Bg refraction* + *Transparency* — together these let the body
  read as semi-transparent dark glass (old Obsidian style). At
  Transparency = 0, the body is fully opaque.
- *Inner glow* + *Glow strength* — fake subsurface (bloom-weighted
  tint added to diffuse), the porcelain look (old Ceramic).
- *Fresnel rim* + *Fresnel power* — clearcoat-style edge highlight.
- *Cursor blob* (toggle) — Mercury-style cursor-following metaball
  that boosts specular at the cursor.

Defaults reproduce the old Mercury look (silver, blob on, all extras
at zero). Reach Obsidian by lowering base/F0, raising roughness +
fresnel, and giving Transparency a touch. Reach Ceramic by warming
base, lowering F0, and pushing Glow strength.

**Glass** — Refractive transparent material with frost. Bg sampled
with normal-driven UV offset, optional ring blur. Frost both blurs
the bg AND perturbs the surface normal — this is what makes frost
read on a black background (the old version was invisible). Grazing
Schlick Fresnel mixes the body toward bright at the silhouette so it
reads as glass rather than a tinted hole.

## Lighting

Lighting is a top-level sidebar section — not an effect. It overrides
the active material's preset Blinn-Phong parameters: diffuse, specular,
shininess (1..256), light height, light colour, AND ambient strength
(scales the hemisphere ambient term — lets the body brighten or darken
independently of the cursor highlight). Off by default → the material's
preset values rule. Toggle the "Override material lighting" switch on
and the sliders take over; the colour picker tints both diffuse and
specular. Toggle off and the material's preset is restored.

In v6 Lighting was the first card in the Effects panel. It was promoted
to its own section because conceptually it's different from the other
effects: Iridescence / Bloom / CA / Displacement are layers added on
top of the material composite, whereas Lighting just rewrites uniforms
the material itself reads.

## Effects

**Displacement** — Heat-haze UV warp. Animated 2-octave noise offsets
the sample UV when reading the silhouette mask + bloom map, so the
edges of the ornament ripple over time. The lit interior stays
coherent (the highlight doesn't drift out of the body) because the
warp only modifies post-lighting variables: `mask`, `bloom`, and the
derived `haloMask`. Three sliders: Strength (0..100%), Scale (noise
frequency), Speed (animation rate). Default scale=3.0 / speed=1.0 reads
as classic heat-haze; cranking Strength to 100% gets dramatic wobble.

**Iridescence** — Cosine-palette rainbow tint on the specular
highlight and silhouette halo. Off by default. Intensity slider goes
to 200% — past 100% the palette overdrives the highlight to HDR so
ACES tonemapping turns it into saturated vivid colour (matches the
ornate-frame reference image instead of a subtle sheen). At 200% the
halo ring is ~6× the brightness it used to peak at. Works on either
material.

**Bloom** — Silhouette halo glow. Strength slider + colour picker
(picks up iridescence tint when both are on).

**Chromatic Aberration** — RGB channel split along X, weighted by
silhouette edge bloom so fringing appears on ornament edges. Works
on either material.

Effect ordering inside `EFFECTS_APPLY` (set in `js/effects/index.js`):
Displacement runs FIRST so subsequent effects see the warped masks.
Without that ordering, Iridescence's halo would have the pre-warp
shape while Bloom's would be warped — visible mismatch.

## Mobile layout

At ≤1000px wide, the layout switches to a sticky-viewport + tab-bar
arrangement:

- Viewport sticks to the top of the screen (45vh tall) and stays
  visible no matter how far the user scrolls.
- A tab bar sits directly below the viewport (also sticky) with five
  tabs: **Material · Lighting · Effects · Setup · Export**. Tapping
  a tab shows only that group's sections in the scrollable area below.
- Setup tab bundles Source vector, Background, Normals, and Motion —
  things you dial once and forget.

On desktop the tab bar is hidden via media query and the sidebar shows
every section in the usual scroll-down list. The two layouts share the
same DOM; only CSS differs.

## Shader HTML export

The "Shader HTML" button in the Export section produces a single,
self-contained HTML file with:

- the active material's GLSL (including effect helpers/apply blocks
  and the shared Fresnel/ambient/tonemap helpers) inlined
- all current uniform values hardcoded — both material and enabled
  effects, including light color
- if the Lighting override is enabled, its slider values bake in and
  override the material's preset lighting uniforms
- the three generated textures (albedo, normal, bloom) baked as base64
  PNG data URLs
- the same pointer + idle-drift loop as the studio

No build step, no upload UI, no dependencies besides three.js via CDN.
The dev gets exactly what they're seeing in the viewport.
