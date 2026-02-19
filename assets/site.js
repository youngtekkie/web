(function () {
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");

  if (header) {
    header.innerHTML = `
      <div class="nav">
        <a href="index.html" class="logo">YoungTekkie</a>
        <div class="nav-links">
          <a href="month1.html">Month 1</a>
          <a href="month2.html">Month 2</a>
          <a href="month3.html">Month 3</a>
          <a href="dashboard.html" data-parent-only="1">Dashboard</a>
          <a href="profiles.html" data-parent-only="1">Profiles</a>
          <a href="tracks.html" data-parent-only="1">Tracks</a>
          <a href="certificates.html" data-parent-only="1">Certificates</a>
          <a href="print.html" data-parent-only="1">Print</a>
          <button id="kidModeToggle" class="mode-toggle small"></button>
        </div>
      </div>
    `;
  }

  if (footer) {
    footer.innerHTML = `
      <div class="footer-inner">
        <p>© ${new Date().getFullYear()} YoungTekkie</p>
      </div>
    `;
  }
})();