/* FILE: app.js — YoungTekkie (stable core)
   Provides: profiles, phases rendering, printable plan, dashboard, certificates, kid/parent mode, mobile nav.
   Designed for static GitHub Pages (no server).
*/
(() => {
  "use strict";

  // ---------- storage keys ----------
  const PROFILES_KEY = "yta_profiles_v2";
  const ACTIVE_PROFILE_KEY = "yta_active_profile_v2";
  const KIDMODE_KEY = "yta_kidmode_v2";
  const PARENT_PASS_KEY = "yta_parent_pass_v2";
  const UI_KEY = "yta_ui_v2";
  const stateKey = (profileId) => `yta_state_${profileId}_v2`;

  // ---------- utils ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function uid() {
    // reasonably unique for localStorage use
    return "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function safeJSONParse(s, fallback) {
    try { return JSON.parse(s); } catch (e) { return fallback; }
  }

  function loadProfiles() {
    return safeJSONParse(localStorage.getItem(PROFILES_KEY) || "[]", []);
  }
  function saveProfiles(list) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(list || []));
  }
  function getActiveProfileId() {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || "";
  }
  function setActiveProfile(id) {
    if (id) localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  }
  function getProfileById(id) {
    return loadProfiles().find(p => p.id === id) || null;
  }

  function loadState(profileId) {
    return safeJSONParse(localStorage.getItem(stateKey(profileId)) || "null", null) || {
      progress: { phase1: {}, phase2: {}, phase3: {} },
      lastCompletedISO: null,
      streak: 0
    };
  }
  function saveState(profileId, st) {
    localStorage.setItem(stateKey(profileId), JSON.stringify(st));
  }

  function loadUI() {
    return safeJSONParse(localStorage.getItem(UI_KEY) || "{}", {});
  }
  function saveUI(ui) {
    localStorage.setItem(UI_KEY, JSON.stringify(ui || {}));
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  }

  function nextMondayISO() {
    const d = new Date();
    const day = d.getDay(); // 0 Sun .. 6 Sat
    const add = (8 - day) % 7 || 7; // next Monday, not today
    d.setDate(d.getDate() + add);
    const iso = d.toISOString().slice(0, 10);
    return iso;
  }

  // ---------- curriculum (simple, stable) ----------
  const curriculum = {
    phase1: {
      title: "Phase 1: Scratch",
      lessons: [
        { n: 1, title: "Meet Scratch & make your first sprite move", tasks: ["Open Scratch", "Add a sprite", "Move & change costume"] },
        { n: 2, title: "Loops: make a sprite dance", tasks: ["Use repeat forever", "Add sound", "Change size"] },
        { n: 3, title: "Events: start/stop with keys", tasks: ["When green flag clicked", "When key pressed", "Stop all"] },
        { n: 4, title: "Variables: score counter", tasks: ["Create a score variable", "Increase on click", "Reset at start"] },
        { n: 5, title: "If/Else: simple game rules", tasks: ["If touching edge", "If touching sprite", "Else do something"] },
        { n: 6, title: "Broadcast: change scenes", tasks: ["Create messages", "Switch backdrops", "Game over screen"] },
        { n: 7, title: "Create a mini quiz", tasks: ["Ask and wait", "Check answer", "Score points"] },
        { n: 8, title: "Make a maze game", tasks: ["Walls", "Movement", "Win condition"] },
        { n: 9, title: "Polish & improve", tasks: ["Sounds", "Animations", "Instructions"] },
        { n: 10, title: "Showcase day", tasks: ["Share link", "Explain how it works", "Get feedback"] },
      ]
    },
    phase2: {
      title: "Phase 2: Roblox Studio",
      lessons: [
        { n: 1, title: "Roblox Studio tour", tasks: ["Explore Studio", "Play test", "Save project"] },
        { n: 2, title: "Build a simple obby", tasks: ["Parts", "Anchoring", "Spawn point"] },
        { n: 3, title: "Add checkpoints", tasks: ["Checkpoint parts", "Respawn", "Test flow"] },
        { n: 4, title: "Intro to Lua scripts", tasks: ["Script editor", "Print output", "Simple variables"] },
        { n: 5, title: "Make a door open", tasks: ["ClickDetector", "Tween", "Close again"] },
        { n: 6, title: "Coins + leaderboard", tasks: ["Collect coin", "Leaderstats", "Save score"] },
        { n: 7, title: "Enemies & hazards", tasks: ["Touch damage", "Reset", "Balance difficulty"] },
        { n: 8, title: "UI basics", tasks: ["ScreenGui", "TextLabel", "Update score"] },
        { n: 9, title: "Polish & branding", tasks: ["Lighting", "Music", "Thumbnail idea"] },
        { n: 10, title: "Publish & share", tasks: ["Publish settings", "Permissions", "Play test"] },
      ]
    },
    phase3: {
      title: "Phase 3: Web Basics",
      lessons: [
        { n: 1, title: "HTML structure", tasks: ["Head/body", "Headings", "Links"] },
        { n: 2, title: "CSS styling", tasks: ["Colours", "Fonts", "Spacing"] },
        { n: 3, title: "Layouts", tasks: ["Flexbox basics", "Cards", "Responsive checks"] },
        { n: 4, title: "Buttons & states", tasks: ["Hover", "Focus", "Disabled"] },
        { n: 5, title: "JavaScript basics", tasks: ["Variables", "Functions", "Events"] },
        { n: 6, title: "DOM updates", tasks: ["querySelector", "Change text", "Toggle classes"] },
        { n: 7, title: "Mini project: landing page", tasks: ["Hero section", "Features list", "Call to action"] },
        { n: 8, title: "Mini project: quiz", tasks: ["Questions", "Score", "Reset"] },
        { n: 9, title: "Accessibility basics", tasks: ["Labels", "Alt text", "Keyboard"] },
        { n: 10, title: "Publish to GitHub Pages", tasks: ["Commit", "Enable Pages", "Share link"] },
      ]
    }
  };

  function getActiveCurriculum(profile) {
    // placeholder for future year-group differentiation
    return curriculum;
  }

  // ---------- progress helpers ----------
  function computeOverallProgress(profileId) {
    const st = loadState(profileId);
    const total = curriculum.phase1.lessons.length + curriculum.phase2.lessons.length + curriculum.phase3.lessons.length;
    const complete =
      Object.values(st.progress.phase1 || {}).filter(Boolean).length +
      Object.values(st.progress.phase2 || {}).filter(Boolean).length +
      Object.values(st.progress.phase3 || {}).filter(Boolean).length;
    const pct = total ? Math.round((complete / total) * 100) : 0;
    return { total, complete, pct, fullyComplete: complete === total && total > 0 };
  }

  function computeStreak(profileId) {
    const st = loadState(profileId);
    return { streak: st.streak || 0, lastCompletedISO: st.lastCompletedISO || null };
  }

  function bumpStreak(profileId) {
    const st = loadState(profileId);
    const todayISO = new Date().toISOString().slice(0, 10);

    if (st.lastCompletedISO === todayISO) return st;

    if (!st.lastCompletedISO) {
      st.streak = 1;
    } else {
      const prev = new Date(st.lastCompletedISO);
      const today = new Date(todayISO);
      const diffDays = Math.round((today - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) st.streak = (st.streak || 0) + 1;
      else st.streak = 1;
    }
    st.lastCompletedISO = todayISO;
    saveState(profileId, st);
    return st;
  }

  // ---------- kid/parent mode ----------
  function getKidMode() {
    return localStorage.getItem(KIDMODE_KEY) === "1";
  }
  function setKidMode(v) {
    localStorage.setItem(KIDMODE_KEY, v ? "1" : "0");
    document.body.classList.toggle("kidmode", !!v);
    updateModeButton();
    // notify anyone listening
    document.dispatchEvent(new CustomEvent("yta:mode", { detail: { kid: !!v } }));
  }

  function ensureParentPassword() {
    const existing = localStorage.getItem(PARENT_PASS_KEY);
    if (existing) return true;
    const created = window.prompt("Create a Parent password (you’ll use this to switch back to Parent mode):");
    if (!created || created.trim().length < 3) {
      alert("Password not set. Parent unlock will not work until you set one.");
      return false;
    }
    localStorage.setItem(PARENT_PASS_KEY, created.trim());
    return true;
  }

  function verifyParentPassword() {
    const existing = localStorage.getItem(PARENT_PASS_KEY);
    if (!existing) {
      return ensureParentPassword() && false; // password just created; user still needs to unlock
    }
    const typed = window.prompt("Enter Parent password to unlock Parent mode:");
    if (typed == null) return false;
    if (typed.trim() !== existing) {
      alert("Incorrect password.");
      return false;
    }
    return true;
  }

  function updateModeButton() {
    const btn = $("#kidModeToggle");
    if (!btn) return;

    const isKid = getKidMode();
    const isSmall = window.matchMedia && window.matchMedia("(max-width: 420px)").matches;

    if (isKid) {
      btn.textContent = "Kid mode on";
      btn.setAttribute("aria-label", "Kid mode on");
    } else {
      // On very small screens, show "Parent"
      btn.textContent = isSmall ? "Parent" : "Parent mode";
      btn.setAttribute("aria-label", "Parent mode");
    }
  }

  function maybeShowParentLockOverlay() {
    const isKid = getKidMode();
    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    // Allow these pages in Kid mode
    const allow = new Set(["index.html", "", "support.html", "data-policy.html", "debug.html"]);
    if (!isKid || allow.has(path)) {
      const existing = $(".parentLockOverlay");
      if (existing) existing.remove();
      return;
    }

    if ($(".parentLockOverlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "parentLockOverlay";
    overlay.innerHTML = `
      <div class="parentLockCard">
        <div class="parentLockTitle">Parent mode locked</div>
        <p class="muted">This page is locked while Kid mode is on. Tap the toggle in the header to switch back to Parent mode.</p>
        <div class="parentLockActions">
          <button class="btn btn--primary" type="button" id="unlockParentBtn">Unlock Parent mode</button>
          <a class="btn btn--soft" href="./index.html">Go to Home</a>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const unlockBtn = $("#unlockParentBtn");
    unlockBtn && unlockBtn.addEventListener("click", () => {
      // simulate toggle off
      if (verifyParentPassword()) setKidMode(false);
      maybeShowParentLockOverlay();
    });
  }

  function initKidModeUI() {
    updateModeButton();
    window.addEventListener("resize", () => updateModeButton(), { passive: true });

    const btn = $("#kidModeToggle");
    if (!btn) return;

    // avoid double bind
    if (btn.dataset.ytaBound === "1") return;
    btn.dataset.ytaBound = "1";

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isKid = getKidMode();
      if (!isKid) {
        setKidMode(true);
        maybeShowParentLockOverlay();
        return;
      }

      // Turning Kid mode OFF requires password
      if (!localStorage.getItem(PARENT_PASS_KEY)) {
        if (!ensureParentPassword()) return;
      }
      if (verifyParentPassword()) {
        setKidMode(false);
        maybeShowParentLockOverlay();
      }
    }, { passive: false });

    // apply current state on load
    document.body.classList.toggle("kidmode", getKidMode());
    maybeShowParentLockOverlay();
  }

  // ---------- mobile nav ----------
  function initMobileNav() {
    const navBtns = $$('[data-yt="navbtn"]');
    const drawer = $('[data-yt="drawer"]');
    const backdrop = $('[data-yt="backdrop"]');
    if (!navBtns.length || !drawer || !backdrop) return;

    if (drawer.dataset.ytaNavBound === "1") return;
    drawer.dataset.ytaNavBound = "1";

    const ui = loadUI();
    let scrollY = 0;

    function setExpanded(v) { navBtns.forEach(btn => btn.setAttribute("aria-expanded", v ? "true" : "false")); }

    function open() {
      scrollY = window.scrollY || 0;
      drawer.classList.add("is-open");
      backdrop.classList.add("is-open");
      setExpanded(true);
      ui.drawerOpen = true; saveUI(ui);
    }
    function close() {
      drawer.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      setExpanded(false);
      ui.drawerOpen = false; saveUI(ui);
      // restore scroll
      window.scrollTo(0, scrollY);
    }
    function toggle() { drawer.classList.contains("is-open") ? close() : open(); }

    navBtns.forEach(btn => btn.addEventListener("click", (e) => { e.preventDefault(); toggle(); }));
    backdrop.addEventListener("click", close);
    drawer.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) close();
    });

    // restore open state
    if (ui.drawerOpen) open(); else close();
  }

  // ---------- profiles ----------
  function createProfile(data) {
    const name = (data.name || "").trim();
    const year = String(data.year || "").trim();
    if (!name) throw new Error("Name required");
    if (!year) throw new Error("Year required");

    const track = (Number(year) <= 4) ? "foundation" : "builder";
    const prof = {
      id: uid(),
      name,
      year: Number(year),
      track,
      startDate: data.startDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const list = loadProfiles();
    list.unshift(prof);
    saveProfiles(list);
    // ensure state exists
    saveState(prof.id, loadState(prof.id));
    return prof;
  }

  function updateProfile(id, patch) {
    const list = loadProfiles();
    const idx = list.findIndex(p => p.id === id);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    saveProfiles(list);
    return list[idx];
  }

  function deleteProfile(id) {
    const list = loadProfiles().filter(p => p.id !== id);
    saveProfiles(list);
    try { localStorage.removeItem(stateKey(id)); } catch (e) {}
    if (getActiveProfileId() === id) localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }

  // ---------- rendering ----------
  function cardHTML(lesson, done) {
    const tasks = (lesson.tasks || []).map(t => `<li>${t}</li>`).join("");
    return `
      <article class="dayCard ${done ? "is-done" : ""}" data-lesson="${lesson.n}">
        <div class="dayTop">
          <div>
            <div class="dayNum">Lesson ${lesson.n}</div>
            <h3 class="dayTitle">${lesson.title}</h3>
          </div>
          <label class="toggle">
            <input type="checkbox" ${done ? "checked" : ""} aria-label="Mark lesson ${lesson.n} complete">
            <span>Done</span>
          </label>
        </div>
        <details class="dayDetails">
          <summary>Tasks</summary>
          <ul>${tasks}</ul>
        </details>
      </article>
    `;
  }

  function renderPhase(phaseKey) {
    const listEl = $("#dayList");
    const lineEl = $("#trackLine");
    if (!listEl) return;

    const pid = getActiveProfileId();
    const prof = pid ? getProfileById(pid) : null;

    if (!prof) {
      listEl.innerHTML = `
        <div class="card">
          <h3>Pick a child profile first</h3>
          <p class="muted">Create a profile, then come back here to start the journey.</p>
          <a class="btn btn--primary" href="./profiles.html">Go to Profiles</a>
        </div>
      `;
      if (lineEl) lineEl.textContent = curriculum[phaseKey].title;
      return;
    }

    const st = loadState(prof.id);
    const phase = curriculum[phaseKey];
    if (lineEl) lineEl.textContent = `${phase.title} • ${prof.name} (Year ${prof.year})`;

    listEl.innerHTML = phase.lessons.map(lsn => cardHTML(lsn, !!st.progress[phaseKey][lsn.n])).join("");

    // bind toggles
    $$(".dayCard input[type=checkbox]", listEl).forEach(chk => {
      chk.addEventListener("change", (e) => {
        const card = e.target.closest(".dayCard");
        const n = Number(card?.dataset.lesson || 0);
        if (!n) return;
        st.progress[phaseKey][n] = !!e.target.checked;
        saveState(prof.id, st);
        card.classList.toggle("is-done", !!e.target.checked);
        if (e.target.checked) bumpStreak(prof.id);
      });
    });

    const jumpBtn = $("#jumpToday");
    if (jumpBtn && !jumpBtn.dataset.ytaBound) {
      jumpBtn.dataset.ytaBound = "1";
      jumpBtn.addEventListener("click", () => {
        const next = $$(".dayCard", listEl).find(c => !c.classList.contains("is-done"));
        (next || $$(".dayCard", listEl)[0])?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    const exp = $("#expandAll");
    const col = $("#collapseAll");
    exp && !exp.dataset.ytaBound && (exp.dataset.ytaBound = "1", exp.addEventListener("click", () => {
      $$("details.dayDetails", listEl).forEach(d => d.open = true);
    }));
    col && !col.dataset.ytaBound && (col.dataset.ytaBound = "1", col.addEventListener("click", () => {
      $$("details.dayDetails", listEl).forEach(d => d.open = false);
    }));
  }

  function renderPrint() {
    const meta = $("#printMeta");
    const list = $("#printList");
    if (!meta || !list) return;

    const pid = getActiveProfileId();
    const prof = pid ? getProfileById(pid) : null;

    if (!prof) {
      meta.innerHTML = `<p class="muted">No active profile. Create/select a profile first.</p>`;
      list.innerHTML = `<a class="btn btn--primary" href="./profiles.html">Go to Profiles</a>`;
      return;
    }

    const st = loadState(prof.id);
    const prog = computeOverallProgress(prof.id);

    meta.innerHTML = `
      <div class="card">
        <h3>${prof.name} (Year ${prof.year})</h3>
        <p class="muted">Start date: ${prof.startDate ? fmtDate(prof.startDate) : "Not set"}</p>
        <p><strong>${prog.complete}</strong> / ${prog.total} lessons complete (${prog.pct}%)</p>
      </div>
    `;

    function block(phaseKey) {
      const phase = curriculum[phaseKey];
      const items = phase.lessons.map(lsn => {
        const done = !!st.progress[phaseKey][lsn.n];
        return `<li>${done ? "✅" : "⬜"} Lesson ${lsn.n}: ${lsn.title}</li>`;
      }).join("");
      return `<section class="card"><h3>${phase.title}</h3><ul class="printList">${items}</ul></section>`;
    }

    list.innerHTML = block("phase1") + block("phase2") + block("phase3");
  }

  function renderDashboard() {
    const who = $("#who");
    const dOverall = $("#dOverall");
    const dNext = $("#dNext");
    const byWeek = $("#byWeek");
    if (!who || !dOverall || !dNext || !byWeek) return;

    const pid = getActiveProfileId();
    const prof = pid ? getProfileById(pid) : null;

    if (!prof) {
      who.textContent = "No active child selected";
      dOverall.innerHTML = `<span class="muted">Create/select a profile first.</span>`;
      dNext.innerHTML = "";
      byWeek.innerHTML = `<a class="btn btn--primary" href="./profiles.html">Go to Profiles</a>`;
      return;
    }

    const prog = computeOverallProgress(prof.id);
    const st = loadState(prof.id);
    const streak = computeStreak(prof.id);

    who.textContent = `${prof.name} (Year ${prof.year})`;
    dOverall.innerHTML = `<strong>${prog.pct}%</strong> complete • ${prog.complete}/${prog.total} lessons`;
    dNext.innerHTML = `<span class="muted">Streak:</span> <strong>${streak.streak || 0}</strong> day(s)`;

    // simple weekly breakdown: count done per phase (placeholder)
    const counts = (phaseKey) => Object.values(st.progress[phaseKey] || {}).filter(Boolean).length;
    byWeek.innerHTML = `
      <div class="card">
        <div>Phase 1 done: <strong>${counts("phase1")}</strong></div>
        <div>Phase 2 done: <strong>${counts("phase2")}</strong></div>
        <div>Phase 3 done: <strong>${counts("phase3")}</strong></div>
      </div>
    `;
  }

  function renderCertificates() {
    const mount = $("#certMount");
    if (!mount) return;

    const pid = getActiveProfileId();
    const prof = pid ? getProfileById(pid) : null;

    if (!prof) {
      mount.innerHTML = `<div class="card"><h3>No active profile</h3><p class="muted">Create/select a profile to view certificates.</p><a class="btn btn--primary" href="./profiles.html">Go to Profiles</a></div>`;
      return;
    }

    const prog = computeOverallProgress(prof.id);
    mount.innerHTML = `
      <div class="card">
        <h3>Certificates</h3>
        <p class="muted">Automatic certificates can be added later. For now this page shows progress.</p>
        <p><strong>${prof.name}</strong> • ${prog.complete}/${prog.total} lessons complete (${prog.pct}%)</p>
      </div>
    `;
  }

  function initProfilesPage() {
    // profiles.html already has inline UI; we only need to ensure toggle label and overlay
    // (Keeping core methods available is what matters.)
  }

  function init() {
    // Apply kidmode class early
    document.body.classList.toggle("kidmode", getKidMode());

    // page detection
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    if (file === "phase1.html") renderPhase("phase1");
    if (file === "phase2.html") renderPhase("phase2");
    if (file === "phase3.html") renderPhase("phase3");
    if (file === "print.html") renderPrint();
    if (file === "dashboard.html") renderDashboard();
    if (file === "certificates.html") renderCertificates();
    if (file === "profiles.html") initProfilesPage();

    // lock overlay if needed
    maybeShowParentLockOverlay();
  }

  // ---------- public API (used by profiles.html + debug tooling) ----------
  const YTA = {
    // init + UI
    init,
    initKidModeUI,
    initMobileNav,

    // profiles
    getProfiles: loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    getActiveProfile: () => getProfileById(getActiveProfileId()),
    getActiveProfileId,
    getProfileById,

    // curriculum/progress
    getActiveCurriculum,
    computeOverallProgress: (profileId) => computeOverallProgress(profileId),
    computeStreak: (profileId) => computeStreak(profileId),

    // helpers
    fmtDate,
    nextMondayISO,
    getKidMode
  };

  // bootstrap
  document.addEventListener("DOMContentLoaded", () => {
    try {
      window.YTA = YTA;
      init();
      initKidModeUI();
      initMobileNav();
      // one delayed re-bind for mobile nav only
      setTimeout(() => { try { initMobileNav(); } catch(e){} }, 200);
    } catch (e) {
      console.error("YTA bootstrap failed", e);
    }
  });

})();