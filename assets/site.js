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
              <div class="navDrop__menu" role="menu" aria-label="Journey months">
                <a class="navDrop__item ${isActive(routes.month1) ? "is-active" : ""}" role="menuitem" href="${routes.month1}">Month 1 <span class="navDrop__hint">Scratch</span></a>
                <a class="navDrop__item ${isActive(routes.month2) ? "is-active" : ""}" role="menuitem" href="${routes.month2}">Month 2 <span class="navDrop__hint">Roblox</span></a>
                <a class="navDrop__item ${isActive(routes.month3) ? "is-active" : ""}" role="menuitem" href="${routes.month3}">Month 3 <span class="navDrop__hint">Python</span></a>
              </div>
            </details>
          </nav>
<div class="topbar__actions">
${kidMode ? "" : `<a class="iconLink" href="${routes.certificates}" title="Certificates" aria-label="Certificates" data-parent-only="1">🎓</a>`}
            ${kidMode ? "" : `<a class="iconLink" href="${routes.print}" title="Print plan" aria-label="Print" data-parent-only="1">🖨️</a>`}
            ${kidMode ? "" : `<a class="iconLink" href="${routes.dashboard}" title="Parent dashboard" aria-label="Parent Dashboard" data-parent-only="1">👨‍👩‍👧</a>`}

            <button class="menuBtn" type="button" data-yt="navbtn" aria-expanded="false" aria-label="Open menu">☰</button>
            <button class="mode-toggle mode-toggle--sm" id="kidModeToggle" type="button" aria-pressed="false">${kidMode ? "🔒 Parent" : "🧒 Kid"}</button>
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
          <a href="${routes.month1}">Month 1 (Scratch)</a>
          <a href="${routes.month2}">Month 2 (Roblox)</a>
          <a href="${routes.month3}">Month 3 (Python)</a>
          ${kidMode ? "" : `<a href="${routes.certificates}" data-parent-only="1">Certificates</a>`}
          ${kidMode ? "" : `<a href="${routes.print}" data-parent-only="1">Print</a>`}
          ${kidMode ? "" : `<a href="${routes.dashboard}" data-parent-only="1">Parent Dashboard</a>`}
        </div>
      </aside>
    `;

    // Let other scripts (e.g., app.js) know the header/nav/drawer now exist.
    // This matters on pages where site.js isn't loaded with `defer`.
    setTopbarOffset();
    setTopbarOffset();
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
    setTopbarOffset();
    setTopbarOffset();
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


function setTopbarOffset() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  const h = Math.ceil(topbar.getBoundingClientRect().height);
  const safe = Math.max(64, h);
  document.documentElement.style.setProperty("--topbar-h", safe + "px");
}

function bindChromeNav() {
  // Idempotent binding (injectChrome can run multiple times)
  if (window.__yt_chrome_bound) {
    // Still refresh topbar offset when reinjecting
    setTopbarOffset();
    return;
  }
  window.__yt_chrome_bound = true;

  const syncYear = () => {
    document.querySelectorAll('[data-yt="year"]').forEach(el => {
      el.textContent = String(new Date().getFullYear());
    });
  };

  const closeDrawer = () => {
    const drawer = document.querySelector('[data-yt="drawer"]');
    if (drawer) drawer.classList.remove("is-open");
    document.querySelectorAll('[data-yt="navbtn"]').forEach(b => b.setAttribute("aria-expanded", "false"));
  };

  const openDrawer = () => {
    const drawer = document.querySelector('[data-yt="drawer"]');
    if (drawer) drawer.classList.add("is-open");
    // Mark the first button as expanded for accessibility (both buttons share selector)
    document.querySelectorAll('[data-yt="navbtn"]').forEach(b => b.setAttribute("aria-expanded", "true"));
  };

  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest && e.target.closest('[data-yt="navbtn"]');
    const drawer = document.querySelector('[data-yt="drawer"]');

    if (btn) {
      // Toggle
      if (drawer && drawer.classList.contains("is-open")) closeDrawer();
      else openDrawer();
      return;
    }

    // Click outside drawer closes it
    if (drawer && drawer.classList.contains("is-open")) {
      const isInsideDrawer = e.target.closest && e.target.closest('[data-yt="drawer"]');
      if (!isInsideDrawer) closeDrawer();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  // Keep details dropdown tidy: close if clicked outside
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".navDrop[open]").forEach(d => {
      if (!d.contains(e.target)) d.removeAttribute("open");
    });
  });

  // Keep the page offset correct (brand subtitle can wrap on mobile)
  const onResize = () => setTopbarOffset();
  window.addEventListener("resize", onResize, { passive: true });

  syncYear();
  setTopbarOffset();
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
