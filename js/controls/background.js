// =========================================================
// BACKGROUND CONTROL — Solid / Gradient / Image
// =========================================================
// Three modes share one offscreen 2D canvas. Whenever mode/params change
// (or the viewport resizes), we redraw the canvas and tag the texture
// as needing a GPU upload. The shader samples u_bgTex with v_uv (full
// viewport UVs, no aspect fit) so what's on the canvas IS what's behind
// the ornament.
//
// Solid:    fillRect with state.bg.solid
// Gradient: createLinearGradient at state.bg.gradient.angle, from→to
// Image:    drawImage with cover-fit (centered, never distorted)
//
import * as THREE from 'three';

const BG_RES = 1024;  // logical resolution of the bg canvas — plenty for a
                      // background that gets sampled at viewport resolution.

export function initBackground({ state, uniforms, viewport, history }) {
  // ---------- offscreen canvas + texture ----------
  const canvas = document.createElement('canvas');
  canvas.width = BG_RES;
  canvas.height = BG_RES;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  uniforms.u_bgTex.value = texture;

  // Cached HTMLImageElement for the loaded background image, if any.
  let bgImage = null;

  // Background video. Drawn frame-by-frame into the bg canvas while
  // mode === 'video' via an internal rAF pump (the main render loop
  // doesn't redraw the bg every frame, so we drive it here). The video
  // loops independently of the export loop — for a seamless WebM the
  // source clip should itself be a clean loop.
  const bgVideo = document.createElement('video');
  bgVideo.muted = true;
  bgVideo.loop = true;
  bgVideo.playsInline = true;
  bgVideo.crossOrigin = 'anonymous';
  let videoReady = false;
  let videoPumpOn = false;
  function pumpVideo() {
    if (state.bg.mode !== 'video') { videoPumpOn = false; return; }
    if (videoReady && bgVideo.readyState >= 2) redraw();
    requestAnimationFrame(pumpVideo);
  }
  function startVideoPump() {
    if (videoPumpOn) return;
    videoPumpOn = true;
    requestAnimationFrame(pumpVideo);
  }

  // ---------- redraw ----------
  // Repaint the canvas based on state.bg. Called whenever any bg control
  // changes. Resizes the canvas to match the viewport aspect so the
  // gradient/image don't squish.
  function redraw() {
    const vw = viewport.clientWidth  || BG_RES;
    const vh = viewport.clientHeight || BG_RES;
    const aspect = vw / vh;
    const w = aspect >= 1 ? BG_RES : Math.round(BG_RES * aspect);
    const h = aspect >= 1 ? Math.round(BG_RES / aspect) : BG_RES;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    if (state.bg.mode === 'solid') {
      ctx.fillStyle = state.bg.solid;
      ctx.fillRect(0, 0, w, h);
    } else if (state.bg.mode === 'gradient') {
      const { from, to, angle } = state.bg.gradient;
      // Angle 0 = top-to-bottom in CSS convention. Convert to canvas
      // gradient endpoints across the rect.
      const rad = (angle - 90) * Math.PI / 180;
      const cx = w / 2, cy = h / 2;
      const len = Math.max(w, h);
      const x0 = cx - Math.cos(rad) * len / 2;
      const y0 = cy - Math.sin(rad) * len / 2;
      const x1 = cx + Math.cos(rad) * len / 2;
      const y1 = cy + Math.sin(rad) * len / 2;
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, from);
      grad.addColorStop(1, to);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (state.bg.mode === 'image') {
      // Fallback to solid black if no image loaded.
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      if (bgImage && bgImage.naturalWidth) {
        const ia = bgImage.naturalWidth / bgImage.naturalHeight;
        const ca = w / h;
        let dw, dh, dx, dy;
        if (ia > ca) {
          // image wider than canvas → fit height, crop sides
          dh = h;
          dw = h * ia;
          dx = (w - dw) / 2;
          dy = 0;
        } else {
          dw = w;
          dh = w / ia;
          dx = 0;
          dy = (h - dh) / 2;
        }
        ctx.drawImage(bgImage, dx, dy, dw, dh);
      }
    } else if (state.bg.mode === 'video') {
      // Cover-fit the current video frame (same math as image).
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      if (videoReady && bgVideo.videoWidth) {
        const ia = bgVideo.videoWidth / bgVideo.videoHeight;
        const ca = w / h;
        let dw, dh, dx, dy;
        if (ia > ca) { dh = h; dw = h * ia; dx = (w - dw) / 2; dy = 0; }
        else         { dw = w; dh = w / ia; dx = 0; dy = (h - dh) / 2; }
        ctx.drawImage(bgVideo, dx, dy, dw, dh);
      }
    }

    texture.needsUpdate = true;
  }

  function applyBg() { redraw(); }

  // ---------- DOM ----------
  // Tabs
  const tabs = document.querySelectorAll('#seg-bg .seg-btn');
  const panels = {
    solid:    document.getElementById('bg-panel-solid'),
    gradient: document.getElementById('bg-panel-gradient'),
    image:    document.getElementById('bg-panel-image'),
    video:    document.getElementById('bg-panel-video'),
  };
  function showPanel(mode) {
    for (const k of Object.keys(panels)) {
      if (panels[k]) panels[k].style.display = (k === mode) ? 'flex' : 'none';
    }
  }
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.bg.mode = btn.dataset.bg;
      showPanel(state.bg.mode);
      if (state.bg.mode === 'video') { bgVideo.play().catch(()=>{}); startVideoPump(); }
      redraw();
      history?.push();
    });
  });
  showPanel(state.bg.mode);

  // Solid color
  const solidColor = document.getElementById('bg-solid-color');
  const solidHex   = document.getElementById('bg-solid-hex');
  solidColor.value = state.bg.solid;
  solidHex.textContent = state.bg.solid.toUpperCase();
  solidColor.addEventListener('input', (e) => {
    state.bg.solid = e.target.value;
    solidHex.textContent = e.target.value.toUpperCase();
    if (state.bg.mode === 'solid') redraw();
  });
  solidColor.addEventListener('change', () => { history?.push(); });

  // Gradient
  const gFrom = document.getElementById('bg-grad-from');
  const gTo   = document.getElementById('bg-grad-to');
  const gFromHex = document.getElementById('bg-grad-from-hex');
  const gToHex   = document.getElementById('bg-grad-to-hex');
  const gAngle   = document.getElementById('bg-grad-angle');
  const gAngleVal = document.getElementById('bg-grad-angle-val');
  gFrom.value = state.bg.gradient.from;
  gTo.value   = state.bg.gradient.to;
  gFromHex.textContent = state.bg.gradient.from.toUpperCase();
  gToHex.textContent   = state.bg.gradient.to.toUpperCase();
  gAngle.value = state.bg.gradient.angle;
  gAngleVal.textContent = state.bg.gradient.angle + '°';
  gFrom.addEventListener('input', (e) => {
    state.bg.gradient.from = e.target.value;
    gFromHex.textContent = e.target.value.toUpperCase();
    if (state.bg.mode === 'gradient') redraw();
  });
  gFrom.addEventListener('change', () => { history?.push(); });
  gTo.addEventListener('input', (e) => {
    state.bg.gradient.to = e.target.value;
    gToHex.textContent = e.target.value.toUpperCase();
    if (state.bg.mode === 'gradient') redraw();
  });
  gTo.addEventListener('change', () => { history?.push(); });
  gAngle.addEventListener('input', (e) => {
    state.bg.gradient.angle = parseInt(e.target.value, 10);
    gAngleVal.textContent = state.bg.gradient.angle + '°';
    if (state.bg.mode === 'gradient') redraw();
  });
  gAngle.addEventListener('change', () => { history?.push(); });

  // Image upload
  const imgDrop = document.getElementById('bg-img-drop');
  const imgInput = document.getElementById('bg-img-input');
  const imgCurrent = document.getElementById('bg-img-current');
  const imgCurrentName = document.getElementById('bg-img-current-name');
  const imgClear = document.getElementById('bg-img-clear');

  function setImgUI(name) {
    if (name) {
      imgCurrent.style.display = 'flex';
      imgCurrentName.textContent = name;
    } else {
      imgCurrent.style.display = 'none';
      imgCurrentName.textContent = '';
    }
  }

  async function handleImageFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const ok = ['image/png','image/jpeg','image/jpg','image/webp','image/gif']
      .includes(file.type) || /\.(png|jpe?g|webp|gif)$/.test(name);
    if (!ok) {
      alert('Background image must be PNG, JPG, WebP, or GIF.');
      return;
    }
    state.bg.imageBlob = file;
    state.bg.imageName = file.name;
    setImgUI(file.name);
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    bgImage = img;
    URL.revokeObjectURL(url);
    if (state.bg.mode === 'image') redraw();
  }

  imgDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
    imgDrop.classList.add('drag-over');
  });
  imgDrop.addEventListener('dragleave', () => imgDrop.classList.remove('drag-over'));
  imgDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    imgDrop.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
  });
  imgInput.addEventListener('change', () => {
    if (imgInput.files[0]) handleImageFile(imgInput.files[0]);
  });
  imgClear.addEventListener('click', () => {
    state.bg.imageBlob = null;
    state.bg.imageName = '';
    bgImage = null;
    imgInput.value = '';
    setImgUI('');
    if (state.bg.mode === 'image') redraw();
  });

  // ---- Video upload ----
  const vidDrop = document.getElementById('bg-vid-drop');
  const vidInput = document.getElementById('bg-vid-input');
  const vidCurrent = document.getElementById('bg-vid-current');
  const vidCurrentName = document.getElementById('bg-vid-current-name');
  const vidClear = document.getElementById('bg-vid-clear');

  function setVidUI(name) {
    if (!vidCurrent) return;
    if (name) { vidCurrent.style.display = 'flex'; vidCurrentName.textContent = name; }
    else      { vidCurrent.style.display = 'none'; vidCurrentName.textContent = ''; }
  }

  async function handleVideoFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const ok = ['video/mp4','video/webm','video/quicktime'].includes(file.type)
      || /\.(mp4|webm|mov)$/.test(name);
    if (!ok) { alert('Background video must be MP4, WebM, or MOV.'); return; }
    state.bg.videoBlob = file;
    state.bg.videoName = file.name;
    setVidUI(file.name);
    videoReady = false;
    const url = URL.createObjectURL(file);
    bgVideo.src = url;
    await new Promise((res) => {
      bgVideo.onloadeddata = res;
      bgVideo.onerror = res;
    });
    videoReady = true;
    bgVideo.play().catch(()=>{});
    if (state.bg.mode === 'video') { startVideoPump(); redraw(); }
  }

  if (vidDrop) {
    vidDrop.addEventListener('dragover', (e) => { e.preventDefault(); vidDrop.classList.add('drag-over'); });
    vidDrop.addEventListener('dragleave', () => vidDrop.classList.remove('drag-over'));
    vidDrop.addEventListener('drop', (e) => {
      e.preventDefault(); vidDrop.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleVideoFile(e.dataTransfer.files[0]);
    });
    vidInput.addEventListener('change', () => { if (vidInput.files[0]) handleVideoFile(vidInput.files[0]); });
    vidClear.addEventListener('click', () => {
      state.bg.videoBlob = null;
      state.bg.videoName = '';
      videoReady = false;
      bgVideo.pause();
      bgVideo.removeAttribute('src');
      bgVideo.load();
      vidInput.value = '';
      setVidUI('');
      if (state.bg.mode === 'video') redraw();
    });
  }

  // Initial paint.
  redraw();

  // History helpers — image upload state is intentionally excluded
  // (per design: history clears on main-ornament upload; bg image
  // upload is treated similarly — it persists across undo/redo but
  // isn't itself an undoable action).
  function snapshot() {
    return {
      mode: state.bg.mode,
      // `transparent` is conceptually a bg property, but its toggle UI
      // and uniform-push live in the Export control (it's a render-mode
      // switch for export, not a bg design decision). We snapshot it
      // here so project save/load round-trips it via the bg payload,
      // then call out to the export control on restore to re-sync UI.
      transparent: state.bg.transparent,
      solid: state.bg.solid,
      gradient: { ...state.bg.gradient },
    };
  }
  function restore(snap) {
    if (!snap) return;
    let needsRedraw = false;

    // Transparent is owned in state.bg but the UI/uniform lives in
    // export. Set state and fire an event the export control listens
    // for; this keeps the two controls decoupled (export doesn't have
    // to be initialized for the bg restore to succeed).
    if (typeof snap.transparent === 'boolean' && snap.transparent !== state.bg.transparent) {
      state.bg.transparent = snap.transparent;
      window.dispatchEvent(new CustomEvent('wmf-transparent-changed'));
    }

    if (snap.mode && snap.mode !== state.bg.mode) {
      state.bg.mode = snap.mode;
      tabs.forEach(b => b.classList.toggle('active', b.dataset.bg === state.bg.mode));
      showPanel(state.bg.mode);
      if (state.bg.mode === 'video') { bgVideo.play().catch(()=>{}); startVideoPump(); }
      needsRedraw = true;
    }
    if (snap.solid && snap.solid !== state.bg.solid) {
      state.bg.solid = snap.solid;
      solidColor.value = snap.solid;
      solidHex.textContent = snap.solid.toUpperCase();
      needsRedraw = true;
    }
    if (snap.gradient) {
      const g = snap.gradient;
      if (g.from && g.from !== state.bg.gradient.from) {
        state.bg.gradient.from = g.from;
        gFrom.value = g.from;
        gFromHex.textContent = g.from.toUpperCase();
        needsRedraw = true;
      }
      if (g.to && g.to !== state.bg.gradient.to) {
        state.bg.gradient.to = g.to;
        gTo.value = g.to;
        gToHex.textContent = g.to.toUpperCase();
        needsRedraw = true;
      }
      if (typeof g.angle === 'number' && g.angle !== state.bg.gradient.angle) {
        state.bg.gradient.angle = g.angle;
        gAngle.value = String(g.angle);
        gAngleVal.textContent = g.angle + '°';
        needsRedraw = true;
      }
    }
    if (needsRedraw) redraw();
  }

  return { applyBg, redraw, snapshot, restore };
}
