// =========================================================
// MAIN — boot, three.js setup, state, render loop
// =========================================================
import * as THREE from 'three';
import { vertexShader } from './shader/vertex.glsl.js';
import { fragmentShader } from './shader/fragment.glsl.js';
import { rasterize, normalize, getLuminance } from './pipeline/rasterize.js';
import { sobelNormalMap } from './pipeline/normals-sobel.js';
import { sculptedNormalMap } from './pipeline/normals-sdf.js';
import { bloomMap } from './pipeline/bloom.js';
import { DEFAULT_SVG } from './default-svg.js';
import { MATERIALS, DEFAULT_MATERIAL } from './presets/index.js';
import { initUpload } from './controls/upload.js';
import { initMaterial } from './controls/material.js';
import { initBackground } from './controls/background.js';
import { initNormals } from './controls/normals.js';
import { initMotion } from './controls/motion.js';
import { initExport } from './controls/export.js';

// =========================================================
// STATE
// =========================================================
const state = {
  svgText: DEFAULT_SVG,
  svgName: 'Default ornament',
  inputKind: 'svg',
  inputBlob: null,
  material: DEFAULT_MATERIAL,
  bgMode: 'dark',
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
// UNIFORMS / MATERIAL
// =========================================================
const uniforms = {
  u_resolution:  { value: new THREE.Vector2(1, 1) },
  u_imgAspect:   { value: 1.0 },
  u_mouse:       { value: new THREE.Vector2(0.5, 0.5) },
  u_mouseVel:    { value: new THREE.Vector2(0, 0) },
  u_time:        { value: 0 },
  u_albedo:      { value: null },
  u_normal:      { value: null },
  u_bloom:       { value: null },
  u_bgColor:     { value: new THREE.Vector3(0, 0, 0) },
  u_lightMode:   { value: 0.0 },
  u_paletteD:    { value: new THREE.Vector3(...MATERIALS[DEFAULT_MATERIAL].palette.phase) },
};

const shaderMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  depthTest: false,
  depthWrite: false,
});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shaderMaterial));

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

  let normalData;
  if (state.normals === 'sculpted') {
    normalData = sculptedNormalMap(lum, w, h, Math.max(state.strength, 1) * 1.5);
  } else {
    normalData = sobelNormalMap(lum, w, h, state.strength);
  }
  const bloomData = bloomMap(lum, w, h);

  disposeTexes();

  albedoTex = makeCanvasTexture(normalized);
  normalTex = makeCanvasTexture(dataToCanvas(normalData, w, h));
  bloomTex  = makeCanvasTexture(dataToCanvas(bloomData,  w, h));

  uniforms.u_albedo.value = albedoTex;
  uniforms.u_normal.value = normalTex;
  uniforms.u_bloom.value  = bloomTex;
  uniforms.u_imgAspect.value = w / h;
}

// =========================================================
// RESIZE
// =========================================================
function resize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  renderer.setSize(w, h, false);
  uniforms.u_resolution.value.set(w, h);
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

  uniforms.u_time.value = t;
  uniforms.u_mouse.value.set(mouseSmooth.x, 1 - mouseSmooth.y);
  uniforms.u_mouseVel.value.set(vx, -vy);

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// =========================================================
// WIRE CONTROLS
// =========================================================
const statusEl = document.getElementById('viewport-status');

initUpload({ state, statusEl, rebuildAndResize });
const matCtl = initMaterial({ state, uniforms });
const bgCtl = initBackground({ state, uniforms, renderer });
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

// =========================================================
// BOOT
// =========================================================
(async () => {
  bgCtl.applyBg();
  matCtl.applyMaterial(MATERIALS[state.material]);
  await rebuild();
  resize();
  loop();
})();
