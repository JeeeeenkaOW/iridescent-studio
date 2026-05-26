// =========================================================
// EXPORT CONTROL — PNG snapshot, WebM loop, PNG sequence
// =========================================================
// Three export paths, all driven by the same loop duration / framerate /
// resolution / transparency controls:
//
//   PNG snapshot — one frame at current time, downloaded as wmf_<ts>.png.
//     Uses resolution scale; ignores fps and loop duration.
//
//   WebM loop — captureStream + MediaRecorder for loopDuration seconds at
//     chosen fps. Uses resolution scale. Hands off cursor and time to
//     main.js's render loop via getRecordingCtx (which sets captureStart;
//     the render loop then enters "loop time domain" and the cursor
//     follows the analytical loop path). MediaRecorder is Chrome/Edge
//     only and historically strips alpha from WebM even with VP9.
//
//   PNG sequence — frame-by-frame manual stepping. The render loop is
//     paused via state.sequencing; we set uniforms (time, cursor, vel)
//     for each frame analytically, render, capture toBlob, and append to
//     a JSZip archive. The result is a deterministic, exact-loop set of
//     PNGs perfect for AE / Nuke / Resolve image-sequence import. JSZip
//     is loaded from CDN (jsdelivr +esm) on first use.
//
import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

export function initExport({ state, renderer, scene, camera, getRecordingCtx, sharedUniforms, history, withResolution }) {
  const recordingEl   = document.getElementById('recording');
  const btnPng        = document.getElementById('btn-png');
  const btnWebm       = document.getElementById('btn-webm');
  const btnPngSeq     = document.getElementById('btn-png-sequence');
  const loopInput     = document.getElementById('ctl-loop');
  const loopVal       = document.getElementById('val-loop');
  const fpsInput      = document.getElementById('ctl-fps');
  const fpsVal        = document.getElementById('val-fps');
  const resSeg        = document.getElementById('seg-res');
  const transparentToggle = document.getElementById('ctl-export-transparent');
  const seqProgress   = document.getElementById('seq-progress');
  const seqFill       = document.getElementById('seq-progress-fill');
  const seqLabel      = document.getElementById('seq-progress-label');

  // ---------- Transparent background (carried from prior version) ----------
  // State of truth is state.bg.transparent (lives in bg state so project
  // save/load round-trips it). This block owns the toggle UI and the
  // u_bgTransparent uniform push. Live preview: setting the uniform
  // immediately changes the canvas alpha so the user sees what they'll
  // export.
  function pushTransparent() {
    if (sharedUniforms && sharedUniforms.u_bgTransparent) {
      sharedUniforms.u_bgTransparent.value = state.bg.transparent ? 1.0 : 0.0;
    }
  }
  function syncToggleUI() {
    if (transparentToggle) {
      transparentToggle.classList.toggle('on', !!state.bg.transparent);
    }
  }
  if (transparentToggle) {
    syncToggleUI();
    pushTransparent();
    transparentToggle.addEventListener('click', () => {
      state.bg.transparent = !state.bg.transparent;
      syncToggleUI();
      pushTransparent();
      history?.push?.();
    });
  }
  window.addEventListener('wmf-transparent-changed', () => {
    syncToggleUI();
    pushTransparent();
  });

  // ---------- Loop duration ----------
  loopInput.addEventListener('input', (e) => {
    state.loopDuration = parseFloat(e.target.value);
    loopVal.textContent = state.loopDuration.toFixed(1) + 's';
  });

  // ---------- Framerate ----------
  // Used by WebM (sets captureStream framerate) and PNG sequence
  // (frame count = round(loopDuration * fps)).
  if (fpsInput) {
    fpsInput.value = String(state.fps);
    if (fpsVal) fpsVal.textContent = state.fps + 'fps';
    fpsInput.addEventListener('input', (e) => {
      state.fps = parseInt(e.target.value, 10);
      if (fpsVal) fpsVal.textContent = state.fps + 'fps';
    });
  }

  // ---------- Resolution multiplier ----------
  // 1×, 2×, or 4× the viewport's natural size. Applied per-export via
  // withResolution(scale, fn). Default 1× = "what you see is what you get."
<<<<<<< HEAD
  //
  // We also surface the actual pixel dimensions in the label, so the
  // user knows what they're getting before they hit export. The number
  // is the canvas drawing-buffer size (which is what toBlob/captureStream
  // produce), so it accounts for devicePixelRatio AND the chosen scale.
  // Updates on: resolution change, viewport resize.
  const resDimsLabel = document.getElementById('val-res-dims');
  function updateResDims() {
    if (!resDimsLabel) return;
    // renderer.domElement.width/height reflect the current drawing buffer.
    // At rest (no export in flight), this is the natural 1× size, so we
    // multiply by state.resScale to project the export size. withResolution
    // restores the renderer in its finally block, so 'at rest' is the
    // normal state when this is called.
    const baseW = renderer.domElement.width;
    const baseH = renderer.domElement.height;
    const w = Math.round(baseW * state.resScale);
    const h = Math.round(baseH * state.resScale);
    resDimsLabel.textContent = `${w} × ${h} px`;
  }
=======
>>>>>>> 97d724636971e0d096fbf81c936c724d0118f57f
  if (resSeg) {
    const resBtns = resSeg.querySelectorAll('.seg-btn');
    function syncResUI() {
      resBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.res, 10) === state.resScale));
    }
    syncResUI();
<<<<<<< HEAD
    updateResDims();
=======
>>>>>>> 97d724636971e0d096fbf81c936c724d0118f57f
    resBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.resScale = parseInt(btn.dataset.res, 10);
        syncResUI();
<<<<<<< HEAD
        updateResDims();
      });
    });
  }
  // Viewport resize fires on window resize. The renderer is re-sized
  // by main.js's resize() handler first, then we read the new base
  // size. Use a deferred read so we run after main's listener.
  window.addEventListener('resize', () => {
    // Defer one frame so main.js's resize() has updated renderer first.
    requestAnimationFrame(updateResDims);
=======
      });
    });
  }

  // =========================================================
  // PNG SNAPSHOT
  // =========================================================
  btnPng.addEventListener('click', async () => {
    await withResolution(state.resScale, async () => {
      renderer.render(scene, camera);
      await new Promise(resolve => {
        renderer.domElement.toBlob((blob) => {
          if (blob) downloadBlob(blob, `wmf_${Date.now()}.png`);
          resolve();
        }, 'image/png');
      });
    });
>>>>>>> 97d724636971e0d096fbf81c936c724d0118f57f
  });
  // First sizing might happen after init (fonts loading etc.) — do a
  // delayed read so the initial "— × — px" placeholder is replaced.
  requestAnimationFrame(updateResDims);

  // =========================================================
  // PNG SNAPSHOT
  // =========================================================
  btnPng.addEventListener('click', async () => {
    await withResolution(state.resScale, async () => {
      renderer.render(scene, camera);
      await new Promise(resolve => {
        renderer.domElement.toBlob((blob) => {
          if (blob) downloadBlob(blob, `wmf_${Date.now()}.png`);
          resolve();
        }, 'image/png');
      });
    });
  });

  // =========================================================
  // WEBM
  // =========================================================
  let webmTransparencyWarned = false;

  // =========================================================
  // WEBM
  // =========================================================
  let webmTransparencyWarned = false;

  async function exportWebM() {
    if (!('MediaRecorder' in window)) {
      alert('MediaRecorder is not supported in this browser. Use Chrome.');
      return;
    }

    if (state.bg && state.bg.transparent && !webmTransparencyWarned) {
      webmTransparencyWarned = true;
      const proceed = confirm(
        'Transparent background is on, but most browsers do not record alpha\n' +
        'into WebM. The exported video will probably appear opaque on a black\n' +
        'background when played back.\n\n' +
        'For true transparent video, use PNG sequence (for AE) instead — it\n' +
        'gives you per-frame PNGs with proper alpha that AE can import as an\n' +
        'image sequence.\n\n' +
        'Continue with WebM export anyway?'
      );
      if (!proceed) return;
    }

    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    let mime = '';
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) { mime = c; break; }
    }
    if (!mime) { alert('No supported WebM codec found.'); return; }

    // WebM must hold its resolution for the full recording duration —
    // captureStream locks to the canvas size at .captureStream() time.
    // So we wrap the whole record/wait/stop sequence inside withResolution.
    await withResolution(state.resScale, async () => {
      const stream = renderer.domElement.captureStream(state.fps);
      const chunks = [];
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      // We need to await rec.onstop before exiting withResolution, so
      // the resolution stays locked until the encoder is fully flushed.
      // Wrap the recording in a promise that resolves on stop.
      const finished = new Promise((resolve) => {
        rec.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          downloadBlob(blob, `wmf_${Date.now()}.webm`);
          resolve();
        };
      });

      const ctx = getRecordingCtx();
      const wasAuto = state.autoDrift;
      state.autoDrift = true;
      ctx.resetIdle();
      ctx.startCapture();

      recordingEl.classList.add('on');
      btnWebm.disabled = true;
      rec.start();
<<<<<<< HEAD
      // Stop slightly before tBase reaches loopDur so we don't capture
      // a frame that has just wrapped back to t≈0 (which would land
      // inside the file mid-stream and replay as a jump cut, not a
      // seamless loop). One frame's worth of safety margin is plenty —
      // the player will loop the file as if those few ms didn't exist,
      // and the shader state at the last captured frame is one Δ-step
      // before t=0, which is exactly what a clean loop needs.
      const safetyMarginMs = 1000 / Math.max(state.fps, 1);
      const recordMs = Math.max(100, state.loopDuration * 1000 - safetyMarginMs);
      await new Promise(r => setTimeout(r, recordMs));
=======
      await new Promise(r => setTimeout(r, state.loopDuration * 1000));
>>>>>>> 97d724636971e0d096fbf81c936c724d0118f57f
      rec.stop();
      recordingEl.classList.remove('on');
      btnWebm.disabled = false;
      state.autoDrift = wasAuto;
      ctx.endCapture();

      await finished;
    });
  }
  btnWebm.addEventListener('click', exportWebM);

  // =========================================================
  // PNG SEQUENCE
  // =========================================================
  // Frame-by-frame manual stepping for AE / Nuke / Resolve handoff.
  //
  // Why not just capture WebM and let the designer extract frames? Two
  // reasons: (1) WebM is lossy + browser-codec-dependent, PNG sequence
  // is lossless and deterministic; (2) WebM strips alpha. PNG sequence
  // preserves it.
  //
  // Why not use the rAF render loop and capture each frame as it
  // happens? Because the render loop runs at the monitor's refresh
  // rate (60/120/144 Hz), not the export framerate, and timing isn't
  // exact. By stepping time ourselves we get mathematically perfect
  // frames at exactly i/N * loopDuration.
  //
  // CURSOR + VEL MATH — must match autoPathLooping in main.js. The
  // duplication is intentional: that function isn't exported, and
  // we want a clear paper-trail of "the export sequence steps cursor
  // analytically to keep loop closure exact." If autoPathLooping
  // changes there, this needs to change too.
  function loopCursor(t, loopDur) {
    const phase = (t / loopDur) * Math.PI * 2;
    return {
      x: 0.5 + Math.sin(phase) * 0.30,
      y: 0.5 + Math.cos(phase) * 0.24,
    };
  }
  function loopCursorVel(t, loopDur) {
    const phase = (t / loopDur) * Math.PI * 2;
    const angularRate = (Math.PI * 2) / loopDur;
    const dxdt =  0.30 * Math.cos(phase) * angularRate;
    const dydt = -0.24 * Math.sin(phase) * angularRate;
    const perFrame = 1 / 60;
    return { vx: dxdt * perFrame, vy: -dydt * perFrame };
  }

  async function exportPngSequence() {
    const loopDur = state.loopDuration || 4.0;
    const fps = Math.max(1, state.fps || 30);
    const totalFrames = Math.max(1, Math.round(loopDur * fps));

    // Rough memory estimate: each frame is approx area × 4 bytes (RGBA),
    // but PNG-encoded blobs are roughly 1/4 to 1/2 that for typical
    // content. Scale grows with resScale^2.
    // Trigger a warning when projected raw blob memory exceeds ~500MB.
    const baseArea = renderer.domElement.width * renderer.domElement.height;
    const frameBytes = baseArea * state.resScale * state.resScale * 1.5; // rough PNG estimate
    const totalBytes = frameBytes * totalFrames;
    if (totalBytes > 500 * 1024 * 1024) {
      const mb = Math.round(totalBytes / (1024 * 1024));
      const proceed = confirm(
        `This export will produce ${totalFrames} frames at ${state.resScale}× resolution.\n` +
        `Estimated memory needed: ~${mb} MB.\n\n` +
        `Large sequences may run out of browser memory and crash the tab.\n` +
        `Consider lowering framerate, loop duration, or resolution scale.\n\n` +
        `Continue anyway?`
      );
      if (!proceed) return;
    }

    btnPngSeq.disabled = true;
    if (seqProgress) seqProgress.style.display = 'flex';
    if (seqFill)  seqFill.style.width = '0%';
    if (seqLabel) seqLabel.textContent = `Preparing… 0 / ${totalFrames}`;

    // The render loop must not race with our frame stepping. state.sequencing
    // makes it skip its render entirely; we own renderer.render for the
    // duration of this export.
    state.sequencing = true;
    const wasLoopMode = sharedUniforms.u_loopMode.value;
    const wasLoopDur  = sharedUniforms.u_loopDuration.value;
    sharedUniforms.u_loopMode.value = 1.0;
    sharedUniforms.u_loopDuration.value = loopDur;

    const zip = new JSZip();
    let success = true;

    try {
      await withResolution(state.resScale, async () => {
        for (let i = 0; i < totalFrames; i++) {
          // Frame i covers t = i/N * loopDur; frame N would equal frame 0
          // again, so we stop at N-1. The exported sequence is exactly
          // one full loop when played back at `fps`.
          const t = (i / totalFrames) * loopDur;
          const c = loopCursor(t, loopDur);
          const v = loopCursorVel(t, loopDur);

          sharedUniforms.u_time.value = t;
          sharedUniforms.u_mouse.value.set(c.x, 1 - c.y);
          sharedUniforms.u_mouseVel.value.set(v.vx, v.vy);

          renderer.render(scene, camera);
          const blob = await canvasToBlob(renderer.domElement, 'image/png');
          if (!blob) throw new Error(`toBlob failed at frame ${i}`);

          const name = `wmf_${String(i).padStart(4, '0')}.png`;
          // JSZip accepts Blob directly in modern versions.
          zip.file(name, blob);

          // Update progress UI between frames. Yielding to the event
          // loop here also keeps the page responsive (without this the
          // browser blocks for the whole export).
          if (seqFill)  seqFill.style.width = ((i + 1) / totalFrames * 100).toFixed(1) + '%';
          if (seqLabel) seqLabel.textContent = `Rendering ${i + 1} / ${totalFrames}`;
        }

        if (seqLabel) seqLabel.textContent = 'Packing zip…';
        // Zip is in-memory; this can take a few seconds for large sequences.
        // Compression level 1 = fast; PNGs barely compress further anyway
        // (they're already compressed internally).
        const zipBlob = await zip.generateAsync(
          { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } },
          (meta) => {
            if (seqLabel) seqLabel.textContent = `Packing zip… ${meta.percent.toFixed(0)}%`;
          }
        );
        downloadBlob(zipBlob, `wmf_sequence_${state.fps}fps_${Date.now()}.zip`);
      });
    } catch (err) {
      console.error('PNG sequence export failed:', err);
      alert('PNG sequence export failed: ' + (err.message || err));
      success = false;
    } finally {
      // Restore — even on error. The render loop will resume its normal
      // duties on the next rAF tick once sequencing flips off.
      sharedUniforms.u_loopMode.value = wasLoopMode;
      sharedUniforms.u_loopDuration.value = wasLoopDur;
      state.sequencing = false;
      btnPngSeq.disabled = false;

      if (success && seqLabel) seqLabel.textContent = `Done — ${totalFrames} frames`;
      setTimeout(() => {
        if (seqProgress) seqProgress.style.display = 'none';
      }, 1500);
    }
  }

  if (btnPngSeq) btnPngSeq.addEventListener('click', exportPngSequence);
}

// =========================================================
// SMALL HELPERS
// =========================================================
function canvasToBlob(canvas, type) {
  return new Promise((resolve) => canvas.toBlob(resolve, type));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the browser actually completes the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
