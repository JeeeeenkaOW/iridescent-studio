// =========================================================
// COLLAPSIBLES — click-to-toggle for sidebar sections
// =========================================================
// Any `<div class="section collapsible">` becomes an accordion. The
// section-title (marked with [data-collapsible]) is the click target;
// toggling adds/removes `.collapsed` on the parent section, which the
// CSS uses to hide `.collapsible-body` and flip the chevron.
//
// Sections render expanded by default. Add `.collapsed` to the section
// in markup to start collapsed (used for Background / Normals / Motion
// — settings the user dials once and forgets).
//
// Event delegation on document so this works regardless of when in
// the boot sequence sections are mounted. Effects host re-mounts
// itself on material switch but its outer collapsible wrapper is
// static in index.html, so no rebinding needed.
//
export function initCollapsibles() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-collapsible]');
    if (!trigger) return;
    const section = trigger.closest('.section.collapsible');
    if (!section) return;
    section.classList.toggle('collapsed');
  });
}
