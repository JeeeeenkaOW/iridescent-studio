// =========================================================
// EXPORT CONTROL — PNG snapshot + WebM loop recording
// =========================================================
// PNG: renders one frame to the renderer's canvas and triggers download.
// WebM: forces auto-drift on, resets time to 0, records loopDuration
// seconds at 60fps (12 Mbps), then restores prior state.
//
// MediaRecorder requires Chrome or Edge — Safari/Firefox throw.
//
export function initExport({ state, renderer, scene, camera, getRecordingCtx }) {
  const recordingEl = document.getElementById('recording');
  const btnPng = document.getElementById('btn-png');
  const btnWebm = document.getElementById('btn-webm');
  const loopInput = document.getElementById('ctl-loop');
  const loopVal = document.getElementById('val-loop');

  loopInput.addEventListener('input', (e) => {
    state.loopDuration = parseFloat(e.target.value);
    loopVal.textContent = state.loopDuration.toFixed(1) + 's';
  });

  btnPng.addEventListener('click', () => {
    renderer.render(scene, camera);
    renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iridescent_${Date.now()}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  });

  async function exportWebM() {
    if (!('MediaRecorder' in window)) {
      alert('MediaRecorder is not supported in this browser. Use Chrome.');
      return;
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

    const stream = renderer.domElement.captureStream(60);
    const chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iridescent_${Date.now()}.webm`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Hand control of time/drift to main.js's loop via the ctx hook.
    const ctx = getRecordingCtx();
    const wasAuto = state.autoDrift;
    state.autoDrift = true;
    ctx.resetIdle();
    ctx.startCapture();

    recordingEl.classList.add('on');
    btnWebm.disabled = true;
    rec.start();

    await new Promise(r => setTimeout(r, state.loopDuration * 1000));

    rec.stop();
    recordingEl.classList.remove('on');
    btnWebm.disabled = false;
    state.autoDrift = wasAuto;
    ctx.endCapture();
  }

  btnWebm.addEventListener('click', exportWebM);
}
