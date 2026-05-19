// =========================================================
// SHADER HTML EXPORT — self-contained single-file demo
// =========================================================
// Bakes the currently active shader's GLSL + the current uniform values
// + the three generated textures (albedo, normal, bloom) into one HTML
// file the dev can open or hand off. No build, no imports beyond the
// three.js CDN, no upload UI.
//
// Per-shader serialization lives on each shader manifest as
// `serializeForExport(snapshot)`. It returns `{ constants, uniforms }`:
//
//   constants — JS source lines defining the baked uniform values
//               (e.g. `const BASE_COLOR_HEX = "#C7BDB3";`).
//   uniforms  — object-literal entries for those values, dropped into
//               the uniforms object passed to ShaderMaterial.
//
// The exporter assembles the surrounding scaffolding (renderer, scene,
// textures, pointer loop, bg) and stitches the shader-specific pieces
// in. Adding a new shader to the registry adds it to export for free,
// as long as the manifest provides `serializeForExport`.
//
import { listShaders } from '../shaders/index.js';
import { listEffects } from '../effects/index.js';

function canvasToDataURL(tex) {
  if (!tex || !tex.image) return null;
  const c = tex.image;
  if (c instanceof HTMLCanvasElement) return c.toDataURL('image/png');
  const tmp = document.createElement('canvas');
  tmp.width = c.width;
  tmp.height = c.height;
  tmp.getContext('2d').drawImage(c, 0, 0);
  return tmp.toDataURL('image/png');
}

function buildExportedHTML({ shader, uniforms, snapshot, effectsSnapshot, imgAspect }) {
  const albedoURL = canvasToDataURL(uniforms.u_albedo.value);
  const normalURL = canvasToDataURL(uniforms.u_normal.value);
  const bloomURL  = canvasToDataURL(uniforms.u_bloom.value);

  if (typeof shader.serializeForExport !== 'function') {
    throw new Error(`Shader "${shader.id}" is missing serializeForExport — cannot export.`);
  }
  // Material serializer — covers material uniforms + lighting preset.
  const matSer = shader.serializeForExport(snapshot);

  // Effect serializers — one per registered effect. Each returns
  // { constants, uniformEntries }. The Lighting effect, when enabled,
  // overrides the four lighting uniforms the material already baked
  // by re-declaring them in its uniformEntries; we apply effects'
  // entries AFTER the material's so they take precedence.
  const effectSerialized = listEffects().map(eff => {
    const snap = effectsSnapshot?.[eff.id];
    const enabled = !!snap?.enabled;
    if (typeof eff.serializeForExport !== 'function') return { constants: '', uniformEntries: '' };

    // Special-case Lighting: when enabled, override the material's
    // baked lighting uniforms with the user's slider values.
    if (eff.id === 'lighting' && enabled) {
      const c = `
const LT_DIFFUSE   = ${snap.diffuse};
const LT_SPECULAR  = ${snap.specular};
const LT_SHININESS = ${snap.shininess};
const LT_HEIGHT    = ${snap.height};
const LT_COLOR_HEX = ${JSON.stringify(snap.color)};
`.trim();
      const u = `
    u_diffuse:     { value: LT_DIFFUSE },
    u_specular:    { value: LT_SPECULAR },
    u_shininess:   { value: LT_SHININESS },
    u_lightHeight: { value: LT_HEIGHT },
    u_lightColor:  { value: hexToVec3(LT_COLOR_HEX) },
`.trim();
      return { constants: c, uniformEntries: u };
    }

    return eff.serializeForExport(snap, enabled);
  });

  const allConstants = [matSer.constants, ...effectSerialized.map(e => e.constants)]
    .filter(Boolean).join('\n');
  // Material entries first, then effect entries — effect entries win
  // on duplicate keys (object-literal later-wins behaviour at parse).
  const allUniformEntries = [matSer.uniformEntries, ...effectSerialized.map(e => e.uniformEntries)]
    .filter(Boolean).join('\n');

  const exportedJS = `
const VERTEX_SHADER = ${JSON.stringify(shader.vertexShader)};
const FRAGMENT_SHADER = ${JSON.stringify(shader.fragmentShader)};

const ALBEDO_URL = ${JSON.stringify(albedoURL)};
const NORMAL_URL = ${JSON.stringify(normalURL)};
const BLOOM_URL  = ${JSON.stringify(bloomURL)};
const IMG_ASPECT = ${imgAspect};

// --- material + effect uniform values baked at export time ---
${allConstants}

function hexToVec3(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec((hex||'').trim());
  if(!m) return new THREE.Vector3(1,1,1);
  const n = parseInt(m[1], 16);
  return new THREE.Vector3(((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255);
}

function loadTexture(url){
  return new Promise(res => {
    new THREE.TextureLoader().load(url, t => {
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.generateMipmaps = false;
      res(t);
    });
  });
}

// Solid black 2x2 background texture (studio's bg tool is not included).
function makeBgTexture(){
  const c = document.createElement('canvas');
  c.width = 2; c.height = 2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,2,2);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

(async () => {
  const viewport = document.getElementById('viewport');
  const canvas = document.createElement('canvas');
  viewport.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const [albedo, normal, bloom] = await Promise.all([
    loadTexture(ALBEDO_URL),
    loadTexture(NORMAL_URL),
    loadTexture(BLOOM_URL),
  ]);

  const uniforms = {
    u_resolution:       { value: new THREE.Vector2(1, 1) },
    u_imgAspect:        { value: IMG_ASPECT },
    u_mouse:            { value: new THREE.Vector2(0.5, 0.5) },
    u_mouseVel:         { value: new THREE.Vector2(0, 0) },
    u_time:             { value: 0 },
    u_albedo:           { value: albedo },
    u_normal:           { value: normal },
    u_bloom:            { value: bloom },
    u_bgTex:            { value: makeBgTexture() },
${allUniformEntries}
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  function resize(){
    const w = viewport.clientWidth, h = viewport.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.u_resolution.value.set(w, h);
  }
  window.addEventListener('resize', resize);

  // Pointer + idle auto-drift (same easing as the studio).
  let mouseRaw = { x: 0.5, y: 0.5 };
  let mouseSmooth = { x: 0.5, y: 0.5 };
  let mousePrev = { x: 0.5, y: 0.5 };
  let lastUserMoveAt = -Infinity;
  let autoBlend = 1.0;
  const IDLE_DELAY = 1.6, BLEND_TIME = 1.4;
  function autoPath(t){
    return {
      x: 0.5 + Math.sin(t * 0.27) * 0.28 + Math.sin(t * 0.11) * 0.05,
      y: 0.5 + Math.cos(t * 0.19) * 0.22 + Math.cos(t * 0.07) * 0.06,
    };
  }
  viewport.addEventListener('pointermove', (e) => {
    const r = viewport.getBoundingClientRect();
    mouseRaw.x = (e.clientX - r.left) / r.width;
    mouseRaw.y = (e.clientY - r.top) / r.height;
    lastUserMoveAt = (performance.now() - t0) / 1000;
  });

  const t0 = performance.now();
  function loop(){
    const t = (performance.now() - t0) / 1000;
    const auto = autoPath(t);
    const idleFor = t - lastUserMoveAt;
    const target = idleFor < IDLE_DELAY ? 0 : Math.min(1, (idleFor - IDLE_DELAY) / BLEND_TIME);
    autoBlend += (target - autoBlend) * 0.06;
    const tx = mouseRaw.x * (1 - autoBlend) + auto.x * autoBlend;
    const ty = mouseRaw.y * (1 - autoBlend) + auto.y * autoBlend;
    mouseSmooth.x += (tx - mouseSmooth.x) * 0.075;
    mouseSmooth.y += (ty - mouseSmooth.y) * 0.075;
    const vx = mouseSmooth.x - mousePrev.x, vy = mouseSmooth.y - mousePrev.y;
    mousePrev.x = mouseSmooth.x; mousePrev.y = mouseSmooth.y;
    uniforms.u_time.value = t;
    uniforms.u_mouse.value.set(mouseSmooth.x, 1 - mouseSmooth.y);
    uniforms.u_mouseVel.value.set(vx, -vy);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  resize();
  loop();
})();
`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${shader.name} Shader — Export from Web Material Forge</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #000; color: #fff; font-family: system-ui, sans-serif; }
  #viewport { position: fixed; inset: 0; }
  #viewport canvas { display: block; width: 100%; height: 100%; }
  .label { position: fixed; top: 12px; left: 12px; font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,0.5); background: rgba(0,0,0,0.5); padding: 4px 10px; z-index: 10; }
</style>
<script type="importmap">
{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js" } }
</script>
</head>
<body>
<div class="label">${shader.name} · exported ${new Date().toISOString().slice(0,10)}</div>
<div id="viewport"></div>
<script type="module">
import * as THREE from 'three';
${exportedJS}
</script>
</body>
</html>`;
}

export function initShaderExport({ getActiveShader, getUniforms, getSnapshot, getEffectsSnapshot }) {
  const btn = document.getElementById('btn-shader-html');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const shader = getActiveShader();
    const uniforms = getUniforms();
    const snapshot = getSnapshot();
    const effectsSnapshot = getEffectsSnapshot ? getEffectsSnapshot() : {};
    const imgAspect = uniforms.u_imgAspect?.value ?? 1.0;

    const html = buildExportedHTML({ shader, uniforms, snapshot, effectsSnapshot, imgAspect });

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wmf_${shader.id}_${Date.now()}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
