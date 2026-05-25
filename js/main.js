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
import { initUpload } from './controls/upload.js';
import { initBackground } from './controls/background.js';
import { initNormals } from './controls/normals.js';
import { initMotion } from './controls/motion.js';
import { initExport } from './controls/export.js';
import { initShader } from './controls/shader.js';
import { initEffects } from './controls/effects.js';
import { initLighting } from './controls/lighting.js';
import { initShaderExport } from './controls/shader-export.js';
import { initProject } from './controls/project.js';
import { initHistory } from './controls/history.js';
import { initCollapsibles } from './controls/collapsibles.js';
import { initTabs } from './controls/tabs.js';

// =========================================================
// STATE
// =========================================================
const state = {
  svgText: DEFAULT_SVG,
  svgName: 'Default ornament',
  inputKind: 'svg',
  inputBlob: null,
  bg: {
    mode: 'solid',
    transparent: false,
    solid: '#000000',
    gradient: { from: '#000000', to: '#202020', angle: 180 },
    imageBlob: null,
    imageName: '',
  },
  normals: 'edge',
  strength: 4.0,
  autoDrift: true,
  // Preview-loop mode: editor uses the same circular auto-drift path
  // and periodic noise time as export capture, so the user can verify
  // their loop closes before recording. Forces auto-drift on, ignores
  // cursor input. See motion control + render loop.
  previewLoop: false,
  loopDuration: 4.0,
  // Export controls (apply to WebM and PNG sequence; PNG snapshot
  // uses resScale only).
  fps: 30,
  resScale: 1,        // 1, 2, or 4 — multiplier on viewport size
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
  lastUserMoveAt = (performance.now() - startTime) / 1000;
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

// Recording auto-drift: a perfect circle that closes exactly at
// loopDuration. Used while capturing video so the export is a true
// seamless loop. Radius is wider than interactive drift because the
// recorded motion needs to be visually obvious.
function autoPathLooping(t, loopDuration) {
  const phase = (t / loopDuration) * Math.PI * 2;
  const x = 0.5 + Math.sin(phase) * 0.30;
  const y = 0.5 + Math.cos(phase) * 0.24;
  return { x, y };
}

// =========================================================
// RENDER LOOP
// =========================================================
const startTime = performance.now();
let captureStart = null;

function loop() {
  // PNG sequence export drives uniforms + render manually frame-by-frame.
  // If the rAF loop runs in between sequence frames, it'll overwrite the
  // uniforms we just set. Skip the rAF render entirely while sequencing —
  // the sequence exporter is the sole renderer.
  if (state.sequencing) {
    requestAnimationFrame(loop);
    return;
  }

  const now = performance.now();
  const capturing = captureStart !== null;
  // "Loop time domain" = anything that needs periodic time + circular
  // cursor path. Capture is the original case; previewLoop opts in to
  // the same behaviour during interactive editing so the user can see
  // their loop close before they hit record.
  const loopTimeDomain = capturing || state.previewLoop;

  // In loop-time-domain, wrap t modulo loopDuration. This is THE key to
  // a seamless loop: by construction, state at t=loopDuration is
  // identical to state at t=0 (every shader noise field driven by
  // loopTime/loopTime2D, the auto-path, and u_time itself all wrap
  // exactly at that period). Whichever frame the recorder captures
  // last (it's always slightly less than loopDuration due to frame
  // pacing), that frame's state is one Δ-step before t=0, so the
  // last→first frame transition on replay is just one normal step.
  //
  // tBase: when actively recording, anchor to captureStart so the
  // exported video starts at t=0. Otherwise anchor to startTime — which
  // means flipping preview-loop on mid-session enters at the current
  // wall-clock phase. That's fine; the loop is still seamless because
  // wrapping is modular.
  const loopDur = state.loopDuration || 4.0;
  const tBase = capturing
    ? (now - captureStart) / 1000
    : (now - startTime) / 1000;
  const t = loopTimeDomain ? (tBase % loopDur) : tBase;

  if (loopTimeDomain) {
    // Loop preview / capture: snap the cursor directly to a perfect circle
    // and compute velocity analytically (the circle's tangent at this
    // phase). Computing velocity from position deltas would give garbage
    // on frame 0 (no prior position) and create a first-frame jump that
    // breaks the loop visually for any effect that uses u_mouseVel (the
    // metaball tail). For preview-loop this matters less but the analytical
    // form is consistent and avoids surprising jumps when preview-loop is
    // toggled on.
    //
    // Cursor input is intentionally ignored here — preview-loop is "watch
    // the loop play" mode. To regain interactive control, toggle it off.
    const auto = autoPathLooping(t, loopDur);
    mouseSmooth.x = auto.x;
    mouseSmooth.y = auto.y;
    mousePrev.x = auto.x;
    mousePrev.y = auto.y;
    // Analytical tangent of the circle at phase = (t/loopDur)*2π:
    //   x = 0.5 + 0.30 * sin(phase)  → dx/dt =  0.30 * cos(phase) * 2π/loopDur
    //   y = 0.5 + 0.24 * cos(phase)  → dy/dt = -0.24 * sin(phase) * 2π/loopDur
    // Scale by a small frame-time factor so the velocity magnitude is in
    // the same ballpark as the interactive mode.
    const phase = (t / loopDur) * Math.PI * 2;
    const angularRate = (Math.PI * 2) / loopDur;
    const dxdt =  0.30 * Math.cos(phase) * angularRate;
    const dydt = -0.24 * Math.sin(phase) * angularRate;
    const perFrame = 1 / 60;
    sharedUniforms.u_mouseVel.value.set(dxdt * perFrame, -dydt * perFrame);
  } else {
    // Interactive mode: blend between cursor and quasi-Lissajous drift.
    const auto = autoPath(t);
    const idleFor = t - lastUserMoveAt;
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
  // u_loopMode = 1 in any loop-time-domain so shader noise (loopTime,
  // loopTime2D) returns periodic values. Capture mode used to set this
  // via getRecordingCtx; we now drive it from here so preview-loop
  // benefits from the same shader periodicity without duplicating logic.
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
  //    material's snapshot.
  shaderCtl.getActiveControls()?.restore?.(snap.material);
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

// Project save/load — reuses the same captureState / applyState used
// for undo/redo, just serialized to a downloadable JSON file. Wired
// last so all controls exist before captureState is invoked, and so
// the load path can call history.push() on the freshly applied state.
initProject({
  captureState,
  applyState,
  history,
});

// Seed history's initial state now that every control exists.
history.clear();

// Click-to-toggle for sidebar collapsibles. Uses event delegation so
// it works regardless of mount order. Safe to call last.
initCollapsibles();

// Mobile tab bar. No-op on desktop (the bar is hidden via media query).
initTabs();

// =========================================================
// BOOT
// =========================================================
(async () => {
  await rebuild();
  resize();
  loop();
})();
