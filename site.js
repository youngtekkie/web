/* FILE: assets/site.js — inject shared nav + mobile drawer + footer (auto-year) */
(function () {
  function el(id) { return document.getElementById(id); }

  function currentFile() {
    const p = (location.pathname || "").split("/").pop();
    return (p && p.length) ? p : "index.html";
  }

  function isActive(hanted) {
    const here = currentFile().toLowerCase();
    const target = (hanted || "").replace("./", "").toLowerCase();
    return here === target;
  }

  const routes = {
    home: "index.html",
    tracks: "tracks.html",
    profiles: "profiles.html",
    month1: "month1.html",
    month2: "month2.html",
    month3: "month3.html",
    certificates: "certificates.html",
    print: "print.html",
    dashboard: "dashboard.html",
  };

  function navHTML() {
    return `
      <div class="nav">
        <div class="nav-inner">
          <a class="nav-logo" href="${routes.home}">youngtekkie</a>

          <div class="nav-links" aria-label="Primary navigation">
            <a href="${routes.home}" ${isActive(routes.home) ? 'aria-current="page"' : ""}>Home</a>
            <a href="${routes.tracks}" ${isActive(routes.tracks) ? 'aria-current="page"' : ""}>Tracks</a>
            <a href="${routes.profiles}" ${isActive(routes.profiles) ? 'aria-current="page"' : ""}>Profiles</a>

            <details class="nav-journey" ${["month1.html","month2.html","month3.html"].includes(currentFile().toLowerCase()) ? "open" : ""}>
              <summary class="nav-journey__summary">Journey</summary>
              <div class="nav-journey__menu">
                <a href="${routes.month1}" ${isActive(routes.month1) ? 'aria-current="page"' : ""}>Month 1</a>
                <a href="${routes.month2}" ${isActive(routes.month2) ? 'aria-current="page"' : ""}>Month 2</a>
                <a href="${routes.month3}" ${isActive(routes.month3) ? 'aria-current="page"' : ""}>Month 3</a>
              </div>
            </details>

            <a href="${routes.certificates}" ${isActive(routes.certificates) ? 'aria-current="page"' : ""} title="Certificates">Certificates</a>
            <a href="${routes.print}" ${isActive(routes.print) ? 'aria-current="page"' : ""} title="Print">Print</a>
            <a href="${routes.dashboard}" ${isActive(routes.dashboard) ? 'aria-current="page"' : ""} title="Dashboard">Dashboard</a>
          </div>

          <button class="nav-toggle" id="navToggle" type="button" aria-label="Open menu">☰</button>
        </div>
      </div>

      <div class="mobile-drawer" id="mobileDrawer" aria-label="Mobile menu">
        <a href="${routes.home}">Home</a>
        <a href="${routes.tracks}">Tracks</a>
        <a href="${routes.profiles}">Profiles</a>
        <a href="${routes.month1}">Month 1</a>
        <a href="${routes.month2}">Month 2</a>
        <a href="${routes.month3}">Month 3</a>
        <a href="${routes.certificates}">Certificates</a>
        <a href="${routes.print}">Print</a>
        <a href="${routes.dashboard}">Dashboard</a>
      </div>
    `;
  }

  function footerHTML() {
    return `
      <footer class="footer">
        © <span data-yt="year"></span> youngtekkie
      </footer>
    `;
  }

  function applyYear() {
    const y = String(new Date().getFullYear());
    document.querySelectorAll('[data-yt="year"]').forEach(n => n.textContent = y);
  }

  function initMobileDrawer() {
    const toggle = el("navToggle");
    const drawer = el("mobileDrawer");
    if (!toggle || !drawer) return;

    toggle.addEventListener("click", () => drawer.classList.toggle("active"));

    // Close drawer on link click
    drawer.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => drawer.classList.remove("active"));
    });
  }

  function injectAll() {
    const chrome = el("site-chrome");
    if (chrome) chrome.innerHTML = navHTML();

    const footer = el("site-footer");
    if (footer) footer.innerHTML = footerHTML();

    applyYear();
    initMobileDrawer();
  }

  // Robust: run now if DOM is ready, else wait.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectAll);
  } else {
    injectAll();
  }
})();
