// =========================================================
// TABS — mobile tab bar wiring
// =========================================================
// On mobile, the sidebar's many sections are partitioned into 5
// tabs: Material / Lighting / Effects / Setup / Export. Tapping a
// tab updates `body[data-active-tab]`; CSS hides every section
// whose `data-tab` attribute doesn't match.
//
// On desktop the tab bar is hidden via media query and the
// `data-active-tab` attribute is ignored — so this module is
// effectively a no-op there. We still wire it in either way so the
// behaviour is identical when the window resizes across the
// breakpoint.
//
// We deliberately don't push tab changes onto history. Switching
// which group of controls you're looking at isn't a change to the
// document; it's a viewport state, like which folder is open in a
// file browser.
//
export function initTabs() {
  const bar = document.getElementById('tab-bar');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab-btn]');
    if (!btn) return;
    const id = btn.dataset.tabBtn;
    bar.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tabBtn === id);
    });
    document.body.dataset.activeTab = id;
    // Reset the page scroll so the user lands at the top of the new
    // tab's content. Without this they'd be stuck deep in the
    // previous tab's scroll position. Skip on desktop — the tab bar
    // is hidden there and scroll resets would be jarring.
    if (window.matchMedia('(max-width: 1000px)').matches) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}
