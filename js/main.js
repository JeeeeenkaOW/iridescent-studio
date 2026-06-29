// =========================================================
// MAIN — boot, three.js setup, state, render loop
// =========================================================
// The studio's job is split into three concerns:
//
//   1. SHARED state — resolution, mouse, time, generated textures, bg.
//      These live here and are reused across shader presets.
//
//   2. ACTIVE SHADER — owned by /shaders/<id>/. main.js asks the active
//      shader to produce its uniforms and material, then renders.
//
//   3. CONTROLS — sidebar UI. Some controls are shared (upload, bg,
//      normals, motion, export). Some are shader-specific and mounted
//      dynamically by controls/shader.js into #shader-controls.
//
import * as THREE from 'three';
import { rasterize, normalize, getLuminance } from './pipeline/rasterize.js';
import { sobelNormalMap } from './pipeline/normals-sobel.js';
import { sculptedNormalMap } from './pipeline/normals-sdf.js';
import { bloomMap } from './pipeline/bloom.js';
import { DEFAULT_SVG } from './default-svg.js';
import { loopCursor, loopCursorVel } from './util/loop-path.js';
import { initUpload } from './controls/upload.js';
import { initBackground } from './controls/background.js';
import { initNormals } from './controls/normals.js';
import { initMotion } from './controls/motion.js';
import { initFreeze } from './controls/freeze.js';
import { initExport } from './controls/export.js';
import { initShader } from './controls/shader.js';
import { initEffects } from './controls/effects.js';
import { initLighting } from './controls/lighting.js';
import { initShaderExport } from './controls/shader-export.js';
import { initHistory } from './controls/history.js';
import { initCollapsibles } from './controls/collapsibles.js';
import { initTabs } from './controls/tabs.js';
import { initInspectorTabs } from './controls/inspector-tabs.js';
import { initPresets } from './controls/presets.js';

// =========================================================
// STATE
// =========================================================
const state = {
  svgText: DEFAULT_SVG,
  svgName: 'Default ornament',
  inputKind: 'svg',
  inputBlob: null,
  bg: {
    mode: 'transparent',
    transparent: true,
    colorMode: 'solid',
    solid: '#000000',
    gradient: { from: '#000000', to: '#202020', angle: 180 },
    imageBlob: null,
    imageName: '',
    videoBlob: null,
    videoName: '',
  },
  normals: 'edge',
  strength: 4.0,
  autoDrift: true,
  // Preview-loop mode: editor uses the same circular auto-drift path
  // and periodic noise time as export capture, so the user can verify
  // their loop closes before recording. Forces auto-drift on, ignores
  // cursor input. See motion control + render loop.
  previewLoop: false,
  // Freeze pose: lock u_mouse + u_time to a snapshot so the user can
  // dial in the perfect light/iridescence angle and PNG-export it.
  // Render loop short-circuits the cursor/drift/time logic when on.
  // Click-to-place on the viewport updates freezePos in real time.
  // See controls/freeze.js.
  freeze: false,
  freezePos: { x: 0.5, y: 0.5 },
  freezeTime: 0,
  loopDuration: 4.0,
  // Export controls (apply to WebM and PNG sequence; PNG snapshot
  // uses resScale only).
  fps: 30,
  resScale: 1,        // 1, 2, or 4 — multiplier on viewport size
  // Stop/resume the time-driven animation (noise, idle drift, particle
  // motion). Hover still poses the highlight while stopped. Toggled by
  // the bottom-bar button and the Space key.
  animPaused: false,
};

// =========================================================
// THREE SETUP
// =========================================================
const viewport = document.getElementById('viewport');
const canvas = document.createElement('canvas');
viewport.appendChild(canvas);

// alpha: true is required for transparent PNG/WebM export. setClearAlpha(0)
// ensures the WebGL framebuffer's "unwritten" pixels are fully transparent
// rather than opaque black; the shader explicitly writes alpha=1 in normal
// (non-transparent-bg) mode so non-transparent exports are unaffected.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearAlpha(0);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// =========================================================
// SHARED UNIFORMS — passed to every shader preset
// =========================================================
const sharedUniforms = {
  u_resolution:   { value: new THREE.Vector2(1, 1) },
  u_imgAspect:    { value: 1.0 },
  u_mouse:        { value: new THREE.Vector2(0.5, 0.5) },
  u_mouseVel:     { value: new THREE.Vector2(0, 0) },
  u_time:         { value: 0 },
  u_loopMode:     { value: 0.0 },  // 1 during export recording
  u_loopDuration: { value: 4.0 },  // matches default state.loopDuration
  u_albedo:       { value: null },
  u_normal:       { value: null },
  u_bloom:        { value: null },
  u_bgTex:        { value: null },
  // 1.0 when transparent background is on. Each shader's outputBlock
  // gates the bg sample with this and writes alpha = inside * mask
  // instead of 1.0, so the ornament gets a proper alpha cutout.
  u_bgTransparent: { value: 0.0 },
};

let activeMesh = null;
let activeUniforms = null;
let activeShader = null;

function setActiveShader(shader) {
  // Tear down old mesh
  if (activeMesh) {
    scene.remove(activeMesh);
    activeMesh.geometry.dispose();
    activeMesh.material.dispose();
  }

  activeShader = shader;
  activeUniforms = shader.createUniforms(sharedUniforms);

  const mat = new THREE.ShaderMaterial({
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    uniforms: activeUniforms,
    depthTest: false,
    depthWrite: false,
  });
  activeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  scene.add(activeMesh);

  return activeUniforms;
}

// =========================================================
// TEXTURE REBUILD
// =========================================================
let albedoTex = null, normalTex = null, bloomTex = null;

function disposeTexes() {
  if (albedoTex) albedoTex.dispose();
  if (normalTex) normalTex.dispose();
  if (bloomTex)  bloomTex.dispose();
}

function makeCanvasTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = false;
  return t;
}

function dataToCanvas(data, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const imgData = ctx.createImageData(w, h);
  imgData.data.set(data);
  ctx.putImageData(imgData, 0, 0);
  return c;
}

async function rebuild() {
  const source = state.inputKind === 'svg'
    ? { kind: 'svg', text: state.svgText }
    : { kind: 'png', blob: state.inputBlob };

  const rawCanvas = await rasterize(source);
  const normalized = normalize(rawCanvas);
  const { lum, w, h } = getLuminance(normalized);

  const normalData = state.normals === 'sculpted'
    ? sculptedNormalMap(lum, w, h, Math.max(state.strength, 1) * 1.5)
    : sobelNormalMap(lum, w, h, state.strength);
  const bloomData = bloomMap(lum, w, h);

  disposeTexes();
  albedoTex = makeCanvasTexture(normalized);
  normalTex = makeCanvasTexture(dataToCanvas(normalData, w, h));
  bloomTex  = makeCanvasTexture(dataToCanvas(bloomData,  w, h));

  sharedUniforms.u_albedo.value = albedoTex;
  sharedUniforms.u_normal.value = normalTex;
  sharedUniforms.u_bloom.value  = bloomTex;
  sharedUniforms.u_imgAspect.value = w / h;
}

// =========================================================
// RESIZE
// =========================================================
function resize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  renderer.setSize(w, h, false);
  sharedUniforms.u_resolution.value.set(w, h);
  if (bgCtl && bgCtl.redraw) bgCtl.redraw();
}
window.addEventListener('resize', resize);

// The window 'resize' event misses size changes that come from layout
// rather than the window itself: sidebar reflow, the mobile sticky
// viewport growing/shrinking as the URL bar hides/shows, orientation
// changes, devtools docking. When the viewport box changes size without
// a window resize, the drawing buffer keeps its old dimensions while CSS
// (the canvas is width:100%/height:100%) stretches it to fill the new
// box — which distorts the whole render, most visibly turning the round
// cursor blob into an ellipse even when nothing is moving. A
// ResizeObserver catches every box change and re-syncs the buffer +
// u_resolution, so the buffer aspect always matches the displayed box
// and screenAspect stays correct (blob stays round). The initial
// observe() callback also covers any post-load layout shift.
if (typeof ResizeObserver !== 'undefined') {
  const viewportRO = new ResizeObserver(() => resize());
  viewportRO.observe(viewport);
}

async function rebuildAndResize() {
  await rebuild();
  resize();
}

// Run `fn` with the renderer temporarily resized to (baseW*scale, baseH*scale).
// Used by every export path to support the resolution picker. Restores to the
// canvas's natural size after fn completes (resolves or rejects). bg redraws
// happen automatically via resize() since the gradient/image renderer adapts
// to canvas aspect; aspect is preserved so they don't squish.
//
// For PNG: scale up, render, capture, scale down. Quick.
// For WebM: scale up, start recording (captureStream locks dimensions),
//   wait, stop, scale down.
// For PNG sequence: scale up, render+capture each frame in a loop, scale down.
async function withResolution(scale, fn) {
  const baseW = viewport.clientWidth;
  const baseH = viewport.clientHeight;
  const targetW = Math.round(baseW * scale);
  const targetH = Math.round(baseH * scale);
  const needsResize = scale !== 1;
  try {
    if (needsResize) {
      renderer.setSize(targetW, targetH, false);
      sharedUniforms.u_resolution.value.set(targetW, targetH);
      // Bg canvas redraws its aspect-fit gradient/image at the new size.
      if (bgCtl && bgCtl.redraw) bgCtl.redraw();
    }
    return await fn();
  } finally {
    if (needsResize) {
      // resize() reads viewport.clientWidth/Height which haven't changed
      // (we resized the renderer, not the CSS size), so this restores
      // exactly to the natural canvas resolution.
      resize();
    }
  }
}

// =========================================================
// POINTER + AUTO-DRIFT
// =========================================================
let mouseRaw = { x: 0.5, y: 0.5 };
let mouseSmooth = { x: 0.5, y: 0.5 };
let mousePrev = { x: 0.5, y: 0.5 };
let lastUserMoveAt = -Infinity;
let autoBlend = 1.0;

viewport.addEventListener('pointermove', (e) => {
  const rect = viewport.getBoundingClientRect();
  mouseRaw.x = (e.clientX - rect.left) / rect.width;
  mouseRaw.y = (e.clientY - rect.top) / rect.height;
  lastUserMoveAt = animTime;
});

const IDLE_DELAY = 1.6;
const BLEND_TIME = 1.4;

// Interactive auto-drift: quasi-Lissajous, organic-feeling, but NOT
// periodic — it never closes a loop at the user's chosen duration.
function autoPath(t) {
  const x = 0.5 + Math.sin(t * 0.27) * 0.28 + Math.sin(t * 0.11) * 0.05;
  const y = 0.5 + Math.cos(t * 0.19) * 0.22 + Math.cos(t * 0.07) * 0.06;
  return { x, y };
}

// Recording auto-drift (the perfect circle that closes exactly at
// loopDuration) now lives in js/util/loop-path.js as loopCursor /
// loopCursorVel, shared with both exporters. See the loop-time-domain
// branch in loop() below.

// =========================================================
// RENDER LOOP
// =========================================================
const startTime = performance.now();
let captureStart = null;

// Animation clock. Advances by real delta each frame while not
// capturing. The editor is always interactive (hover + auto-drift);
// loop preview + export looping are opt-in via state.previewLoop /
// the export path.
let animTime = 0;
let lastFrameMs = null;

function loop() {
  // PNG sequence export drives uniforms + render manually frame-by-frame.
  if (state.sequencing) {
    requestAnimationFrame(loop);
    return;
  }

  // Freeze pose short-circuit (export pose lock) — unchanged.
  if (state.freeze) {
    mouseSmooth.x = state.freezePos.x;
    mouseSmooth.y = state.freezePos.y;
    mousePrev.x   = state.freezePos.x;
    mousePrev.y   = state.freezePos.y;
    sharedUniforms.u_mouse.value.set(state.freezePos.x, 1 - state.freezePos.y);
    sharedUniforms.u_mouseVel.value.set(0, 0);
    sharedUniforms.u_time.value = state.freezeTime;
    sharedUniforms.u_loopMode.value = 0.0;
    sharedUniforms.u_loopDuration.value = state.loopDuration || 4.0;
    renderer.render(scene, camera);
    lastFrameMs = performance.now();
    requestAnimationFrame(loop);
    return;
  }

  const now = performance.now();
  const dt = lastFrameMs ? Math.min((now - lastFrameMs) / 1000, 0.1) : 0;
  lastFrameMs = now;

  const capturing = captureStart !== null;
  const loopDur = state.loopDuration || 4.0;

  if (!capturing && !state.animPaused) animTime += dt;

  // "Loop time domain" = circular cursor + periodic noise. Capture and
  // preview-loop opt in; otherwise the editor is interactive.
  const loopTimeDomain = capturing || state.previewLoop;

  const t = capturing
    ? ((now - captureStart) / 1000) % loopDur
    : (loopTimeDomain ? (animTime % loopDur) : animTime);

  if (loopTimeDomain) {
    // Loop preview / capture: snap cursor to the perfect circle and
    // compute velocity analytically.
    const auto = loopCursor(t, loopDur);
    mouseSmooth.x = auto.x;
    mouseSmooth.y = auto.y;
    mousePrev.x = auto.x;
    mousePrev.y = auto.y;
    const v = loopCursorVel(t, loopDur);
    sharedUniforms.u_mouseVel.value.set(v.vx, v.vy);
  } else {
    // Interactive mode: blend between cursor and quasi-Lissajous drift.
    const auto = autoPath(animTime);
    const idleFor = animTime - lastUserMoveAt;
    const driftEnabled = state.autoDrift;
    const targetBlend = !driftEnabled ? 0.0 :
      (idleFor < IDLE_DELAY ? 0.0 : Math.min(1.0, (idleFor - IDLE_DELAY) / BLEND_TIME));
    autoBlend += (targetBlend - autoBlend) * 0.06;
    const targetX = mouseRaw.x * (1 - autoBlend) + auto.x * autoBlend;
    const targetY = mouseRaw.y * (1 - autoBlend) + auto.y * autoBlend;
    const lerpAmt = 0.075;
    mouseSmooth.x += (targetX - mouseSmooth.x) * lerpAmt;
    mouseSmooth.y += (targetY - mouseSmooth.y) * lerpAmt;
    const vx = mouseSmooth.x - mousePrev.x;
    const vy = mouseSmooth.y - mousePrev.y;
    mousePrev.x = mouseSmooth.x;
    mousePrev.y = mouseSmooth.y;
    sharedUniforms.u_mouseVel.value.set(vx, -vy);
  }

  sharedUniforms.u_time.value = t;
  sharedUniforms.u_mouse.value.set(mouseSmooth.x, 1 - mouseSmooth.y);
  sharedUniforms.u_loopMode.value = loopTimeDomain ? 1.0 : 0.0;
  sharedUniforms.u_loopDuration.value = loopDur;

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// =========================================================
// WIRE CONTROLS
// =========================================================
const statusEl = document.getElementById('viewport-status');

// History needs references to all the controls so capture/apply can
// read and write across them. Controls also need a reference to
// history so they can push() on every input. We resolve the
// chicken-and-egg by:
//   1. Creating `history` first with capture/apply closures that
//      reference the late-bound control handles via outer scope.
//   2. Initializing all controls, passing `history` to each.
//   3. Calling history.clear() at the very end, which finally invokes
//      capture() now that all controls exist — seeding the initial
//      "current state" so the first undo has a valid target.
//
// `restoring` inside history.js guards against the input/change events
// fired by restore() from re-pushing during an undo/redo.
let bgCtl       = null;
let normalsCtl  = null;
let motionCtl   = null;
let freezeCtl   = null;
let shaderCtl   = null;
let effectsCtl  = null;
let lightingCtl = null;

function captureState() {
  return {
    shaderId: shaderCtl?.getActiveShaderId?.() ?? null,
    material: shaderCtl?.snapshot?.() ?? null,
    lighting: lightingCtl?.snapshot?.() ?? null,
    effects:  effectsCtl?.snapshot?.() ?? null,
    bg:       bgCtl?.snapshot?.() ?? null,
    normals:  normalsCtl?.snapshot?.() ?? null,
    motion:   motionCtl?.snapshot?.() ?? null,
    freeze:   freezeCtl?.snapshot?.() ?? null,
  };
}

async function applyState(snap) {
  if (!snap) return;
  // 1) Material switch first — this remounts material controls AND
  //    the Lighting and Effects panels. The new panels are bound to
  //    the freshly-mounted material's uniforms via shaderCtl's onMount
  //    callback (which sets lightingCtl + effectsCtl).
  if (snap.shaderId) {
    shaderCtl.restoreShaderId(snap.shaderId);
  }
  // 2) Restore material's own controls against the (possibly new)
  //    material's snapshot. Awaited because the Particles material's
  //    restore is async (re-rasterizes the custom-shape SVG into a
  //    CanvasTexture). Other materials return undefined/sync; await
  //    on a non-Promise is harmless.
  await shaderCtl.getActiveControls()?.restore?.(snap.material);
  // 3) Restore Lighting (its enabled state + slider values; if the
  //    override toggle was on, the sliders write into the new
  //    material's uniforms).
  lightingCtl?.restore?.(snap.lighting);
  // 4) Restore effects state.
  effectsCtl?.restore?.(snap.effects);
  // 5) Background.
  bgCtl?.restore?.(snap.bg);
  // 6) Normals — may trigger a texture rebuild if mode/strength changed.
  await normalsCtl?.restore?.(snap.normals);
  // 7) Motion toggle.
  motionCtl?.restore?.(snap.motion);
  // 8) Freeze pose.
  freezeCtl?.restore?.(snap.freeze);
}

const history = initHistory({
  capture: captureState,
  apply:   applyState,
});

initUpload({ state, statusEl, rebuildAndResize, history });

// Background wants a uniforms-like target so it can write u_bgTex.
// We give it the shared uniforms object directly — bgTex lives there.
bgCtl = initBackground({ state, uniforms: sharedUniforms, viewport, history });

normalsCtl = initNormals({ state, rebuild, history });
motionCtl  = initMotion({ state, history });
freezeCtl  = initFreeze({
  state,
  viewport,
  // On enable, freeze captures the CURRENT mouseSmooth (the on-screen
  // cursor position the loop is actually using, after smoothing /
  // drift / etc) plus the current u_time. This makes "freeze now"
  // preserve whatever pose the user was already looking at.
  getCurrent: () => ({
    x: mouseSmooth.x,
    y: mouseSmooth.y,
    time: sharedUniforms.u_time.value,
  }),
  history,
});
initExport({
  state, renderer, scene, camera, sharedUniforms, history, withResolution,
  getRecordingCtx: () => ({
    resetIdle: () => { lastUserMoveAt = -Infinity; },
    startCapture: () => {
      captureStart = performance.now();
      // Note: u_loopMode / u_loopDuration are now owned by the render
      // loop, which sets them every frame based on (capturing ||
      // state.previewLoop). We just have to set captureStart and the
      // render loop picks it up.
    },
    endCapture: () => {
      captureStart = null;
    },
  }),
});

// Shader picker — calls back with the chosen shader. We swap meshes
// and return the new uniforms object so the shader's controls can
// wire themselves to it. The Lighting + Effects panels re-mount on
// every shader change because each material's uniforms object is
// fresh and ships its own preset lighting values.
const effectsHost  = document.getElementById('effects-host');
const lightingHost = document.getElementById('lighting-host');

shaderCtl = initShader({
  onShaderChange: (shader) => setActiveShader(shader),
  onMount: (uniforms /* , shader */) => {
    // Preserve both the Lighting enable state AND the user's tuning
    // across material switches. Without this, switching materials
    // would silently snap lighting back to the new material's preset
    // and lose any custom values the user had dialed in.
    const prevLightingEnabled  = lightingCtl?.isEnabled?.() ?? false;
    const prevLightingSnapshot = lightingCtl?.snapshot?.()  ?? null;

    // (Re-)mount the Lighting panel against the new uniform object.
    // We deliberately re-create rather than rebind so it re-reads the
    // new material's preset values as the restore-target — but we
    // pass the previous snapshot as initialSnapshot so the slider
    // positions carry over.
    lightingHost.innerHTML = '';
    lightingCtl = initLighting({
      host: lightingHost,
      uniforms,
      history,
      initialEnabled:  prevLightingEnabled,
      initialSnapshot: prevLightingSnapshot,
    });

    // (Re-)mount the Effects panel against the new uniform object.
    // Capture the previous snapshot (slider values + on/off states)
    // so the user's effect tuning persists across material switches.
    const prevEffectsSnapshot = effectsCtl?.snapshot?.() ?? null;
    effectsHost.innerHTML = '';
    effectsCtl = initEffects({
      host: effectsHost,
      uniforms,
      history,
      initialSnapshot: prevEffectsSnapshot,
    });
  },
  history,
});

// Shader HTML export — reads from whatever shader is active.
initShaderExport({
  getActiveShader: () => activeShader,
  getUniforms:     () => activeUniforms,
  getSnapshot:     () => shaderCtl.snapshot(),
  getEffectsSnapshot:  () => effectsCtl?.snapshot?.()  ?? {},
  getLightingSnapshot: () => lightingCtl?.snapshot?.() ?? null,
});

// Seed history's initial state now that every control exists.
history.clear();

// Capture the pristine default configuration so the bottom-bar Reset
// can return to it. Taken right after history.clear() (before any user
// edit) so it's the true defaults. Reset re-applies it and pushes one
// history step, so an accidental reset is undoable with Ctrl+Z.
const defaultSnapshot = captureState();

// Click-to-toggle for sidebar collapsibles. Uses event delegation so
// it works regardless of mount order. Safe to call last.
initCollapsibles();

// Mobile tab bar. No-op on desktop (the bar is hidden via media query).
initTabs();

// Inspector tabs (Material / Lighting / Effects) in the right column.
initInspectorTabs();

// ---------------------------------------------------------
// BOTTOM-BAR / EXPORT MODAL wiring
// ---------------------------------------------------------
// The editor is interactive by default (hover + auto-drift). Loop +
// Auto-drift toggles live inside the export modal and are wired by
// motion.js (ids #ctl-auto-drift / #ctl-preview-loop). Here we own the
// export popover open/close and the toast used by Presets.
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1600);
}

// Export popover (anchored to the bottom-bar Export button).
const exportBtn = document.getElementById('export-btn');
const exportPop = document.getElementById('export-pop');
if (exportBtn && exportPop) {
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportPop.classList.toggle('open');
    // Recompute the resolution readout on open — at this point the
    // viewport has settled, so the dims are accurate (fixes the stale
    // "tiny size" the label sometimes showed before first layout).
    if (exportPop.classList.contains('open')) {
      window.dispatchEvent(new Event('resize'));
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.export-wrap')) exportPop.classList.remove('open');
  });
}

// ---------------------------------------------------------
// Animation stop/resume (bottom bar + Space key)
// ---------------------------------------------------------
const animToggle = document.getElementById('anim-toggle');
function setAnimPaused(paused) {
  state.animPaused = paused;
  if (animToggle) {
    animToggle.textContent = paused ? 'Resume animation' : 'Stop animation';
    animToggle.classList.toggle('on', paused);
  }
}
if (animToggle) {
  animToggle.addEventListener('click', () => setAnimPaused(!state.animPaused));
}
// Space toggles animation, except while typing in a field.
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  const t = e.target;
  const tag = t && t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
  e.preventDefault();
  setAnimPaused(!state.animPaused);
});

// ---------------------------------------------------------
// Reset everything to defaults (undoable)
// ---------------------------------------------------------
const resetBtn = document.getElementById('btn-reset');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    await applyState(defaultSnapshot);
    history.push();
    toast('Reset to defaults · Ctrl+Z to undo');
  });
}

// Presets — uses the same captureState/applyState as undo + project.
initPresets({
  host:    document.getElementById('presets'),
  saveBtn: document.getElementById('btn-save-preset'),
  loadBtn: document.getElementById('btn-load-preset'),
  captureState,
  applyState,
  history,
  toast,
});

// =========================================================
// BOOT
// =========================================================
(async () => {
  await rebuild();
  resize();
  loop();
})();
