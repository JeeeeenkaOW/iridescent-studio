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
import { initShaderExport } from './controls/shader-export.js';

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
    solid: '#000000',
    gradient: { from: '#000000', to: '#202020', angle: 180 },
    imageBlob: null,
    imageName: '',
  },
  normals: 'edge',
  strength: 4.0,
  autoDrift: true,
  loopDuration: 4.0,
};

// =========================================================
// THREE SETUP
// =========================================================
const viewport = document.getElementById('viewport');
const canvas = document.createElement('canvas');
viewport.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// =========================================================
// SHARED UNIFORMS — passed to every shader preset
// =========================================================
const sharedUniforms = {
  u_resolution: { value: new THREE.Vector2(1, 1) },
  u_imgAspect:  { value: 1.0 },
  u_mouse:      { value: new THREE.Vector2(0.5, 0.5) },
  u_mouseVel:   { value: new THREE.Vector2(0, 0) },
  u_time:       { value: 0 },
  u_albedo:     { value: null },
  u_normal:     { value: null },
  u_bloom:      { value: null },
  u_bgTex:      { value: null },
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
function autoPath(t) {
  const x = 0.5 + Math.sin(t * 0.27) * 0.28 + Math.sin(t * 0.11) * 0.05;
  const y = 0.5 + Math.cos(t * 0.19) * 0.22 + Math.cos(t * 0.07) * 0.06;
  return { x, y };
}

// =========================================================
// RENDER LOOP
// =========================================================
const startTime = performance.now();
let captureStart = null;

function loop() {
  const now = performance.now();
  const t = captureStart !== null
    ? (now - captureStart) / 1000
    : (now - startTime) / 1000;

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

  sharedUniforms.u_time.value = t;
  sharedUniforms.u_mouse.value.set(mouseSmooth.x, 1 - mouseSmooth.y);
  sharedUniforms.u_mouseVel.value.set(vx, -vy);

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// =========================================================
// WIRE CONTROLS
// =========================================================
const statusEl = document.getElementById('viewport-status');

initUpload({ state, statusEl, rebuildAndResize });

// Background wants a uniforms-like target so it can write u_bgTex.
// We give it the shared uniforms object directly — bgTex lives there.
const bgCtl = initBackground({ state, uniforms: sharedUniforms, viewport });

initNormals({ state, rebuild });
initMotion({ state });
initExport({
  state, renderer, scene, camera,
  getRecordingCtx: () => ({
    resetIdle: () => { lastUserMoveAt = -Infinity; },
    startCapture: () => { captureStart = performance.now(); },
    endCapture:   () => { captureStart = null; },
  }),
});

// Shader picker — calls back with the chosen shader. We swap meshes
// and return the new uniforms object so the shader's controls can
// wire themselves to it.
const shaderCtl = initShader({
  onShaderChange: (shader) => setActiveShader(shader),
});

// Shader HTML export — reads from whatever shader is active.
initShaderExport({
  getActiveShader: () => activeShader,
  getUniforms:     () => activeUniforms,
  getSnapshot:     () => shaderCtl.snapshot(),
});

// =========================================================
// BOOT
// =========================================================
(async () => {
  await rebuild();
  resize();
  loop();
})();
