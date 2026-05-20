// =========================================================
// UPLOAD CONTROL — drop zone + file input + clear button
// =========================================================
// Validates SVG/PNG, calls back to main.js with the file contents.
//
import { DEFAULT_SVG } from '../default-svg.js';

export function initUpload({ state, statusEl, rebuildAndResize, history }) {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const dropCurrent = document.getElementById('drop-current');
  const dropCurrentName = document.getElementById('drop-current-name');

  function setStatus(name) {
    state.svgName = name;
    if (statusEl) statusEl.textContent = name;
    if (name === 'Default ornament') {
      dropCurrent.style.display = 'none';
    } else {
      dropCurrent.style.display = 'flex';
      dropCurrentName.textContent = name;
    }
  }

  async function handleFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isSvg = name.endsWith('.svg') || file.type === 'image/svg+xml';
    const isPng = name.endsWith('.png') || file.type === 'image/png';
    if (!isSvg && !isPng) {
      alert('Please upload an SVG or PNG file.');
      return;
    }
    if (isSvg) {
      const text = await file.text();
      state.svgText = text;
      state.inputKind = 'svg';
      state.inputBlob = null;
    } else {
      state.inputBlob = file;
      state.inputKind = 'png';
    }
    setStatus(file.name);
    await rebuildAndResize();
    // Per design: uploading is a session boundary — history clears.
    // Reupload should NOT be undoable, but the new session's actions
    // remain undoable from this fresh starting point.
    history?.clear();
  }

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
  document.getElementById('drop-current-clear').addEventListener('click', async () => {
    state.svgText = DEFAULT_SVG;
    state.inputKind = 'svg';
    state.inputBlob = null;
    setStatus('Default ornament');
    fileInput.value = '';
    await rebuildAndResize();
    history?.clear();
  });

  return { setStatus };
}
