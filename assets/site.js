/* FILE: assets/site.js — inject shared nav + mobile drawer + footer (auto-year) */
(function () {
  function currentFile() {
    const p = (location.pathname || "").split("/").pop();
    return (p && p.length) ? p : "index.html";
  }

  const routes = {
    home: "./index.html",
    tracks: "./tracks.html",
    profiles: "./profiles.html",
    phase1: "./phase1.html",
    phase2: "./phase2.html",
    phase3: "./phase3.html",
    certificates: "./certificates.html",
    print: "./print.html",
    dashboard: "./dashboard.html",
  };

  function isActive(file) {
    return currentFile().toLowerCase() === file.replace("./","").toLowerCase();
  }

  function injectChrome() {
    const mount = document.getElementById("site-chrome");
    if (!mount) return;

    let subtitle = (document.body.getAttribute("data-subtitle") || "").trim();
    if (!subtitle) subtitle = "Foundations for tomorrow’s tech leaders.";
    const kidMode = (localStorage.getItem("yta_kidmode_v2") === "1");
    const inJourney = ["phase1.html","phase2.html","phase3.html","month1.html","month2.html","month3.html"].includes(currentFile().toLowerCase());
mount.innerHTML = `
      <header class="topbar">
        <div class="wrap topbar__inner">
          <a class="brand" href="${routes.home}" aria-label="Young Tech Architect Home">
            <span class="brand__mark" aria-hidden="true"><img src="./assets/logo-mascot.png" alt=""></span>
            <span class="brand__text">
              <span class="brand__title">Youngtekkie</span>
              <span class="brand__subtitle">${escapeHtml(subtitle)}</span>
            </span>
          </a>

          <nav class="navRow" aria-label="Primary">
            <a class="nav__link ${isActive(routes.home) ? "is-active" : ""}" href="${routes.home}">Home</a>
            ${kidMode ? "" : `<a class="nav__link ${isActive(routes.tracks) ? "is-active" : ""}" href="${routes.tracks}" data-parent-only="1">Tracks</a>`}
            ${kidMode ? "" : `<a class="nav__link ${isActive(routes.profiles) ? "is-active" : ""}" href="${routes.profiles}" data-parent-only="1">Profiles</a>`}

            <!-- Keep Journey dropdown closed on page-load (prevents it feeling "stuck" open after navigation) -->
            <details class="navDrop">
              <summary class="nav__link nav__link--btn ${inJourney ? "is-active" : ""}">
                Journey <span class="navDrop__chev" aria-hidden="true">▾</span>
              </summary>
              <div class="navDrop__menu" role="menu" aria-label="Journey phases">
                <a class="navDrop__item ${isActive(routes.phase1) ? "is-active" : ""}" role="menuitem" href="${routes.phase1}">Phase 1 <span class="navDrop__hint">Scratch</span></a>
                <a class="navDrop__item ${isActive(routes.phase2) ? "is-active" : ""}" role="menuitem" href="${routes.phase2}">Phase 2 <span class="navDrop__hint">Roblox</span></a>
                <a class="navDrop__item ${isActive(routes.phase3) ? "is-active" : ""}" role="menuitem" href="${routes.phase3}">Phase 3 <span class="navDrop__hint">Python</span></a>
              </div>
            </details>
          </nav>
          <div class="topbar__actions">
            <a class="tipJarLink" href="./support.html">Our tip jar</a>
${kidMode ? "" : `<a class="iconLink" href="${routes.certificates}" title="Certificates" aria-label="Certificates" data-parent-only="1">🎓</a>`}
            ${kidMode ? "" : `<a class="iconLink" href="${routes.print}" title="Print plan" aria-label="Print" data-parent-only="1">🖨️</a>`}
            ${kidMode ? "" : `<a class="iconLink" href="${routes.dashboard}" title="Parent dashboard" aria-label="Parent Dashboard" data-parent-only="1">👨‍👩‍👧</a>`}

            <button class="menuBtn" type="button" data-yt="navbtn" aria-expanded="false" aria-label="Open menu">☰</button>
            <button class="mode-toggle mode-toggle--sm" id="kidModeToggle" type="button" aria-pressed="false">${kidMode ? "Kid mode on" : "Parent mode"}</button>
          </div>
        </div>
      </header>

      <div class="backdrop" data-yt="backdrop"></div>
      <aside class="drawer" data-yt="drawer" aria-label="Mobile menu">
        <div class="drawerHeader">
          <div class="drawerTitle">Menu</div>
          <button class="menuBtn" type="button" data-yt="navbtn" aria-expanded="true" aria-label="Close menu">✕</button>
        </div>
        <div class="drawerLinks">
          <a href="${routes.home}">Home</a>
          ${kidMode ? "" : `<a href="${routes.tracks}" data-parent-only="1">Tracks</a>`}
          ${kidMode ? "" : `<a href="${routes.profiles}" data-parent-only="1">Profiles</a>`}
          <a href="${routes.phase1}">Phase 1 (Scratch)</a>
          <a href="${routes.phase2}">Phase 2 (Roblox)</a>
          <a href="${routes.phase3}">Phase 3 (Python)</a>
          ${kidMode ? "" : `<a href="${routes.certificates}" data-parent-only="1">Certificates</a>`}
          ${kidMode ? "" : `<a href="${routes.print}" data-parent-only="1">Print</a>`}
          ${kidMode ? "" : `<a href="${routes.dashboard}" data-parent-only="1">Parent Dashboard</a>`}
          <a href="./support.html">Our tip jar</a>
        </div>
      </aside>
    `;

    // Let other scripts (e.g., app.js) know the header/nav/drawer now exist.
    // This matters on pages where site.js isn't loaded with `defer`.
    bindChromeNav();
    document.dispatchEvent(new CustomEvent("yta:chrome:ready"));
  }

  function injectFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;

    mount.innerHTML = `
      <footer class="siteFooter">
        <div class="wrap siteFooter__inner">
          <div class="siteFooter__left">© <span data-yt="year"></span> Youngtekkie</div>
          <div class="siteFooter__right">
            <a class="siteFooter__link" href="./data-policy.html">Data policy</a>
            <a class="siteFooter__coffee" href="./support.html" aria-label="Support Youngtekkie">☕ Buy me a coffee</a>
          </div>
        </div>
      </footer>
    `;

    // Footer injected; allow footer-year setters etc. to run reliably.
    bindChromeNav();
    document.dispatchEvent(new CustomEvent("yta:chrome:ready"));
  }

  function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("\'", "&#39;");
}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { 
  // Re-inject header when Kid Mode changes (so nav simplifies/returns immediately)
  document.addEventListener("yta:kidmode:change", () => {
    try { injectChrome(); } catch (e) { /* no-op */ }
  });

injectChrome(); injectFooter(); }, { once: true });
  } else {
    
  // Re-inject header when Kid Mode changes (so nav simplifies/returns immediately)
  document.addEventListener("yta:kidmode:change", () => {
    try { injectChrome(); } catch (e) { /* no-op */ }
  });

injectChrome(); injectFooter();
  }
})();
