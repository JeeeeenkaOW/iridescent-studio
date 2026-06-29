// =========================================================
// INSPECTOR TABS — Material / Lighting / Effects
// =========================================================
// The right-hand inspector groups the three creative panels into
// tabs. Clicking a `.tab` (with data-tab) shows the matching
// `.pane` (with data-pane) and hides the rest.
//
// Like the old mobile tab bar, switching tabs is a viewport-state
// change, not a document change — we deliberately don't push it onto
// history.
//
export function initInspectorTabs() {
  const tabs  = [...document.querySelectorAll('.inspect .tab')];
  const panes = [...document.querySelectorAll('.inspect .pane')];
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      panes.forEach(p => p.classList.toggle('active', p.dataset.pane === id));
    });
  });
}
