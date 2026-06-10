// =========================================================
// WEB EXPORT — self-contained <wmf-material> web component
// =========================================================
// Replaces the old full-screen Three.js demo export. Produces ONE
// HTML file that defines a custom element the LP team can drop in:
//
//     <wmf-material-<id>-<hash></wmf-material-<id>-<hash>>
//     <script type="module"> ...this file's <script> block... </script>
//
// Design goals (vs the old export):
//   - ZERO dependencies. A ~6 KB raw-WebGL1 runtime, no Three.js CDN
//     fetch. The look lives in the fragment shader + baked maps, which
//     are byte-identical to the studio, so the render matches exactly.
//   - Embeddable, not full-screen. The element sizes to its container
//     and renders with a transparent background so it composites onto
//     the host page (set the `opaque` attribute to bake the studio bg
//     in instead).
//   - LP-friendly motion. Rests at the pose you exported, reacts to
//     hover, and PAUSES rendering entirely when scrolled off-screen
//     (IntersectionObserver) or when the OS requests reduced motion.
//   - WebP texture maps instead of PNG — same maps, a fraction of the
//     weight.
//
// The per-shader / per-effect `serializeForExport(...)` contract is
// reused verbatim: a tiny THREE-shaped shim (Vector2/3, DataTexture,
// hexToVec3, format/filter constants) lets the baked uniform entries
// drop straight into the raw-GL uploader, so any new material or
// effect that ships a serializer exports for free.
//
import { listEffects } from '../effects/index.js';

// ---- Texture encoding. The albedo is baked LOSSLESS (PNG): the shader
// derives the silhouette alpha from it (mask = max(albedo.rgb)), and
// lossy compression of that maximum-contrast black→ornament edge shows
// up as block/ringing artifacts — a "pixelated trim" around the shape.
// Lossless keeps the cutout clean. Normals are banding-sensitive so they
// get max-quality WebP; bloom and bg are soft and compress hard without
// visible loss. ----
const NORMAL_Q = 1.0;
const BLOOM_Q  = 0.9;
const BG_Q     = 0.85;

function canvasToDataURL(tex, mime, q) {
  if (!tex || !tex.image) return null;
  const c = tex.image;
  let canvas = c;
  if (!(c instanceof HTMLCanvasElement)) {
    canvas = document.createElement('canvas');
    canvas.width = c.width;
    canvas.height = c.height;
    canvas.getContext('2d').drawImage(c, 0, 0);
  }
  // PNG ignores q and is lossless; WebP uses q. Safari < 16 etc. may
  // ignore webp and return png — fine, the runtime decodes whatever data
  // URL it's handed.
  return canvas.toDataURL(mime, q);
}

// THREE-shaped shim injected into the exported file. No backticks and
// no template-literal interpolation inside this string (it lives
// inside a template literal in THIS module). Plain quotes only.
const THREE_SHIM = [
  'const THREE = {',
  '  RGBAFormat: 1, RGBFormat: 2,',
  "  LinearFilter: 'linear', NearestFilter: 'nearest',",
  "  RepeatWrapping: 'repeat', ClampToEdgeWrapping: 'clamp', MirroredRepeatWrapping: 'mirror',",
  '  Vector2: function(x, y){ return { __v:[x||0, y||0], set:function(a,b){ this.__v[0]=a; this.__v[1]=b; return this; } }; },',
  '  Vector3: function(x, y, z){ return { __v:[x||0, y||0, z||0], set:function(a,b,c){ this.__v[0]=a; this.__v[1]=b; this.__v[2]=c; return this; } }; },',
  '  DataTexture: function(data, w, h, fmt){ return { __data:true, data:data, width:w, height:h, format:fmt, minFilter:"linear", magFilter:"linear", wrapS:"clamp", wrapT:"clamp", needsUpdate:true }; }',
  '};',
  'function hexToVec3(hex){ var m=/^#?([0-9a-f]{6})$/i.exec((hex||"").trim()); if(!m) return THREE.Vector3(1,1,1); var n=parseInt(m[1],16); return THREE.Vector3(((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255); }',
  'function imgTex(url){ return { __img:true, url:url }; }',
  // NEAREST-filtered variant — used for sprite sheets so pixel art
  // stays sharp in the embed. The engine's _makeTexture respects the
  // nearest flag when setting filter params.
  'function imgTexN(url){ return { __img:true, url:url, nearest:true }; }',
].join('\n');

// The raw-WebGL runtime + custom element. Static — references the
// baked globals (VERTEX_SHADER, FRAGMENT_SHADER, *_URL, uniforms,
// REST_MOUSE, REST_TIME, TAG_NAME) defined ahead of it in the file.
// IMPORTANT: no backticks, no ${...} anywhere in this string.
const ENGINE_JS = [
  "const VERT_PRELUDE = 'attribute vec3 position;\\nattribute vec2 uv;\\n';",
  "",
  "function compileShader(gl, type, src){",
  "  const sh = gl.createShader(type);",
  "  gl.shaderSource(sh, src);",
  "  gl.compileShader(sh);",
  "  if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){",
  "    console.error('WMF shader compile error:', gl.getShaderInfoLog(sh));",
  "    return null;",
  "  }",
  "  return sh;",
  "}",
  "",
  "function makeProgram(gl, vsSrc, fsSrc){",
  "  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);",
  "  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);",
  "  if(!vs || !fs) return null;",
  "  const p = gl.createProgram();",
  "  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);",
  "  if(!gl.getProgramParameter(p, gl.LINK_STATUS)){",
  "    console.error('WMF link error:', gl.getProgramInfoLog(p));",
  "    return null;",
  "  }",
  "  return p;",
  "}",
  "",
  "function setUniform(gl, loc, val){",
  "  if(loc == null) return;",
  "  if(typeof val === 'number'){ gl.uniform1f(loc, val); return; }",
  "  if(val && val.__v){ const a = val.__v; if(a.length === 2) gl.uniform2f(loc, a[0], a[1]); else if(a.length === 3) gl.uniform3f(loc, a[0], a[1], a[2]); }",
  "}",
  "",
  "function wrapMode(gl, m){ return m === 'repeat' ? gl.REPEAT : (m === 'mirror' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE); }",
  "",
  "class WMFMaterialElement extends HTMLElement {",
  "  connectedCallback(){",
  "    if(this._booted) return; this._booted = true;",
  "    const root = this.attachShadow({ mode: 'open' });",
  "    const style = document.createElement('style');",
  "    style.textContent = ':host{display:block;position:relative;width:100%;height:100%;}canvas{display:block;width:100%;height:100%;}';",
  "    root.appendChild(style);",
  "    const canvas = document.createElement('canvas');",
  "    root.appendChild(canvas);",
  "    this._canvas = canvas;",
  "    const opts = { antialias:true, alpha:true, premultipliedAlpha:false, depth:false };",
  "    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);",
  "    if(!gl){ console.warn('WMF: WebGL unavailable'); return; }",
  "    this._gl = gl;",
  "    const prog = makeProgram(gl, VERT_PRELUDE + VERTEX_SHADER, FRAGMENT_SHADER);",
  "    if(!prog) return;",
  "    this._prog = prog;",
  "    gl.useProgram(prog);",
  "    gl.disable(gl.CULL_FACE); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);",
  "",
  "    const verts = new Float32Array([ -1,1,0, 0,1,  1,1,0, 1,1,  -1,-1,0, 0,0,  1,-1,0, 1,0 ]);",
  "    const buf = gl.createBuffer();",
  "    gl.bindBuffer(gl.ARRAY_BUFFER, buf);",
  "    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);",
  "    const stride = 5 * 4;",
  "    const posLoc = gl.getAttribLocation(prog, 'position');",
  "    const uvLoc = gl.getAttribLocation(prog, 'uv');",
  "    if(posLoc >= 0){ gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0); }",
  "    if(uvLoc >= 0){ gl.enableVertexAttribArray(uvLoc); gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 3 * 4); }",
  "",
  "    this._loc = {};",
  "    this._units = [];",
  "    let unit = 0;",
  "    for(const name in uniforms){",
  "      const loc = gl.getUniformLocation(prog, name);",
  "      this._loc[name] = loc;",
  "      if(loc == null) continue;",
  "      const val = uniforms[name].value;",
  "      if(val && (val.__img || val.__data)){",
  "        const tex = this._makeTexture(val, unit);",
  "        gl.uniform1i(loc, unit);",
  "        this._units.push({ tex: tex, unit: unit, src: val });",
  "        unit++;",
  "      } else if(name !== 'u_time' && name !== 'u_mouse' && name !== 'u_mouseVel'){",
  "        setUniform(gl, loc, val);",
  "      }",
  "    }",
  "",
  "    if(this.hasAttribute('opaque') && this._loc.u_bgTransparent != null){",
  "      gl.uniform1f(this._loc.u_bgTransparent, 0.0);",
  "    }",
  "",
  "    this._dpr = Math.min(window.devicePixelRatio || 1, 2);",
  "    this._reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);",
  "    this._mode = (this.getAttribute('motion') || 'auto').toLowerCase();",
  "    this._mouse = [REST_MOUSE[0], REST_MOUSE[1]];",
  "    this._target = [REST_MOUSE[0], REST_MOUSE[1]];",
  "    this._prev = [REST_MOUSE[0], REST_MOUSE[1]];",
  "    this._hovering = false;",
  "    this._lastInput = -1e9;",
  "    this._visible = true;",
  "    this._running = false;",
  "    this._t0 = (performance.now() / 1000) - REST_TIME;",
  "",
  "    this.addEventListener('pointermove', this._onMove.bind(this));",
  "    this.addEventListener('pointerleave', this._onLeave.bind(this));",
  "",
  "    this._ro = new ResizeObserver(this._resize.bind(this));",
  "    this._ro.observe(this);",
  "    if('IntersectionObserver' in window){",
  "      this._io = new IntersectionObserver(function(es){ this._visible = es[0].isIntersecting; this._tick(); }.bind(this), { threshold: 0.01 });",
  "      this._io.observe(this);",
  "    }",
  "",
  "    this._loadTextures().then(function(){ this._ready = true; this._resize(); this._draw(); this._tick(); }.bind(this));",
  "  }",
  "",
  "  disconnectedCallback(){",
  "    this._stop();",
  "    if(this._ro) this._ro.disconnect();",
  "    if(this._io) this._io.disconnect();",
  "  }",
  "",
  "  _makeTexture(src, unit){",
  "    const gl = this._gl;",
  "    const tex = gl.createTexture();",
  "    gl.activeTexture(gl.TEXTURE0 + unit);",
  "    gl.bindTexture(gl.TEXTURE_2D, tex);",
  "    // Sprite sheets ship with nearest:true (imgTexN) so pixel art",
  "    // stays sharp; everything else is bilinear as before.",
  "    const filt = src.nearest ? gl.NEAREST : gl.LINEAR;",
  "    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);",
  "    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);",
  "    if(src.__data){",
  "      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);",
  "      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode(gl, src.wrapS));",
  "      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode(gl, src.wrapT));",
  "      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, src.width, src.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, src.data);",
  "    } else {",
  "      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);",
  "      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);",
  "      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);",
  "      // 1x1 transparent placeholder until the real image decodes.",
  "      // ONE_PX is a Uint8Array, so this MUST use the 9-arg form (with",
  "      // width/height/border) — the 6-arg form only accepts a",
  "      // TexImageSource (ImageData/img/canvas) and throws 'Overload",
  "      // resolution failed' on a typed array, which blanked the embed.",
  "      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, ONE_PX);",
  "    }",
  "    return tex;",
  "  }",
  "",
  "  _loadTextures(){",
  "    const gl = this._gl; const self = this;",
  "    const jobs = this._units.filter(function(u){ return u.src.__img; }).map(function(u){",
  "      return new Promise(function(res){",
  "        const img = new Image();",
  "        img.onload = function(){",
  "          gl.activeTexture(gl.TEXTURE0 + u.unit);",
  "          gl.bindTexture(gl.TEXTURE_2D, u.tex);",
  "          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);",
  "          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);",
  "          if(self._ready) self._draw();",
  "          res();",
  "        };",
  "        img.onerror = function(){ res(); };",
  "        img.src = u.src.url;",
  "      });",
  "    });",
  "    return Promise.all(jobs);",
  "  }",
  "",
  "  _resize(){",
  "    if(!this._gl) return;",
  "    const w = Math.max(1, Math.round(this.clientWidth * this._dpr));",
  "    const h = Math.max(1, Math.round(this.clientHeight * this._dpr));",
  "    if(this._canvas.width === w && this._canvas.height === h) return;",
  "    this._canvas.width = w; this._canvas.height = h;",
  "    this._gl.viewport(0, 0, w, h);",
  "    if(this._loc.u_resolution != null) this._gl.uniform2f(this._loc.u_resolution, w, h);",
  "    if(this._ready) this._draw();",
  "  }",
  "",
  "  _onMove(e){",
  "    if(this._mode === 'off' || this._reduced) return;",
  "    const r = this.getBoundingClientRect();",
  "    if(r.width <= 0 || r.height <= 0) return;",
  "    const x = (e.clientX - r.left) / r.width;",
  "    const y = (e.clientY - r.top) / r.height;",
  "    this._target = [x, 1 - y];",
  "    this._hovering = true;",
  "    this._lastInput = performance.now() / 1000;",
  "    this._tick();",
  "  }",
  "",
  "  _onLeave(){ this._hovering = false; this._lastInput = performance.now() / 1000; this._tick(); }",
  "",
  "  _shouldRun(){",
  "    if(!this._ready || !this._gl || !this._visible) return false;",
  "    if(this._mode === 'off' || this._reduced) return false;",
  "    if(this._mode === 'auto') return true;",
  "    // 'hover' mode: run while hovering, plus a short settle after leave.",
  "    const idleFor = (performance.now() / 1000) - this._lastInput;",
  "    return this._hovering || idleFor < 1.2;",
  "  }",
  "",
  "  _tick(){",
  "    const run = this._shouldRun();",
  "    if(run && !this._running){ this._running = true; this._raf = requestAnimationFrame(this._frame.bind(this)); }",
  "    else if(!run && this._running){ this._stop(); this._draw(); }",
  "  }",
  "",
  "  _stop(){ this._running = false; if(this._raf) cancelAnimationFrame(this._raf); this._raf = 0; }",
  "",
  "  _frame(){",
  "    if(!this._running) return;",
  "    this._draw();",
  "    if(this._shouldRun()) this._raf = requestAnimationFrame(this._frame.bind(this));",
  "    else this._stop();",
  "  }",
  "",
  "  _draw(){",
  "    const gl = this._gl; if(!gl || !this._prog) return;",
  "    const now = performance.now() / 1000;",
  "    const running = this._running;",
  "    let tx = this._target[0], ty = this._target[1];",
  "    if(running && this._mode === 'auto' && !this._hovering){",
  "      const tt = now - this._t0;",
  "      tx = REST_MOUSE[0] + Math.sin(tt * 0.27) * 0.05 + Math.sin(tt * 0.11) * 0.015;",
  "      ty = REST_MOUSE[1] + Math.cos(tt * 0.19) * 0.04 + Math.cos(tt * 0.07) * 0.02;",
  "    }",
  "    const ease = running ? 0.08 : 1.0;",
  "    this._mouse[0] += (tx - this._mouse[0]) * ease;",
  "    this._mouse[1] += (ty - this._mouse[1]) * ease;",
  "    const vx = this._mouse[0] - this._prev[0];",
  "    const vy = this._mouse[1] - this._prev[1];",
  "    this._prev[0] = this._mouse[0]; this._prev[1] = this._mouse[1];",
  "    const t = running ? (now - this._t0) : REST_TIME;",
  "",
  "    gl.useProgram(this._prog);",
  "    for(let i = 0; i < this._units.length; i++){",
  "      const u = this._units[i];",
  "      gl.activeTexture(gl.TEXTURE0 + u.unit);",
  "      gl.bindTexture(gl.TEXTURE_2D, u.tex);",
  "    }",
  "    if(this._loc.u_time != null) gl.uniform1f(this._loc.u_time, t);",
  "    if(this._loc.u_mouse != null) gl.uniform2f(this._loc.u_mouse, this._mouse[0], this._mouse[1]);",
  "    if(this._loc.u_mouseVel != null) gl.uniform2f(this._loc.u_mouseVel, vx, vy);",
  "    gl.clearColor(0, 0, 0, 0);",
  "    gl.clear(gl.COLOR_BUFFER_BIT);",
  "    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);",
  "  }",
  "}",
  "",
  "const ONE_PX = new Uint8Array([0, 0, 0, 0]);",
  "if(!customElements.get(TAG_NAME)) customElements.define(TAG_NAME, WMFMaterialElement);",
].join('\n');

function buildLightingSer(lightingSnapshot) {
  if (!lightingSnapshot?.enabled) return { constants: '', uniformEntries: '' };
  return {
    constants: [
      `const LT_DIFFUSE   = ${lightingSnapshot.diffuse};`,
      `const LT_SPECULAR  = ${lightingSnapshot.specular};`,
      `const LT_SHININESS = ${lightingSnapshot.shininess};`,
      `const LT_HEIGHT    = ${lightingSnapshot.height};`,
      `const LT_COLOR_HEX = ${JSON.stringify(lightingSnapshot.color)};`,
      `const LT_AMBIENT   = ${lightingSnapshot.ambient ?? 1.0};`,
    ].join('\n'),
    uniformEntries: [
      '    u_diffuse:         { value: LT_DIFFUSE },',
      '    u_specular:        { value: LT_SPECULAR },',
      '    u_shininess:       { value: LT_SHININESS },',
      '    u_lightHeight:     { value: LT_HEIGHT },',
      '    u_lightColor:      { value: hexToVec3(LT_COLOR_HEX) },',
      '    u_ambientStrength: { value: LT_AMBIENT },',
    ].join('\n'),
  };
}

function buildEmbeddedHTML(ctx) {
  const { shader, uniforms, snapshot, effectsSnapshot, lightingSnapshot, imgAspect } = ctx;

  if (typeof shader.serializeForExport !== 'function') {
    throw new Error(`Shader "${shader.id}" is missing serializeForExport — cannot export.`);
  }

  const albedoURL = canvasToDataURL(uniforms.u_albedo.value, 'image/png');
  const normalURL = canvasToDataURL(uniforms.u_normal.value, 'image/webp', NORMAL_Q);
  const bloomURL  = canvasToDataURL(uniforms.u_bloom.value,  'image/webp', BLOOM_Q);
  const bgURL     = canvasToDataURL(uniforms.u_bgTex.value,  'image/webp', BG_Q);

  // Resting pose: whatever the studio is showing at export time. u_mouse
  // is already in shader space (Y pre-flipped), so it carries over 1:1.
  const m = uniforms.u_mouse?.value;
  const restX = m?.x ?? (m?.__v ? m.__v[0] : 0.5);
  const restY = m?.y ?? (m?.__v ? m.__v[1] : 0.45);
  const restTime = uniforms.u_time?.value ?? 0;

  const matSer = shader.serializeForExport(snapshot);
  const lightingSer = buildLightingSer(lightingSnapshot);
  const effectSer = listEffects().map(eff => {
    const snap = effectsSnapshot?.[eff.id];
    const enabled = !!snap?.enabled;
    if (typeof eff.serializeForExport !== 'function') return { constants: '', uniformEntries: '' };
    return eff.serializeForExport(snap, enabled);
  });

  const allConstants = [matSer.constants, lightingSer.constants, ...effectSer.map(e => e.constants)]
    .filter(Boolean).join('\n');
  const allUniformEntries = [matSer.uniformEntries, lightingSer.uniformEntries, ...effectSer.map(e => e.uniformEntries)]
    .filter(Boolean).join('\n');

  // Unique element name per export so multiple different materials can
  // live on one page without customElements.define collisions.
  const tagName = `wmf-material-${shader.id}-${Date.now().toString(36).slice(-5)}`;

  const baseEntries = [
    '    u_resolution:    { value: THREE.Vector2(1, 1) },',
    '    u_imgAspect:     { value: IMG_ASPECT },',
    '    u_mouse:         { value: THREE.Vector2(REST_MOUSE[0], REST_MOUSE[1]) },',
    '    u_mouseVel:      { value: THREE.Vector2(0, 0) },',
    '    u_time:          { value: REST_TIME },',
    '    u_loopMode:      { value: 0.0 },',
    '    u_loopDuration:  { value: 1.0 },',
    '    u_albedo:        { value: imgTex(ALBEDO_URL) },',
    '    u_normal:        { value: imgTex(NORMAL_URL) },',
    '    u_bloom:         { value: imgTex(BLOOM_URL) },',
    '    u_bgTex:         { value: imgTex(BG_URL) },',
    '    u_bgTransparent: { value: 1.0 },',
  ].join('\n');

  const dataJS = [
    THREE_SHIM,
    allConstants,
    `const VERTEX_SHADER = ${JSON.stringify(shader.vertexShader)};`,
    `const FRAGMENT_SHADER = ${JSON.stringify(shader.fragmentShader)};`,
    `const ALBEDO_URL = ${JSON.stringify(albedoURL)};`,
    `const NORMAL_URL = ${JSON.stringify(normalURL)};`,
    `const BLOOM_URL = ${JSON.stringify(bloomURL)};`,
    `const BG_URL = ${JSON.stringify(bgURL)};`,
    `const IMG_ASPECT = ${imgAspect};`,
    `const REST_MOUSE = [${restX}, ${restY}];`,
    `const REST_TIME = ${restTime};`,
    `const TAG_NAME = ${JSON.stringify(tagName)};`,
    `const uniforms = {\n${baseEntries}\n${allUniformEntries}\n};`,
  ].join('\n\n');

  const scriptOpen = '<script type="module">';
  const scriptClose = '<\/script>';
  const dateStr = new Date().toISOString().slice(0, 10);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${shader.name} material — Web Material Forge export</title>
<!--
  HOW TO EMBED ON A LANDING PAGE
  ------------------------------
  1. Copy the <script type="module"> ... </script> block below into your page.
  2. Drop the element wherever you want the material to appear, sized by
     its container (give it a width/height via CSS):

         <${tagName} style="width:480px;height:480px"></${tagName}>

  Attributes:
     motion="auto"   (default) gentle idle + reacts to hover; pauses off-screen
     motion="hover"  static until hovered, then animates
     motion="off"    fully static (also forced when the OS asks for reduced motion)
     opaque          bake the studio background in (default is transparent)

  Zero dependencies, no network calls. Respects prefers-reduced-motion.
-->
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #0b0b0b; font-family: system-ui, sans-serif; }
  .stage { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; }
  ${tagName} { width: min(70vmin, 560px); aspect-ratio: ${imgAspect || 1}; }
  .tag { position: fixed; top: 12px; left: 12px; font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,0.45); }
</style>
</head>
<body>
<div class="tag">${shader.name} · exported ${dateStr} · demo page</div>
<div class="stage">
  <${tagName}></${tagName}>
</div>
${scriptOpen}
${dataJS}

${ENGINE_JS}
${scriptClose}
</body>
</html>`;
}

export function initShaderExport({ getActiveShader, getUniforms, getSnapshot, getEffectsSnapshot, getLightingSnapshot }) {
  const btn = document.getElementById('btn-shader-html');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const shader = getActiveShader();
    const uniforms = getUniforms();
    const snapshot = getSnapshot();
    const effectsSnapshot  = getEffectsSnapshot  ? getEffectsSnapshot()  : {};
    const lightingSnapshot = getLightingSnapshot ? getLightingSnapshot() : null;
    const imgAspect = uniforms.u_imgAspect?.value ?? 1.0;

    const html = buildEmbeddedHTML({ shader, uniforms, snapshot, effectsSnapshot, lightingSnapshot, imgAspect });

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wmf_${shader.id}_component_${Date.now()}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
