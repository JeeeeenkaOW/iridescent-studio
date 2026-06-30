# Material Forge — session handoff

Pick-up notes for a fresh Claude Code session. Open this session **rooted in
this repo** (`iridescent-studio`) for the cleanest context. Read this file
first, then delete/ignore it once you're oriented — it's a transient handoff,
not permanent docs.

---

## What this is
Web Material Forge — a WebGL fragment-shader playground that turns an SVG/PNG
ornament into animated material previews. Internal Overwolf tool. Live at
https://web-material-forge.netlify.app/.

**Stack:** vanilla JS (ES modules) + three.js `0.160.0` via a browser import
map (CDN). **No build step, no package.json, no bundler.** Static — drag the
folder to Netlify. `index.html` loads `js/main.js`.

**Run locally:** any static server pointed at the repo root (e.g. `npx serve`,
or a tiny node server — see "Preview setup" below). Node 18+ is only needed for
the dev server; the app itself is browser-only.

---

## Current state (as of this handoff)
- HEAD: `ec10040 Mobile, material changes`. **Working tree clean — all work is
  committed.** Direct-to-`main` is the owner's workflow (don't branch unless
  asked; don't commit unless asked).
- 8 built-in presets, 6 effects, mobile layout, dead code removed — all done and
  in `main`.

## TWO OPEN ITEMS (both blocked last session by a degraded preview)
The previous session's preview browser broke mid-way: the window collapsed to
0px and **screenshots + WebGL canvas readback returned blank/black**. That
blocked these. A fresh session should have a healthy preview — do these first:

1. **Re-bake the preset thumbnails.** They were removed (chips currently fall
   back to CSS swatch gradients). Re-bake real centered photos — procedure in
   "Thumbnail bake" below. Goal: each chip shows a centered, symmetric,
   full-bleed peek of the actual material.
2. **Screenshot-verify four preset looks** that were only verified structurally
   (not visually) last session: **Gunmetal** (silver + fine brushed scratches),
   **Black Obsidian** (big glassy blob highlight), **Soap Bubble** (transparency
   over the checkerboard placeholder), **Holo-foil** (idle is color-stable, hue
   only shifts on hover). Adjust if any look off.

## Backlog (not started)
- **Particle cursor-follow** — add an attract/repel motion (optionally swirl) to
  the Particles material so dots react to the cursor. `u_mouse` is already
  available in that shader. Build it as a new field in `particles` motion, OR as
  a generic effect. Same pattern as the Emissive/Scratches effects.
- **README refresh** — `README.md` is stale after the dead-code sweep (it still
  describes `mercury/obsidian/ceramic/glass` materials and the old `js/shader/`
  monolith, all deleted). Update its architecture + file-map to match reality:
  only `solid` + `particles` materials are registered; effects are
  displacement/iridescence/bloom/chromatic-aberration/emissive/scratches.

---

## Architecture cheat-sheet (so you don't re-scan everything)

**Entry:** `index.html` → `js/main.js` (boots three.js, shared uniforms, render
loop, wires all controls).

**Two registries compose at runtime:**
- Materials — `js/shaders/<id>/`. Registered in `js/shaders/index.js`: only
  **`solid`** and **`particles`**. (Glass/Mercury/Obsidian/Ceramic were merged
  into `solid` and deleted.) Each material = vertex/fragment GLSL + uniforms +
  controls + defaults + `serializeForExport`.
- Effects — `js/effects/<id>/`. Registered in `js/effects/index.js`:
  displacement, iridescence, bloom, chromatic-aberration (id
  `chromaticAberration`), **emissive**, **scratches**. Each contributes
  `uniformsGlsl` + `helpersGlsl` + `applyGlsl` (injected at the `EFFECTS_APPLY`
  slot in BOTH materials) + controls + `serializeForExport`.

**Effect contract gotchas:**
- Effects compose on both materials. Both expose at `EFFECTS_APPLY`: `texUV`,
  `mask`, `specular`, `halo`, `haloMask`, `NdotL`, `NdotV`, `flow`, `iriT`, and
  the helpers `fbm()` / `hash()` / `loopTime2D()`.
- Emissive adds into a shared `vec3 emissiveTerm` that each material declares
  before `EFFECTS_APPLY` and adds into `ornament` at composite. Both materials
  gate `ornament` by their mask in output, so effect contributions land on the
  body automatically.
- Bloom's halo tint is **wall-time driven** (`iridescence(loopTime(...))`) — so
  a strong bloom halo self-cycles its hue over time. That's why Holo-foil has
  bloom OFF.
- Body iridescence (`iriT`) is **static** (NdotL + surface noise, NO time) — it
  shifts with cursor only. Auto-drift moves the cursor, so it shifts the hue
  too; turn `autoDrift` off in a preset to keep idle stable.

**Preset snapshot contract** (built-ins live in `js/presets/builtins.js`, all
go through the same `applyState()` as undo/save):
```
{ shaderId:'solid',
  material:{ material:{ baseColor,f0Color,roughness,refraction,refractionSlider,
                        refractionMix,frost,sssColor,sssStrength,fresnel,
                        fresnelPower,blobEnabled,blobRadius } },   // DOUBLE-nested
  lighting:{ enabled,diffuse,specular,shininess,height,color,ambient },
  effects:{ displacement:{enabled,strength}, iridescence:{enabled,mode,intensity,hue,stops},
            bloom:{enabled,strength,color,userColored},
            chromaticAberration:{enabled,strength},
            emissive:{enabled,strength,color,scale,speed,sharpness},
            scratches:{enabled,strength,density,angle,coverage} },
  bg:{ mode,colorMode,transparent,solid,gradient:{from,to,angle} },
  normals:{normals,strength}, motion:{autoDrift,previewLoop}, freeze:{...} }
```
The `build()` helper in `builtins.js` assembles this; bg defaults to **solid
black** (only Soap overrides, with `mode:'image'` for the checkerboard).

**The 8 presets:** Chrome, Black Obsidian, Molten Gold, Abalone Shell, Holo-foil,
Soap Bubble, Molten Lava, Gunmetal. Swatch (chip preview) + full snapshot each.

**Mobile layout** (`css/styles.css` `@media (max-width:860px)` + `js/controls/tabs.js`
+ `#mobile-tabs` in `index.html`): single column — compact nav → viewport pinned
top (~38vh) → tab bar (Setup/Material/Lighting/Effects) → active control group →
bottom bar. `body[data-mtab]` drives which group shows; the inspector's own tab
strip is hidden on mobile and driven by the mobile bar.

---

## Preview setup + the gotcha
There's no committed dev-server config. Set one up:
1. Write a tiny node static server (serves the repo with correct MIME for
   `.js`/`.css`) to a scratch path, or use `npx serve`.
2. Create `.claude/launch.json` in your **primary working dir** pointing
   `node` at it on a port, then `preview_start`.

**Canvas-sizing gotcha (important):** in the headless preview the WebGL canvas
often boots at width 0 (its `ResizeObserver` doesn't fire). Fix by dispatching a
resize after load: `window.dispatchEvent(new Event('resize'))` via `preview_eval`,
then poll until `document.querySelector('#viewport canvas').width > 2`. Do this
before any screenshot or pixel read. If screenshots/readbacks return blank even
after the canvas is sized, the preview instance is degraded — restart it
(`preview_stop` + `preview_start`) or start a fresh session.

## Thumbnail bake (the procedure)
Thumbnails are baked from the live shader, not hand-drawn. Per `<id>`: render
the material **full-bleed** (swap the source to a white rectangle so the whole
frame is material), center the highlight, capture the canvas into a 180×72 JPEG,
and POST it to a save endpoint that writes `js/presets/thumbs/<id>.jpg`.

Sketch (run via `preview_eval`, after ensuring canvas width > 2):
```js
// 1. swap source to a full-bleed white rect (drop event on #drop-zone)
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/></svg>';
const dt=new DataTransfer(); dt.items.add(new File([svg],'fb.svg',{type:'image/svg+xml'}));
document.getElementById('drop-zone').dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));
// 2. per preset: click chip, center pointer at canvas middle, wait for a rendered frame,
//    drawImage the #viewport canvas center-cropped into a 180x72 canvas, toDataURL('image/jpeg',0.85), POST to save endpoint
// 3. VERIFY each capture is non-blank (luminance stddev > 0) before trusting it — last session silently saved black frames
// 4. restore the default ornament (#drop-current-clear)
```
The save endpoint is a dev-only handler you add to the static server:
`POST /save-thumb?id=<id>` writes the posted data-URL to `js/presets/thumbs/<id>.jpg`.
Then re-enable the photo layer in `js/controls/presets.js` `builtinChip()`
(currently swatch-only): `background:url('js/presets/thumbs/${p.id}.jpg') center/cover, ${p.swatch}`.
**Always verify thumbnails aren't byte-identical/blank after baking.**

---

## Conventions
- Verify changes by running the app in the preview and observing (screenshots /
  pixel reads / DOM checks) — don't ask the user to check manually.
- No build step — edit files, reload the preview.
- Commit only when asked; the owner commits directly to `main`.
