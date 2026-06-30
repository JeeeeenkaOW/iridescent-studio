// =========================================================
// MOBILE TABS — viewport-on-top layout switcher
// =========================================================
// On mobile (<=860px) the desktop 3-column layout collapses to a single
// column: compact nav, the viewport pinned at the top, a tab bar, then
// ONE control group filling the scrollable area below. This module wires
// that tab bar. Desktop hides #mobile-tabs via media query and ignores
// body[data-mtab], so this is a no-op there.
//
// The four tabs map onto the existing DOM:
//   Setup    → the left rail (.rail: source, presets, background, normals)
//   Material → the inspector (.inspect) with its Material pane active
//   Lighting → the inspector with its Lighting pane active
//   Effects  → the inspector with its Effects pane active
//
// For Material/Lighting/Effects we drive the inspector's OWN tab strip
// (which inspector-tabs.js manages) by clicking the matching tab, so the
// two systems stay in sync and we don't duplicate pane logic. The
// inspector tab strip itself is hidden on mobile — the mobile bar is the
// single source of truth there.
//
// Switching tabs is viewport state, not a document edit, so it never
// touches history.
//
const PANE = { material: 'material', lighting: 'light', effects: 'fx' };

export function initTabs() {
  const bar = document.getElementById('mobile-tabs');
  if (!bar) return;

  function setTab(id) {
    document.body.dataset.mtab = id;
    bar.querySelectorAll('[data-mtab-btn]').forEach(b =>
      b.classList.toggle('active', b.dataset.mtabBtn === id));

    // Sync the inspector's internal pane for the material/lighting/fx tabs.
    const paneTab = PANE[id];
    if (paneTab) {
      const t = document.querySelector(`.inspect .tab[data-tab="${paneTab}"]`);
      if (t && !t.classList.contains('active')) t.click();
    }

    // Land at the top of the freshly-shown group.
    const panel = id === 'setup'
      ? document.querySelector('.rail')
      : document.querySelector('.inspect .tabscroll');
    if (panel) panel.scrollTop = 0;
  }

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mtab-btn]');
    if (btn) setTab(btn.dataset.mtabBtn);
  });

  // Default to Material (the primary creative controls). Presets live
  // under Setup, one tap away.
  setTab('material');
}
