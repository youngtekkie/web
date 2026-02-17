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
    month1: "./month1.html",
    month2: "./month2.html",
    month3: "./month3.html",
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
    const inJourney = ["month1.html","month2.html","month3.html"].includes(currentFile().toLowerCase());
    const isHome = (currentFile().toLowerCase() === "index.html");

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
            <a class="nav__link ${isActive(routes.tracks) ? "is-active" : ""}" href="${routes.tracks}">Tracks</a>
            ${kidMode ? "" : `<a class="nav__link ${isActive(routes.profiles) ? "is-active" : ""}" href="${routes.profiles}">Profiles</a>`}

            <!-- Keep Journey dropdown closed on page-load (prevents it feeling "stuck" open after navigation) -->
            <details class="navDrop">
              <summary class="nav__link nav__link--btn ${inJourney ? "is-active" : ""}">
                Journey <span class="navDrop__chev" aria-hidden="true">▾</span>
              </summary>
              <div class="navDrop__menu" role="menu" aria-label="Journey months">
                <a class="navDrop__item ${isActive(routes.month1) ? "is-active" : ""}" role="menuitem" href="${routes.month1}">Month 1 <span class="navDrop__hint">Scratch</span></a>
                <a class="navDrop__item ${isActive(routes.month2) ? "is-active" : ""}" role="menuitem" href="${routes.month2}">Month 2 <span class="navDrop__hint">Roblox</span></a>
                <a class="navDrop__item ${isActive(routes.month3) ? "is-active" : ""}" role="menuitem" href="${routes.month3}">Month 3 <span class="navDrop__hint">Python</span></a>
              </div>
            </details>
          </nav>
${isHome ? `
<div class="topbarCoffee">
  <a class="topbarCoffee__link" href="./support.html" aria-label="Buy us a coffee">
    ☕ <span>buy us a coffee</span>
  </a>
</div>` : ``}

          <div class="topbar__actions">
<a class="iconLink" href="${routes.certificates}" title="Certificates" aria-label="Certificates">🎓</a>
            <a class="iconLink" href="${routes.print}" title="Print plan" aria-label="Print">🖨️</a>
            <a class="iconLink" href="${routes.dashboard}" title="Parent dashboard" aria-label="Parent Dashboard">👨‍👩‍👧</a>

            <button class="menuBtn" type="button" data-yt="navbtn" aria-expanded="false" aria-label="Open menu">☰</button>
            <button class="btn btn--soft" id="kidModeToggle" type="button" aria-pressed="false">Kid Mode: Off</button>
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
          <a href="${routes.tracks}">Tracks</a>
          <a href="${routes.profiles}">Profiles</a>
          <a href="${routes.month1}">Month 1 (Scratch)</a>
          <a href="${routes.month2}">Month 2 (Roblox)</a>
          <a href="${routes.month3}">Month 3 (Python)</a>
          <a href="${routes.certificates}">Certificates</a>
          <a href="${routes.print}">Print</a>
          <a href="${routes.dashboard}">Parent Dashboard</a>
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
          <span>© <span data-yt="year"></span> youngtekkie</span>
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
