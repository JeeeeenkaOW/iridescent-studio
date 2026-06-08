// =========================================================
// EXPORT CONTROL — PNG snapshot, WebM loop, PNG sequence
// =========================================================
// Three export paths, all driven by the same loop duration / framerate /
// resolution / transparency controls:
//
//   PNG snapshot — one frame at current time, downloaded as wmf_<ts>.png.
//     Uses resolution scale; ignores fps and loop duration.
//
//   WebM loop — frame-locked capture. Renders exactly one period
//     frame-by-frame (the same deterministic stepping the PNG sequence
//     uses), pushing each rendered frame into a manual-frame
//     captureStream(0) via track.requestFrame(), recorded by
//     MediaRecorder. Because frames are stepped at t = i/N · loopDur
//     (not sampled off wall-clock), the last frame is exactly one
//     Δ-step before t=0 and the loop closes seamlessly — no jump cut.
//     Frames are paced to real time so playback cadence matches fps.
//     VP9 carries alpha in Chrome/Edge, but it's lossy (chroma
//     subsampling can fringe fine edges); PNG sequence stays the crisp
//     transparent deliverable. Chrome/Edge only.
//
//   PNG sequence — frame-by-frame manual stepping. The render loop is
//     paused via state.sequencing; we set uniforms (time, cursor, vel)
//     for each frame analytically, render, capture toBlob, and append to
//     a JSZip archive. The result is a deterministic, exact-loop set of
//     PNGs perfect for AE / Nuke / Resolve image-sequence import. JSZip
//     is loaded from CDN (jsdelivr +esm) on first use.
//
import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';
import { loopCursor, loopCursorVel } from '../util/loop-path.js';

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
  if (resSeg) {
    const resBtns = resSeg.querySelectorAll('.seg-btn');
    function syncResUI() {
      resBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.res, 10) === state.resScale));
    }
    syncResUI();
    updateResDims();
    resBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.resScale = parseInt(btn.dataset.res, 10);
        syncResUI();
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

  async function exportWebM() {
    if (!('MediaRecorder' in window)) {
      alert('MediaRecorder is not supported in this browser. Use Chrome.');
      return;
    }

    if (state.bg && state.bg.transparent && !webmTransparencyWarned) {
      webmTransparencyWarned = true;
      const proceed = confirm(
        'Transparent WebM:\n\n' +
        'Alpha IS recorded (Chrome/Edge, VP9), so the video keeps its\n' +
        'cutout. But WebM is lossy — fine ornament edges can show slight\n' +
        'colour fringing from chroma subsampling, even at high bitrate.\n\n' +
        'For crisp, lossless transparent frames (e.g. for After Effects),\n' +
        'use PNG sequence instead.\n\n' +
        'Continue with WebM?'
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

    const loopDur     = state.loopDuration || 4.0;
    const fps         = Math.max(1, state.fps || 30);
    const totalFrames = Math.max(1, Math.round(loopDur * fps));
    const frameMs     = 1000 / fps;

    btnWebm.disabled = true;
    recordingEl.classList.add('on');

    // Take over rendering exactly like the PNG-sequence path: the rAF
    // render loop short-circuits on state.sequencing, so it won't fight
    // the uniforms we set per frame. Driving the frames ourselves (rather
    // than letting captureStream sample whatever the rAF loop happens to
    // have rendered) is the whole point — it makes the WebM frame-
    // identical to the PNG sequence and closes the loop seam.
    state.sequencing = true;
    const wasLoopMode = sharedUniforms.u_loopMode.value;
    const wasLoopDur  = sharedUniforms.u_loopDuration.value;
    sharedUniforms.u_loopMode.value     = 1.0;
    sharedUniforms.u_loopDuration.value = loopDur;

    try {
      // captureStream locks to the canvas size at call time, so the whole
      // record/step/stop sequence runs inside withResolution to hold the
      // export resolution until the encoder is fully flushed.
      await withResolution(state.resScale, async () => {
        const w = renderer.domElement.width;
        const h = renderer.domElement.height;

        // Bitrate scaled to pixel count × fps. The old fixed 12 Mbps
        // starved large/high-res exports — that's what produced the
        // mosquito noise and block artifacts on the ornament edges.
        // ~0.2 bits/pixel is generous for VP9 line-art-over-alpha; clamp
        // to a sane range so 1× exports aren't wastefully huge and 4×
        // exports don't ask for an absurd ceiling. (This reduces the
        // compression artifacts; it can't undo VP9's 4:2:0 chroma
        // subsampling — that softness is the format's floor.)
        const bitrate = Math.min(
          120_000_000,
          Math.max(16_000_000, Math.round(w * h * fps * 0.2))
        );

        // 0 fps = manual-frame stream: a frame only enters the stream
        // when we call track.requestFrame(). This decouples capture from
        // wall-clock / rAF cadence so we can push exactly one
        // deterministic frame per animation step.
        const stream = renderer.domElement.captureStream(0);
        const track  = stream.getVideoTracks()[0];
        const chunks = [];
        const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

        const finished = new Promise((resolve) => {
          rec.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            downloadBlob(blob, `wmf_${Date.now()}.webm`);
            resolve();
          };
        });

        rec.start();
        const captureStartReal = performance.now();

        for (let i = 0; i < totalFrames; i++) {
          // Frame i covers t = i/N · loopDur; frame N would equal frame 0
          // again, so we stop at N-1. Same analytical stepping as the PNG
          // sequence (shared loopCursor / loopCursorVel), so the two
          // exports are frame-for-frame identical.
          const t = (i / totalFrames) * loopDur;
          const c = loopCursor(t, loopDur);
          const v = loopCursorVel(t, loopDur);

          sharedUniforms.u_time.value = t;
          sharedUniforms.u_mouse.value.set(c.x, 1 - c.y);
          sharedUniforms.u_mouseVel.value.set(v.vx, v.vy);

          renderer.render(scene, camera);
          track.requestFrame();

          // Pace to wall-clock so MediaRecorder timestamps the frames
          // evenly at the target fps (a manual stream times frames by
          // real arrival). The visual content is deterministic either
          // way; this just gives the file a correct duration/cadence.
          const targetReal = captureStartReal + (i + 1) * frameMs;
          const waitMs = targetReal - performance.now();
          if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
        }

        // Let the final requested frame register before stopping, then
        // wait for the encoder to flush (onstop) before leaving
        // withResolution so the resolution stays locked through encode.
        await new Promise(r => setTimeout(r, frameMs));
        rec.stop();
        await finished;
      });
    } catch (err) {
      console.error('WebM export failed:', err);
      alert('WebM export failed: ' + (err.message || err));
    } finally {
      sharedUniforms.u_loopMode.value     = wasLoopMode;
      sharedUniforms.u_loopDuration.value = wasLoopDur;
      state.sequencing = false;
      recordingEl.classList.remove('on');
      btnWebm.disabled = false;
    }
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
  // CURSOR + VEL MATH — shared with main.js's render loop and the WebM
  // exporter via js/util/loop-path.js (loopCursor / loopCursorVel). All
  // three loop-capture consumers step the cursor analytically from the
  // same source so every loop export closes exactly.

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
