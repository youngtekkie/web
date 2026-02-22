/* FILE: app.js — Track-based (Year 3–6) + multi-child profiles + start date + mobile nav + certificates */

const YTA = (() => {
  let __inited = false;

  // ---------- storage keys ----------
  const PROFILES_KEY = "yta_profiles_v2";
  const ACTIVE_PROFILE_KEY = "yta_active_profile_v2";
  const KIDMODE_KEY = "yta_kidmode_v2";
// Responsive label for Kid/Parent toggle (keep header tidy on small screens)
  function labelForParentOff(){
    return (window.matchMedia && window.matchMedia("(max-width: 420px)").matches) ? "Parent" : "Parent mode";
  }

  const UI_KEY = "yta_ui_v1";
  const stateKey = (profileId) => `yta_state_${profileId}_v2`;

  // ---------- platform links ----------
  const platforms = {
    scratch: { name: "Scratch", url: "https://scratch.mit.edu" },
    logic: { name: "Khan Academy", url: "https://www.khanacademy.org" },
    typing: { name: "TypingClub", url: "https://www.typingclub.com" },
    roblox: { name: "Roblox Studio", url: "https://create.roblox.com" },
    replit: { name: "Replit", url: "https://replit.com" },
  };

  // ---------- helpers ----------
  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cryptoId() {
    try { return crypto.randomUUID(); }
    catch { return "p_" + Math.random().toString(16).slice(2) + Date.now().toString(16); }
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "2-digit" });
  }

  function nextMondayISO(fromDate = new Date()) {
    const d = new Date(fromDate);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0 Sun .. 6 Sat
    const add = (8 - day) % 7;
    const inc = add === 0 ? 7 : add; // next Monday (not today)
    d.setDate(d.getDate() + inc);
    return d.toISOString().slice(0, 10);
  }

  // ---------- mobile nav (hamburger + close) ----------
  function loadUI() {
    return JSON.parse(localStorage.getItem(UI_KEY) || "{}");
  }
  function saveUI(ui) {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  }

  function initMobileNav() {
  const navBtns = Array.from(document.querySelectorAll('[data-yt="navbtn"]')); // supports ☰ and ✕
  const drawer = document.querySelector('[data-yt="drawer"]');
  const backdrop = document.querySelector('[data-yt="backdrop"]');
  if (!navBtns.length || !drawer || !backdrop) return;

  // Prevent double-binding (can happen if nav is injected after app.js runs)
  if (drawer.dataset.ytaNavBound === "1") return;
  drawer.dataset.ytaNavBound = "1";

  const ui = loadUI();
  let scrollY = 0;

  function setExpanded(v) {
    navBtns.forEach(btn => btn.setAttribute("aria-expanded", v ? "true" : "false"));
  }

  function open() {
    scrollY = window.scrollY || 0;
    drawer.classList.add("is-open");
    backdrop.classList.add("is-open");
    setExpanded(true);

    ui.drawerOpen = true;
    saveUI(ui);
  }

  function close() {
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    setExpanded(false);

    ui.drawerOpen = false;
    saveUI(ui);
  }

  function toggle() {
    if (drawer.classList.contains("is-open")) close();
    else open();
  }

  navBtns.forEach(btn => btn.addEventListener("click", (e) => {
    e.preventDefault();
    toggle();
  }));

  backdrop.addEventListener("click", close);

  // Close on outside click (useful when backdrop is hidden on mobile dropdown)
  document.addEventListener("click", (e) => {
    if (!drawer.classList.contains("is-open")) return;
    const target = e.target;
    const onBtn = target && target.closest ? target.closest('[data-yt="navbtn"]') : null;
    if (onBtn) return;
    if (drawer.contains(target)) return;
    close();
  });

  // Close drawer when a menu item is selected.
  // We persist drawer state in localStorage; without closing here the next page can
  // re-open the drawer and block content on mobile.
  drawer.addEventListener("click", (e) => {
    const link = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!link) return;
    // Let the browser navigate normally; just ensure the drawer state is closed first.
    close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // optional: persist open state across accidental reloads
  if (ui.drawerOpen) {
    // don’t force-open if desktop
    if (window.matchMedia("(max-width: 899px)").matches) open();
    else ui.drawerOpen = false, saveUI(ui);
  }

  // Close drawer if viewport becomes desktop
  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 899px)").matches) close();
  });
}


  // Retry mobile nav binding in case the header/drawer is injected after app.js initialises.
  function retryInitMobileNav() {
    // try a few times; harmless if already bound
    const delays = [0, 30, 120, 300, 700];
    delays.forEach(d => setTimeout(() => { try { retryInitMobileNav(); } catch (e) {} }, d));
  }

  // ---------- Journey dropdown (details.navDrop) ----------
  // Fix: close the dropdown after selecting a month, and close on outside click/Escape.
  function initJourneyDropdown() {
    const drops = Array.from(document.querySelectorAll("details.navDrop"));
    if (!drops.length) return;

    drops.forEach(d => {
      // prevent double-binding if init() is ever called twice (belt + braces)
      if (d.dataset.ytaBound === "1") return;
      d.dataset.ytaBound = "1";

      // Close when clicking a link inside (Phase 1/2/3 etc.)
      d.querySelectorAll("a").forEach(a => {
        a.addEventListener("click", () => {
          d.removeAttribute("open");
        });
      });

      // Only one open at a time
      d.addEventListener("toggle", () => {
        if (!d.open) return;
        drops.forEach(other => {
          if (other !== d) other.removeAttribute("open");
        });
      });
    });

    // Close if you click outside any open dropdown
    document.addEventListener("click", (e) => {
      drops.forEach(d => {
        if (!d.open) return;
        if (!d.contains(e.target)) d.removeAttribute("open");
      });
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      drops.forEach(d => d.removeAttribute("open"));
    });
  }

  // ---------- kid mode ----------
  function getKidMode() { return localStorage.getItem(KIDMODE_KEY) === "1"; }
  const PARENT_PASS_KEY = "yta_parent_pass_v1";
  function hasParentPass() { return !!localStorage.getItem(PARENT_PASS_KEY); }
  async function sha256(s) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(String(s)));
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2,"0")).join("");
  }
  async function setParentPass(pass) {
    const h = await sha256(pass);
    localStorage.setItem(PARENT_PASS_KEY, h);
  }
  async function checkParentPass(pass) {
    const saved = localStorage.getItem(PARENT_PASS_KEY);
    if (!saved) return false;
    return (await sha256(pass)) === saved;
  }
  async function promptForPass(firstTime=false) {
    if (firstTime) {
      const p1 = prompt("Create a parent password to unlock Parent mode:\n\nTip: If you forget it, press & hold the Parent button to reset on this device.");
      if (!p1) return false;
      const p2 = prompt("Confirm password:");
      if (!p2 || p2 !== p1) { alert("Passwords did not match."); return false; }
      await setParentPass(p1);
      return true;
    }
    const p = prompt("Enter parent password to unlock Parent mode:\n\nForgot it? Press & hold the Parent button to reset on this device.");
    if (!p) return false;
    const ok = await checkParentPass(p);
    if (!ok) alert("Incorrect password.\n\nForgot it? Press & hold the Parent button to reset on this device.");
    return ok;
  }

  function setKidMode(on) {
    localStorage.setItem(KIDMODE_KEY, on ? "1" : "0");
    document.body.classList.toggle("kidmode", on);
    // Notify other scripts (e.g., site.js) so the header/nav can adapt immediately.
    try { document.dispatchEvent(new CustomEvent("yta:kidmode:change", { detail: { on } })); } catch (e) { /* no-op */ }
  }
  function initKidModeUI() {
    document.body.classList.toggle("kidmode", getKidMode());
    const btn = document.getElementById("kidModeToggle");
    if (!btn) return;

    function updateModeButton() {
      // When Kid Mode is ON, Parent is locked (button should offer Parent unlock)
      const locked = getKidMode();
      btn.setAttribute("aria-pressed", locked ? "true" : "false");
      btn.textContent = locked ? "Kid mode on" : labelForParentOff();
    }

    // prevent duplicate listeners if pages call this more than once
    if (btn.dataset.ytaBound === "1") {
      updateModeButton();
      return;
    }
    btn.dataset.ytaBound = "1";

// hold-to-reset (hidden): press & hold this button to reset the parent password on this device.
// This keeps the site static (no email reset) while giving parents a recovery route.
(function bindHoldToReset() {
  let t = null;
  const HOLD_MS = 2800;

  function clearTimer() {
    if (t) { clearTimeout(t); t = null; }
  }

  function startTimer() {
    clearTimer();
    t = setTimeout(() => {
      clearTimer();
      const ok = confirm("Reset Parent password on this device?\n\nThis will require you to create a new password next time you unlock Parent mode.");
      if (!ok) return;
      try { localStorage.removeItem("yta_parent_pass_v1"); } catch (e) { /* no-op */ }
      // Keep Parent locked after reset for safety
      setKidMode(true);
      updateModeButton();
      try { document.dispatchEvent(new CustomEvent("yta:kidmode:change", { detail: { on: true } })); } catch (e) { /* no-op */ }
      alert("Parent password reset. You can create a new one when unlocking Parent mode.");
    }, HOLD_MS);
  }

  btn.addEventListener("mousedown", startTimer);
  btn.addEventListener("touchstart", startTimer, { passive: true });
  btn.addEventListener("mouseup", clearTimer);
  btn.addEventListener("mouseleave", clearTimer);
  btn.addEventListener("touchend", clearTimer);
  btn.addEventListener("touchcancel", clearTimer);
})();
// end hold-to-reset



    updateModeButton();

    btn.addEventListener("click", async () => {
  const currentlyKid = getKidMode(); // true => Parent locked
  if (currentlyKid) {
    // Trying to unlock parent mode (turn Kid Mode OFF) — require password
    if (!hasParentPass()) {
      const created = await promptForPass(true);
      if (!created) return;
    } else {
      const ok = await promptForPass(false);
      if (!ok) return;
    }
    setKidMode(false);
    updateModeButton();
    return;
  }

  // Lock parent mode (turn Kid Mode ON) — no password needed
  setKidMode(true);
  updateModeButton();
});
}

  
  // ---------- Kid Mode enforcement ----------
  // When Parent is locked (Kid Mode ON), hide parent-only UI and block protected pages.
  function applyParentOnlyVisibility() {
    const locked = getKidMode();
    document.body.classList.toggle("kidmode", locked);

    // Anything marked as parent-only disappears while locked
    document.querySelectorAll("[data-parent-only]").forEach(el => {
      el.style.display = locked ? "none" : "";
    });

    // Optional: if a page has parent-only sections, mark them too
    document.querySelectorAll("[data-parent-only-block]").forEach(el => {
      el.hidden = !!locked;
    });
  }

  function isProtectedPage() {
    const f = (location.pathname || "").split("/").pop() || "index.html";
    const file = f.toLowerCase();

    // Parent-only pages
    const protectedFiles = new Set([
      "dashboard.html",
      "profiles.html",
      "tracks.html",
      "print.html",
      "certificates.html"
    ]);

    return protectedFiles.has(file);
  }

  function showParentLockOverlay() {
    // Avoid duplicates
    if (document.getElementById("parentLockOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "parentLockOverlay";
    overlay.className = "parentLockOverlay";
    overlay.innerHTML = `
      <div class="parentLockCard" role="dialog" aria-modal="true" aria-label="Parent mode locked">
        <div class="parentLockTitle">Parent mode is locked</div>
        <p class="parentLockText">This area is for parents/guardians. Ask a parent to unlock access.</p>
        <div class="parentLockActions">
          <button type="button" class="btn" id="unlockParentBtn">Unlock</button>
          <a class="btn btn--soft" href="./phase1.html">Go to Journey</a>
        </div>
        <p class="parentLockHint">Tip: on mobile, tap the “Kid mode on” button in the top bar to unlock.</p>
      </div>
    `;
    document.body.appendChild(overlay);

    const unlockBtn = overlay.querySelector("#unlockParentBtn");
    unlockBtn.addEventListener("click", async () => {
      try {
        if (!hasParentPass()) {
          const created = await promptForPass(true);
          if (!created) return;
        } else {
          const ok = await promptForPass(false);
          if (!ok) return;
        }
        setKidMode(false);
        applyParentOnlyVisibility();
        // Reload so the page renders normally
        location.reload();
      } catch (e) { /* no-op */ }
    });
  }

  function enforceKidModeGuards() {
    applyParentOnlyVisibility();

    // Block parent-only pages while locked
    if (getKidMode() && isProtectedPage()) {
      showParentLockOverlay();
    }
  }

  // ---------- certificates page ----------
  function initCertificatesPage() {
    const weekSelect = document.getElementById("weekSelect");
    const genBtn = document.getElementById("genBtn");
    const genAllBtn = document.getElementById("genAllBtn");
    const printBtn = document.getElementById("printBtn");
    const mount = document.getElementById("certMount");

    // Not on certificates page
    if (!weekSelect || !mount) return;

    // Prevent double-binding when init() runs multiple times
    if (weekSelect.dataset.ytBound === "1") return;
    weekSelect.dataset.ytBound = "1";

    // If there are no profiles at all, this feature can't work.
    // Show a clear message rather than leaving the controls in a broken state.
    const allProfiles = getProfiles();
    if (!allProfiles.length) {
      mount.innerHTML = `
        <section class="card card--soft stack">
          <h2 class="h2">Please create at least one child profile to use this feature</h2>
          <p class="muted">Certificates are generated from a child profile’s progress.</p>
          <div class="ctaRow">
            <a class="btn btn--primary" href="./profiles.html">Create a profile</a>
            <a class="btn" href="./tracks.html">View tracks</a>
          </div>
        </section>
      `;

      // Disable controls to avoid confusing UX
      weekSelect.disabled = true;
      if (genBtn) genBtn.disabled = true;
      if (genAllBtn) genAllBtn.disabled = true;
      if (printBtn) printBtn.disabled = true;
      return;
    }

    const safeSetText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    const renderHeader = () => {
      const active = getActiveProfile();
      const cur = getActiveCurriculum();
      safeSetText("pName", active?.name ?? "No profile");
      safeSetText("pYear", (active?.yearGroup != null && !Number.isNaN(active?.yearGroup)) ? String(active.yearGroup) : "—");
      safeSetText("pTrack", cur?.name ?? "—");
    };

    const fillWeeks = () => {
      // Keep any existing selection if possible.
      const current = weekSelect.value;
      weekSelect.innerHTML = "";
      for (let w = 1; w <= 12; w++) {
        const opt = document.createElement("option");
        opt.value = String(w);
        opt.textContent = weekLabel(w, getActiveProfileId());
        weekSelect.appendChild(opt);
      }
      if (current) weekSelect.value = current;
    };

    const generateOne = (w) => {
      try {
        mount.innerHTML = renderCertificateHTML({ week: w });
      } catch (e) {
        console.error(e);
        mount.innerHTML = `
          <section class="card card--soft stack">
            <h2 class="h2">Couldn’t generate the certificate</h2>
            <p class="muted">Open <a href="./debug.html">debug.html</a> to run checks, then try again.</p>
          </section>
        `;
      }
    };

    const generateAll = () => {
      try {
        mount.innerHTML = Array.from({ length: 12 }, (_, i) => renderCertificateHTML({ week: i + 1 })).join("");
      } catch (e) {
        console.error(e);
        mount.innerHTML = `
          <section class="card card--soft stack">
            <h2 class="h2">Couldn’t generate all certificates</h2>
            <p class="muted">Open <a href="./debug.html">debug.html</a> to run checks, then try again.</p>
          </section>
        `;
      }
    };

    // Bind UI
    genBtn?.addEventListener("click", () => generateOne(Number(weekSelect.value || "1")));
    genAllBtn?.addEventListener("click", generateAll);
    printBtn?.addEventListener("click", () => window.print());

    // Initial render
    renderHeader();
    fillWeeks();
    const suggested = suggestWeek();
    weekSelect.value = String(suggested);
    generateOne(suggested);

    // BFCache restore: re-render header + options
    window.addEventListener("pageshow", () => {
      renderHeader();
      fillWeeks();
    });
  }


// ---------- curriculum ----------
  function mkDay(
    num,
    week,
    month,
    dow,
    mainKey,
    mainTopic,
    buildTask,
    logicTask,
    typingTask,
    notes = "",
    buildSteps = null,
    logicSteps = null,
    typingSteps = null,
    outcomes = null,
  ) {
    return {
      num,
      week,
      month,
      dow,
      mainKey,
      mainTopic,
      buildTask,
      logicTask,
      typingTask,
      notes,
      buildSteps,
      logicSteps,
      typingSteps,
      outcomes,
    };
  }

  // Base plan (builder-ish). We’ll derive Foundation (Y3–4) and Builder (Y5–6) from it.
  const baseDays = [
    // Month 1: Scratch (1–24)
    mkDay(
      1,1,1,"Mon","scratch","Scratch basics + motion",
      "Move a sprite with the arrow keys",
      "Khan Academy: solve 8 multi-step word problems",
      "TypingClub: lessons 1–5 (home row start)",
      "",
      [
        "Open Scratch, click Create, name the project ‘Arrow Runner’",
        "Add: when green flag clicked, go to x:0 y:0, point in direction 90",
        "Add 4 scripts: when up/down/left/right key pressed, change x/y by 10",
        "Test: can you move smoothly, without getting stuck?",
      ],
      [
        "Go to Khan Academy Maths for your child’s year group",
        "Choose a word problems lesson, complete 8 questions",
        "Write down 1 mistake you made, then re-do that question",
      ],
      [
        "TypingClub: do lessons 1–5 (F/J, space, D/K)",
        "Aim for 90% accuracy, slow is fine",
        "Do a 1-minute test at the end, note your WPM",
      ],
      ["Sprite moves with arrow keys", "Can explain what an event block does", "Accuracy target recorded"],
    ),
    mkDay(
      2,1,1,"Tue","scratch","Loops",
      "Continuous movement and bounce",
      "Khan Academy: patterns, complete 10 questions",
      "TypingClub: continue home row",
      "",
      [
        "Add a script: when green flag clicked, forever move 5 steps",
        "Add: if on edge, bounce",
        "Add: when space key pressed, change direction by 15 degrees",
        "Outcome: your sprite keeps moving and stays on screen",
      ],
      [
        "Khan Academy: choose a patterns lesson (number patterns)",
        "Complete 10 questions",
        "Say out loud what the rule is for 3 of them",
      ],
      [
        "TypingClub: next 5 lessons you see on the home row plan",
        "Focus: keep fingers on F and J bumps",
        "1-minute test, try to match or beat yesterday",
      ],
      ["Uses a forever loop", "Understands ‘if on edge, bounce’", "Pattern rule explained"],
    ),
    mkDay(
      3,1,1,"Wed","scratch","Variables",
      "Create a score counter",
      "Khan Academy: arithmetic reasoning, 10 questions",
      "TypingClub: accuracy focus",
      "",
      [
        "Make a variable: score (for all sprites)",
        "Set score to 0 when green flag clicked",
        "When sprite touches a coin, change score by 1",
        "Hide the coin and show it again somewhere else",
      ],
      [
        "Khan Academy: arithmetic or number sense practice",
        "Complete 10 questions",
        "Check your working for the last 2 before you submit",
      ],
      [
        "TypingClub: do 10 minutes of lessons",
        "Accuracy target: 92% or better",
        "If you dip below target, slow down and restart that lesson",
      ],
      ["Score variable updates", "Can reset score", "Knows what a variable is"],
    ),
    mkDay(
      4,1,1,"Thu","scratch","Random numbers",
      "Falling objects spawn randomly",
      "Khan Academy: time problems, 8 questions",
      "TypingClub: 1-minute speed test",
      "",
      [
        "Create an ‘Apple’ sprite and start it at y:180",
        "Set x to pick random -220 to 220",
        "Forever: change y by -6, if y < -170 then go to y:180 and pick a new random x",
        "Test: apples fall from different places each time",
      ],
      [
        "Khan Academy: time or clocks lesson",
        "Complete 8 questions",
        "Say how you worked out 1 of the answers",
      ],
      [
        "TypingClub: 10 minutes practice",
        "Do a 1-minute test, note WPM and accuracy",
        "Try to keep your eyes on the screen, not the keyboard",
      ],
      ["Uses random block", "Falling loop works", "WPM recorded"],
    ),
    mkDay(
      5,1,1,"Fri","scratch","Lives + Game Over",
      "Add a lose condition when lives reach zero",
      "Khan Academy: brain teasers or challenge set",
      "TypingClub: timed test",
      "",
      [
        "Make variable: lives, set to 3 on green flag",
        "If apple touches player, change score by 1 and reset apple",
        "If apple hits ground, change lives by -1 and reset apple",
        "If lives = 0 then stop all, show ‘Game Over’ message",
      ],
      [
        "Khan Academy: pick a ‘challenge’ or ‘mastery’ quiz",
        "Do 10 minutes, skip nothing, try your best",
        "Pick 1 tricky question and explain it to a parent",
      ],
      [
        "TypingClub: do a 2-minute test",
        "Focus: accuracy first, then speed",
        "Write down: WPM, accuracy, and 1 key that trips you up",
      ],
      ["Lives decrease correctly", "Game Over triggers", "Can explain one tricky question"],
    ),
    mkDay(
      6,1,1,"Sat","scratch","Build sprint",
      "Project: Catch Game (score, lives, increasing speed)",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub: quick review",
      "Presentation: explain how it works",
      [
        "Start from your falling-object game",
        "Add difficulty: every 5 points, make apples fall faster",
        "Add a start screen with ‘Press space to begin’",
        "Add a win condition: reach 20 points",
      ],
      [
        "Set a 10-minute timer",
        "Do a mixed practice set, focus on calm working",
        "Check answers, then retry 2 mistakes",
      ],
      [
        "TypingClub: 10 minutes review lessons",
        "Do 1-minute test, compare to day 1",
        "Stretch your hands, short break, then stop",
      ],
      ["Has a complete game loop", "Difficulty increases", "Can demo and explain the game"],
    ),

    mkDay(
      7,2,1,"Mon","scratch","If statements",
      "Maze basics: walls and movement rules",
      "Khan Academy: fractions, 10 questions",
      "TypingClub: steady practice",
      "",
      [
        "Create a maze backdrop (or draw a simple one)",
        "Move with arrow keys",
        "Add wall rule: if touching wall colour, go back to start",
        "Add a goal: touching the star ends the run",
      ],
      [
        "Khan Academy: fractions lesson",
        "Complete 10 questions",
        "Draw 1 fraction model (circle or bar) on paper",
      ],
      [
        "TypingClub: 10 minutes",
        "Accuracy target: 92%",
        "Practise backspace with control, not panic",
      ],
      ["Maze resets on wall hit", "Goal works", "Fraction model drawn"],
    ),
    mkDay(
      8,2,1,"Tue","scratch","Timer variable",
      "Add a countdown timer to the maze",
      "Khan Academy: word logic problems, 10 mins",
      "TypingClub",
      "Mini-present: what did you add?",
      [
        "Make variable: time",
        "Set time to 30 when green flag clicked",
        "Every 1 second, change time by -1",
        "If time = 0 then show ‘Time up’ and stop all",
      ],
      [
        "Pick a logic or word problem set on Khan Academy",
        "Work for 10 minutes",
        "Explain 1 solution in a clear sentence",
      ],
      [
        "TypingClub: 10 minutes",
        "Do a 1-minute test",
        "Try not to look down at all",
      ],
      ["Timer counts down", "Understands seconds loop", "Can explain one solution"],
    ),
    mkDay(
      9,2,1,"Wed","scratch","Enemy logic",
      "Add a simple enemy that chases you",
      "Khan Academy: pattern challenge, 10 questions",
      "TypingClub",
      "",
      [
        "Add an enemy sprite, place it in the maze",
        "Forever: point towards player, move 2 steps",
        "If enemy touches player, send ‘lose’ message",
        "Add: when I receive lose, show lose screen",
      ],
      [
        "Khan Academy: patterns set",
        "Complete 10 questions",
        "Spot 1 pattern rule and write it down",
      ],
      [
        "TypingClub: 10 minutes",
        "Focus on tricky keys you miss",
        "Finish with 30 seconds of slow, perfect typing",
      ],
      ["Enemy follows player", "Lose condition works", "Pattern rule written"],
    ),
    mkDay(
      10,2,1,"Thu","scratch","Win conditions + sound",
      "Win and lose screens, plus sound effects",
      "Khan Academy: multi-step puzzles, 8 questions",
      "TypingClub",
      "",
      [
        "Create 2 backdrops or costumes: ‘You Win’, ‘You Lose’",
        "When player reaches goal, broadcast win",
        "On win: play a sound, stop all",
        "On lose: play a different sound, stop all",
      ],
      [
        "Khan Academy: multi-step practice",
        "Complete 8 questions",
        "Check your answers before submitting the last 2",
      ],
      [
        "TypingClub: 10 minutes",
        "1-minute test",
        "If accuracy < 90%, redo the test slowly",
      ],
      ["Win/lose screens show", "Uses broadcasts", "Two sounds added"],
    ),
    mkDay(
      11,2,1,"Fri","scratch","Debugging day",
      "Break one thing, then fix it",
      "Khan Academy: mixed challenge, 10 mins",
      "TypingClub",
      "",
      [
        "Pick 1 thing to break on purpose (timer, enemy speed, wall colour)",
        "Write what you changed",
        "Fix it back, test again",
        "Add 1 comment block saying what the bug was",
      ],
      [
        "10-minute mixed practice",
        "Try to get 3 in a row correct",
        "If you miss one, explain why",
      ],
      [
        "TypingClub: 10 minutes",
        "Choose 1 lesson you struggled with, redo it",
        "Quick stretch and stop",
      ],
      ["Can describe a bug and a fix", "Understands testing", "Improved on a weak lesson"],
    ),
    mkDay(
      12,2,1,"Sat","scratch","Build sprint",
      "Project: Maze Escape (timer, enemy, win/lose)",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub: review",
      "Presentation: show the full game",
      [
        "Combine: maze, timer, enemy, win/lose screens",
        "Add 3 coins to collect before the goal (score check)",
        "Add instructions screen: controls and goal",
        "Play-test: ask someone else to try it",
      ],
      [
        "10 minutes mixed practice",
        "Retry 2 mistakes",
        "Say 1 thing you improved this week",
      ],
      [
        "TypingClub: 10 minutes review",
        "Do a 2-minute test",
        "Note WPM, accuracy",
      ],
      ["Full maze game complete", "Instructions included", "Can explain what you built"],
    ),

    mkDay(
      13,3,1,"Mon","scratch","Cloning",
      "Use clones for multiple falling objects",
      "Khan Academy: multiplication reasoning, 10 questions",
      "TypingClub (target 35 wpm)",
      "",
      [
        "Create one ‘Falling’ sprite",
        "When green flag clicked: forever create clone, wait 1 second",
        "When I start as a clone: go to random x, go to y:180, fall down",
        "If touching player: change score by 1, delete this clone",
      ],
      [
        "Khan Academy: multiplication practice",
        "Complete 10 questions",
        "Use a times-table you know to check one answer",
      ],
      [
        "TypingClub: 12 minutes",
        "Try a longer test, 2 minutes",
        "If you hit 35 wpm once, celebrate quietly",
      ],
      ["Uses clones", "No copy-paste sprites needed", "Understands clone start"],
    ),
    mkDay(
      14,3,1,"Tue","scratch","Difficulty scaling",
      "Make speed increase over time",
      "Khan Academy: logic word problems, 10 mins",
      "TypingClub",
      "",
      [
        "Make variable: speed",
        "Set speed to 6 at start",
        "Every 10 seconds, change speed by 1",
        "Use speed in your falling loop instead of a fixed number",
      ],
      [
        "10-minute logic / word problems set",
        "Explain one answer using ‘because…’",
        "Check your final answer makes sense",
      ],
      [
        "TypingClub: 10 minutes",
        "Focus: clean capitals if your lessons include them",
        "Finish with a 1-minute test",
      ],
      ["Difficulty increases smoothly", "Uses a speed variable", "Explains a solution"],
    ),
    mkDay(
      15,3,1,"Wed","scratch","Levels",
      "Create Level 2 with a backdrop switch",
      "Khan Academy: pattern puzzles, 10 questions",
      "TypingClub",
      "",
      [
        "Make variable: level",
        "When score reaches 10, set level to 2",
        "Switch backdrop for level 2",
        "Increase speed or add a new obstacle in level 2",
      ],
      [
        "Khan Academy: patterns",
        "Complete 10 questions",
        "Write 2 pattern rules as sentences",
      ],
      [
        "TypingClub: 10 minutes",
        "Pick 1 lesson to redo perfectly",
        "Short test: 1 minute",
      ],
      ["Level changes trigger correctly", "Backdrops switch", "Level 2 is harder"],
    ),
    mkDay(
      16,3,1,"Thu","scratch","Restart system",
      "Add a restart button and reset variables",
      "Khan Academy: multi-step maths, 8 questions",
      "TypingClub",
      "",
      [
        "Add a ‘Restart’ sprite button",
        "When this sprite clicked: broadcast restart",
        "On restart: set score, lives, time, level back to start values",
        "Make sure sprites go back to start positions",
      ],
      [
        "Khan Academy: multi-step practice",
        "Complete 8 questions",
        "Show your working for 2 of them",
      ],
      [
        "TypingClub: 10 minutes",
        "Focus on rhythm, not rushing",
        "2-minute test if you feel ready",
      ],
      ["Restart works every time", "All variables reset", "Can explain broadcasts"],
    ),
    mkDay(
      17,3,1,"Fri","scratch","Polish",
      "Add animations and sound polish",
      "Khan Academy: brain teasers, 10 mins",
      "TypingClub",
      "",
      [
        "Add a short animation when you collect an item",
        "Add sound effects for win, lose, collect",
        "Make the player sprite face the direction it moves",
        "Add instructions text: goal, controls",
      ],
      [
        "10 minutes brain teasers or challenge",
        "Try not to guess, work it out",
        "Explain one solution out loud",
      ],
      [
        "TypingClub: 10 minutes",
        "Redo 1 hard lesson",
        "1-minute test",
      ],
      ["Game feels finished", "Instructions included", "Sound and visuals improved"],
    ),
    mkDay(
      18,3,1,"Sat","scratch","Build sprint",
      "Project: 2-Level Platformer",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub review",
      "Presentation: explain levels and scoring",
      [
        "Use a simple platformer template (move, jump)",
        "Add coins and a score counter",
        "Level 1: easy jumps, Level 2: harder jumps",
        "Add win screen after level 2",
      ],
      [
        "10 minutes mixed set",
        "Retry 2 mistakes",
        "Say 1 thing you want to improve next week",
      ],
      [
        "TypingClub: 10 minutes review",
        "2-minute test",
        "Note WPM, accuracy",
      ],
      ["Two playable levels", "Score works", "Can demo and explain choices"],
    ),

    mkDay(
      19,4,1,"Mon","scratch","Plan",
      "Plan your final game (goal, rules, scoring)",
      "Khan Academy: reasoning puzzles, 10 mins",
      "TypingClub",
      "",
      [
        "Choose your final game type: chase, platformer, clicker, maze",
        "Write: goal, how to win, how to lose",
        "Write: scoring and difficulty, what changes over time",
        "Sketch your screens: start, play, win, lose",
      ],
      [
        "10 minutes reasoning practice",
        "Do not rush, show working",
        "Pick 1 question and explain it clearly",
      ],
      [
        "TypingClub: 10 minutes",
        "Do 1-minute test",
        "Try to beat your best accuracy score",
      ],
      ["Game plan written", "Screens sketched", "Knows win and lose rules"],
    ),
    mkDay(
      20,4,1,"Tue","scratch","Build stage 1",
      "Start screen and core movement",
      "Khan Academy: word problems, 8 questions",
      "TypingClub",
      "Mini-present: what’s built so far?",
      [
        "Build the start screen with a ‘Start’ button",
        "Set up your main character movement",
        "Set up the play area and boundaries",
        "Save, name the project clearly",
      ],
      [
        "Khan Academy: word problems",
        "Complete 8 questions",
        "Check units, time, money, or measurement carefully",
      ],
      [
        "TypingClub: 10 minutes",
        "Focus on posture and gentle hands",
        "1-minute test",
      ],
      ["Start screen works", "Movement works", "Can explain current progress"],
    ),
    mkDay(
      21,4,1,"Wed","scratch","Build stage 2",
      "Add scoring and difficulty",
      "Khan Academy: pattern puzzles, 10 questions",
      "TypingClub",
      "",
      [
        "Add a score variable and update rules",
        "Add difficulty scaling: speed, spawn rate, or enemy count",
        "Add 1 new obstacle or power-up",
        "Test: can you score points reliably?",
      ],
      [
        "Khan Academy: patterns",
        "Complete 10 questions",
        "Write 1 pattern as a simple formula or rule",
      ],
      [
        "TypingClub: 10 minutes",
        "Redo 1 lesson with perfect accuracy",
        "Short test: 1 minute",
      ],
      ["Score and difficulty added", "One new feature included", "Game is playable"],
    ),
    mkDay(
      22,4,1,"Thu","scratch","Build stage 3",
      "Add lives and win/lose states",
      "Khan Academy: logic puzzles, 10 mins",
      "TypingClub",
      "",
      [
        "Add lives or health",
        "Add win condition and lose condition",
        "Add win and lose screens with sounds",
        "Add restart button",
      ],
      [
        "10 minutes logic practice",
        "Explain one answer, step by step",
        "Check your final answer makes sense",
      ],
      [
        "TypingClub: 10 minutes",
        "2-minute test if you feel ready",
        "Note WPM and accuracy",
      ],
      ["Win/lose states work", "Restart works", "Can explain rules"],
    ),
    mkDay(
      23,4,1,"Fri","scratch","Bug fixing + polish",
      "Fix issues and improve visuals and sound",
      "Khan Academy: mixed challenge, 10 mins",
      "TypingClub",
      "",
      [
        "Play your game 3 times and note anything odd",
        "Fix at least 2 bugs",
        "Improve visuals: neat layout, consistent fonts, readable text",
        "Add a short instructions panel",
      ],
      [
        "10 minutes mixed practice",
        "Retry 2 mistakes",
        "Tell a parent what you fixed today",
      ],
      [
        "TypingClub: 10 minutes",
        "Pick a tricky lesson and redo",
        "1-minute test",
      ],
      ["Bugs fixed", "Game looks tidy", "Can explain improvements"],
    ),
    mkDay(
      24,4,1,"Sat","scratch","Demo day",
      "Final Scratch game presentation",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub: check-in",
      "Optional: share link to family",
      [
        "Final play-test, fix any last issues",
        "Add credits: ‘Made by…’",
        "Share your project link with a parent",
        "Present: what you built, what broke, what you fixed",
      ],
      [
        "10 minutes mixed set",
        "Retry 2 mistakes",
        "Say 1 skill you improved this phase",
      ],
      [
        "TypingClub: 1-minute test",
        "Compare to day 1",
        "High-five your keyboard politely",
      ],
      ["Project shared", "Can present clearly", "Typing progress compared"],
    ),

    // Phase 2: Roblox (25–48)
    mkDay(
      25,5,2,"Mon","roblox","Studio basics",
      "Learn interface: Explorer, Properties, parts",
      "Khan Academy: reasoning puzzles (10–15 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Open Roblox Studio → New → Baseplate, then Save as ‘Phase2_Obby’",
        "Turn on Explorer + Properties (View tab)",
        "Insert 5 Parts and practise move/scale/rotate",
        "Press Play (F5) and confirm you spawn correctly",
      ],
      [
        "Pick 1 reasoning/pattern set",
        "Work for 10–15 minutes",
        "Explain 1 answer out loud in full sentences",
      ],
      [
        "TypingClub: 10 minutes",
        "Accuracy target: 90%+",
        "Finish with a 1-minute test (optional)",
      ],
      ["Can find Explorer/Properties", "Saved a new place", "Basic parts placed and tested"],
    ),
    mkDay(
      26,5,2,"Tue","roblox","Parts + anchoring",
      "Build a simple obby path",
      "Khan Academy: pattern puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Build a straight path: 8–12 platforms",
        "Anchor platforms so they don’t fall",
        "Add 1 moving part (tween/manual script is optional)",
        "Play-test twice and adjust gaps so it feels fair",
      ],
      ["Do a pattern set", "Complete 10 minutes", "Write the rule for 2 patterns"],
      ["TypingClub: 10 minutes", "Slow down on mistakes", "Aim 90%+ accuracy"],
      ["Obby path is playable", "Anchoring understood", "Gaps feel fair"],
    ),
    mkDay(
      27,5,2,"Wed","roblox","Terrain tools",
      "Add terrain + obstacles",
      "Khan Academy: word problems (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Open Terrain Editor and add 1 hill or platform area",
        "Add 2 obstacles (e.g., lava floor, spinning bar, narrow beam)",
        "Add a safe zone (a big flat platform) between hard bits",
        "Play-test and note 1 improvement to make tomorrow",
      ],
      ["Pick 1 word-problem set", "Work 10 minutes", "Show working for 2 questions"],
      ["TypingClub: 10 minutes", "Do 1-minute test", "Note WPM + accuracy"],
      ["Terrain used once", "2 obstacles added", "1 improvement note written"],
    ),
    mkDay(
      28,5,2,"Thu","roblox","Level design",
      "Design a full obstacle course layout",
      "Khan Academy: logic puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Sketch your obby in 60 seconds: start → middle → finish",
        "Build 3 sections (easy/medium/hard)",
        "Add a clear finish marker (flag/sign/portal)",
        "Play-test and time how long it takes",
      ],
      ["Do a logic set", "10 minutes", "Explain 1 solution step-by-step"],
      ["TypingClub: 10 minutes", "Accuracy target: 92%", "Redo one weak lesson"],
      ["Obby has 3 sections", "Finish is clear", "Time to complete recorded"],
    ),
    mkDay(
      29,5,2,"Fri","roblox","Refinement",
      "Improve spacing, fairness, and reset points",
      "Khan Academy: brain teasers (10 mins)",
      "TypingClub: timed test",
      "",
      [
        "Add 3 checkpoints (SpawnLocation parts) along the course",
        "Make sure players can’t cheat around walls (add guard rails)",
        "Fix 2 frustrating jumps by adjusting spacing",
        "Play-test like a new player (no shortcuts)",
      ],
      ["Brain teasers for 10 minutes", "Pick the hardest one", "Explain your reasoning"],
      ["TypingClub: 10 minutes", "2-minute test", "Write down WPM + accuracy"],
      ["Checkpoints work", "2 frustrations fixed", "Course feels fairer"],
    ),
    mkDay(
      30,5,2,"Sat","roblox","Build sprint",
      "Project: Full obby + checkpoints",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub: quick review",
      "Presentation: show course flow",
      [
        "Do a full play-through start → finish",
        "Add 1 ‘wow’ moment (big jump, moving platform, secret path)",
        "Add instructions at the start (a sign)",
        "Show a parent: what’s easy, what’s tricky, and why",
      ],
      ["10-minute mixed set", "Retry 2 mistakes", "Say 1 skill you practised"],
      ["TypingClub: 10 minutes", "1-minute test", "Stop when hands feel tired"],
      ["Full obby playable", "Has checkpoints + instructions", "Can explain difficulty choices"],
    ),

    mkDay(
      31,6,2,"Mon","roblox","Lua variables",
      "Create a variable + print output",
      "Khan Academy: reasoning puzzles (10 mins)",
      "TypingClub (target ~40 WPM)",
      "",
      [
        "Insert a Script and print 'Hello from Roblox'",
        "Create a variable like coins = 0",
        "Print the variable and change it to 10",
        "Run and confirm Output shows your values",
      ],
      ["Reasoning set for 10 minutes", "Do not rush", "Explain 1 answer"],
      ["TypingClub: 10 minutes", "Try a 1-minute test", "Aim for calm accuracy"],
      ["Can read Output", "Understands variables", "Can change and re-run"],
    ),
    mkDay(
      32,6,2,"Tue","roblox","If statements",
      "Trigger: if player touches → do action",
      "Khan Academy: word logic problems (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Add a Part named 'WinPad'",
        "Use .Touched to detect a player",
        "If it's a player, print 'You win!' or change a variable",
        "Test by walking onto the pad",
      ],
      ["10 minutes word logic", "Write down 1 tricky question", "Explain why your answer works"],
      ["TypingClub: 10 minutes", "Accuracy 90%+", "Redo 1 lesson if below"],
      ["Touch trigger works", "Used an if statement", "Can explain condition"],
    ),
    mkDay(
      33,6,2,"Wed","roblox","Functions",
      "Make a reusable function for an action",
      "Khan Academy: pattern puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Write a function like givePoints(player, amount)",
        "Call it from a touch trigger",
        "Print a message showing points awarded",
        "Change amount in one place and re-test",
      ],
      ["Patterns for 10 minutes", "Write the rule for 2 patterns", "Check 1 answer twice"],
      ["TypingClub: 10 minutes", "1-minute test", "Note WPM"],
      ["Understands functions", "Reused code once", "Can explain inputs/outputs"],
    ),
    mkDay(
      34,6,2,"Thu","roblox","Triggers",
      "Door opens when item collected",
      "Khan Academy: logic puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Build a simple door (a Part) blocking a path",
        "Add a collectible item (coin/key part)",
        "When collected: set hasKey = true and remove the item",
        "If hasKey then door becomes CanCollide = false (or moves away)",
      ],
      ["Logic set for 10 minutes", "Explain 1 solution", "Check final answer makes sense"],
      ["TypingClub: 10 minutes", "Accuracy target: 92%", "Redo one weak row"],
      ["Collectible works", "Door opens correctly", "Can explain game state"],
    ),
    mkDay(
      35,6,2,"Fri","roblox","Timers",
      "Add a time limit concept",
      "Khan Academy: brain teasers (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Create a timer value (e.g., timeLeft = 60)",
        "Use a loop to count down once per second",
        "When time runs out, print 'Time up' or reset the player",
        "Test: does it reach zero smoothly?",
      ],
      ["Brain teasers for 10 minutes", "Pick 1 hardest", "Explain your reasoning"],
      ["TypingClub: 10 minutes", "2-minute test", "Accuracy first"],
      ["Timer counts down", "Understands waiting/looping", "Time-up behaviour works"],
    ),
    mkDay(
      36,6,2,"Sat","roblox","Build sprint",
      "Project: Door unlock + timer",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub: review",
      "Presentation: show script working",
      [
        "Combine: key/coin unlock + door + timer",
        "Add a reset button or restart zone",
        "Write 2 comments in your script explaining the logic",
        "Demo to a parent: what happens if you’re fast vs slow",
      ],
      ["10-minute mixed set", "Retry 2 mistakes", "Say 1 thing you improved"],
      ["TypingClub: 10 minutes", "1-minute test", "Compare to Monday"],
      ["Full mini-game loop works", "Script has comments", "Can explain the rules"],
    ),

    mkDay(
      37,7,2,"Mon","roblox","Points system",
      "Award points for actions",
      "Khan Academy: reasoning puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Create a points variable per player (leaderstats is ideal)",
        "Give points when touching a target",
        "Print or show the points updating",
        "Test with Play and repeat the action 3 times",
      ],
      ["Reasoning set 10 minutes", "Explain 1 answer", "Check your work"],
      ["TypingClub: 10 minutes", "Accuracy 90%+", "Slow is fine"],
      ["Points increase reliably", "Understands per-player vs global", "Tested 3 times"],
    ),
    mkDay(
      38,7,2,"Tue","roblox","Currency",
      "Create a coin/currency variable",
      "Khan Academy: word problems (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Add coins you can collect",
        "On collect: increase currency and remove coin",
        "Respawn coin after 5 seconds (optional)",
        "Make a simple sign: ‘Coins: …’ (or output prints)",
      ],
      ["Word problems 10 minutes", "Show working for 2", "Explain 1 answer"],
      ["TypingClub: 10 minutes", "1-minute test", "Note WPM"],
      ["Coins can be collected", "Currency increases", "Can explain what state is"],
    ),
    mkDay(
      39,7,2,"Wed","roblox","Shop basics",
      "Simple shop idea: buy 1 power-up",
      "Khan Academy: pattern puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Create a shop pad/button",
        "If player has enough coins, subtract cost",
        "Give a reward (speed boost or jump boost)",
        "If not enough coins, show a message (print is fine)",
      ],
      ["Patterns 10 minutes", "Write 2 rules", "Recheck last 2"],
      ["TypingClub: 10 minutes", "Accuracy target: 92%", "Redo a weak lesson"],
      ["Shop checks coins", "Cost subtracts correctly", "Reward applies"],
    ),
    mkDay(
      40,7,2,"Thu","roblox","Leaderboard",
      "Track best score/time",
      "Khan Academy: logic puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Add a visible stat (Coins or BestTime)",
        "Update it when a run finishes",
        "If the new score is better, save/update the best",
        "Test with 2 runs (one worse, one better)",
      ],
      ["Logic set 10 minutes", "Explain 1 solution", "Check your final answer"],
      ["TypingClub: 10 minutes", "2-minute test if ready", "Note results"],
      ["Stat displays", "Best score logic works", "Tested with 2 runs"],
    ),
    mkDay(
      41,7,2,"Fri","roblox","Power-ups",
      "Speed boost / jump boost",
      "Khan Academy: brain teasers (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Create a power-up pickup (glowing part)",
        "On touch: increase WalkSpeed or JumpPower for 10 seconds",
        "After 10 seconds: reset back to normal",
        "Play-test and check it feels noticeable but not unfair",
      ],
      ["Brain teasers 10 minutes", "Pick 1 hardest", "Explain your reasoning"],
      ["TypingClub: 10 minutes", "1-minute test", "Aim for steady accuracy"],
      ["Power-up applies and resets", "Understands temporary effects", "Balancing note made"],
    ),
    mkDay(
      42,7,2,"Sat","roblox","Build sprint",
      "Project: Economy + power-ups",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub: review",
      "Presentation: explain economy rules",
      [
        "Combine coins + shop + power-up into your obby",
        "Add 2 prices (cheap + expensive) and 2 rewards (optional)",
        "Add a short instructions sign",
        "Explain to a parent: how to earn coins and what to spend them on",
      ],
      ["10-minute mixed set", "Retry 2 mistakes", "Say 1 skill you improved"],
      ["TypingClub: 10 minutes", "1-minute test", "Stop when tired"],
      ["Economy loop works", "At least 1 power-up purchasable", "Can explain rules clearly"],
    ),

    mkDay(
      43,8,2,"Mon","roblox","Bug fixing",
      "Test and fix issues",
      "Khan Academy: reasoning puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Play your game 3 times and write down anything odd",
        "Fix 2 bugs (coins not counting, door stuck, etc.)",
        "Add 1 comment to explain each fix",
        "Re-test and confirm the bug is gone",
      ],
      ["Reasoning set 10 minutes", "Explain 1 answer", "Stay calm"],
      ["TypingClub: 10 minutes", "Accuracy 92%+", "Redo one weak lesson"],
      ["2 bugs fixed", "Comments added", "Re-tested successfully"],
    ),
    mkDay(
      44,8,2,"Tue","roblox","UI improvement",
      "Add instructions screen / signage",
      "Khan Academy: word logic problems (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Add a start sign: how to play in 3 bullet points",
        "Add labels near shop/power-ups",
        "Make the finish obvious (big sign/flag)",
        "Ask someone else to play-test without explaining",
      ],
      ["Word logic 10 minutes", "Write down 1 tricky question", "Explain the answer"],
      ["TypingClub: 10 minutes", "1-minute test", "Note WPM"],
      ["Instructions are clear", "Finish is obvious", "Feedback from play-test collected"],
    ),
    mkDay(
      45,8,2,"Wed","roblox","Polish",
      "Better layout, pacing, visuals",
      "Khan Academy: pattern puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Choose a theme (space, jungle, neon, castle)",
        "Apply consistent colours/materials",
        "Improve pacing: add 1 rest platform after a hard section",
        "Remove clutter and align parts neatly",
      ],
      ["Patterns 10 minutes", "Write 2 rules", "Double-check last 2"],
      ["TypingClub: 10 minutes", "Accuracy target: 92%", "Redo 1 lesson"],
      ["Theme is consistent", "Course pacing improved", "Parts aligned neatly"],
    ),
    mkDay(
      46,8,2,"Thu","roblox","Testing",
      "Play-test like a new player",
      "Khan Academy: logic puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Turn your camera and pretend you’ve never seen the game",
        "Check: can you always tell where to go next?",
        "Fix 1 confusing section",
        "Time a full run and try to beat it",
      ],
      ["Logic set 10 minutes", "Explain 1 solution", "Check final answer"],
      ["TypingClub: 10 minutes", "2-minute test if ready", "Note accuracy"],
      ["1 confusion fixed", "Run time recorded", "Navigation feels clearer"],
    ),
    mkDay(
      47,8,2,"Fri","roblox","Final checks",
      "Final bugs + reset systems",
      "Khan Academy: brain teasers (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Check spawn, checkpoints, and finish all work",
        "Reset coins/power-ups correctly between runs",
        "Fix 1 last bug",
        "Add credits: ‘Made by…’",
      ],
      ["Brain teasers 10 minutes", "Pick 1 hardest", "Explain reasoning"],
      ["TypingClub: 10 minutes", "1-minute test", "Compare to Monday"],
      ["Reset systems reliable", "Credits added", "Ready to publish/share"],
    ),
    mkDay(
      48,8,2,"Sat","roblox","Publish day",
      "Publish Roblox game (with supervision)",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub: check-in",
      "Presentation: ‘What makes my game fun?’",
      [
        "With a parent: review settings and safety options",
        "Publish or save a final version",
        "Write 3 sentences: what’s fun, what’s challenging, what you’d add next",
        "Demo to family and collect 1 piece of feedback",
      ],
      ["10-minute mixed set", "Retry 2 mistakes", "Say 1 skill you improved"],
      ["TypingClub: 10 minutes", "Final 1-minute test", "High-five politely"],
      ["Published/saved final build", "Can explain why it’s fun", "Has feedback for next version"],
    ),

    // Phase 3: Python (49–72)
    mkDay(
      49,9,3,"Mon","replit","Print + variables",
      "Hello world + variables",
      "Khan Academy: reasoning puzzles (10 mins)",
      "TypingClub (target ~45–50 WPM)",
      "",
      [
        "Open Replit → create a new Python repl called ‘Phase3_Python’",
        "print('Hello world!') then run",
        "Create variables: name, age (or favourite game)",
        "Print a sentence using your variables",
      ],
      ["Reasoning set 10 minutes", "Explain 1 answer", "Check your work"],
      ["TypingClub: 10 minutes", "1-minute test", "Aim for calm accuracy"],
      ["Can run a Python program", "Understands variables", "Printed a full sentence"],
    ),
    mkDay(
      50,9,3,"Tue","replit","Input",
      "Ask questions, store answers",
      "Khan Academy: word problems (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Use input() to ask for a name",
        "Store the answer in a variable",
        "Ask 2 more questions (age, favourite food, etc.)",
        "Print a friendly summary back",
      ],
      ["Word problems 10 minutes", "Show working for 2", "Explain 1 answer"],
      ["TypingClub: 10 minutes", "Accuracy 90%+", "Slow is fine"],
      ["Uses input()", "Stores answers", "Outputs a summary"],
    ),
    mkDay(
      51,9,3,"Wed","replit","If statements",
      "Quiz: correct/incorrect logic",
      "Khan Academy: pattern puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Make a 3-question quiz",
        "If answer is correct: add 1 to score",
        "Else: print the correct answer",
        "Print final score",
      ],
      ["Patterns 10 minutes", "Write 2 rules", "Recheck last 2"],
      ["TypingClub: 10 minutes", "1-minute test", "Note WPM"],
      ["Uses if/else", "Score updates", "Gives feedback on wrong answers"],
    ),
    mkDay(
      52,9,3,"Thu","replit","Loops",
      "Repeat questions / attempts",
      "Khan Academy: logic puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Add a loop so the quiz can repeat",
        "Ask the player ‘play again? (y/n)’",
        "Reset score on a new run",
        "Test: can you play twice without restarting the program?",
      ],
      ["Logic set 10 minutes", "Explain 1 solution", "Check final answer"],
      ["TypingClub: 10 minutes", "Accuracy target: 92%", "Redo 1 weak lesson"],
      ["Uses a loop", "Replay works", "Knows when to reset variables"],
    ),
    mkDay(
      53,9,3,"Fri","replit","Mini challenge",
      "5-question quiz with score",
      "Khan Academy: brain teasers (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Upgrade your quiz to 5 questions",
        "Add a 'perfect score' message",
        "Add one funny/bonus question",
        "Run and play-test yourself",
      ],
      ["Brain teasers 10 minutes", "Pick 1 hardest", "Explain reasoning"],
      ["TypingClub: 10 minutes", "2-minute test", "Accuracy first"],
      ["5 questions added", "Score messaging works", "Bonus question included"],
    ),
    mkDay(
      54,9,3,"Sat","replit","Build sprint",
      "Project: Interactive quiz (score + replay)",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub: review",
      "Presentation: demo quiz",
      [
        "Clean up text (capital letters, spacing)",
        "Add at least 2 comments explaining tricky bits",
        "Make sure replay works reliably",
        "Demo to a parent: what did you add and why?",
      ],
      ["10-minute mixed set", "Retry 2 mistakes", "Say 1 skill you improved"],
      ["TypingClub: 10 minutes", "1-minute test", "Stop when tired"],
      ["Quiz feels polished", "Has comments", "Can explain program flow"],
    ),

    mkDay(
      55,10,3,"Mon","replit","Random",
      "Use random numbers",
      "Khan Academy: reasoning puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Import random",
        "Generate a random number 1–10",
        "Print it (for now) and re-run 5 times",
        "Explain what ‘random’ means in your own words",
      ],
      ["Reasoning 10 minutes", "Explain 1 answer", "Check work"],
      ["TypingClub: 10 minutes", "Accuracy 90%+", "Slow is fine"],
      ["Can import a module", "Can generate random numbers", "Understands randomness concept"],
    ),
    mkDay(
      56,10,3,"Tue","replit","Guess the number",
      "Build base game loop",
      "Khan Academy: word problems (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Pick a secret number 1–20",
        "Ask the player to guess",
        "If too high/low, give a hint",
        "Loop until correct",
      ],
      ["Word problems 10 minutes", "Show working for 2", "Explain 1"],
      ["TypingClub: 10 minutes", "1-minute test", "Note WPM"],
      ["Game loop works", "Hints correct", "Stops on correct guess"],
    ),
    mkDay(
      57,10,3,"Wed","replit","Scoring",
      "Score based on attempts",
      "Khan Academy: pattern puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Add an attempts counter",
        "Print attempts when the player wins",
        "Add a simple score: 100 - (attempts * 10)",
        "Try 2 runs and compare scores",
      ],
      ["Patterns 10 minutes", "Write 2 rules", "Recheck last 2"],
      ["TypingClub: 10 minutes", "Accuracy target: 92%", "Redo 1 weak lesson"],
      ["Attempts counted", "Score calculated", "Can explain the formula"],
    ),
    mkDay(
      58,10,3,"Thu","replit","Difficulty levels",
      "Easy/medium/hard ranges",
      "Khan Academy: logic puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Ask player for difficulty (easy/medium/hard)",
        "Set range: 1–10, 1–50, 1–100",
        "Pick secret number using that range",
        "Test each difficulty once",
      ],
      ["Logic 10 minutes", "Explain 1 solution", "Check answer"],
      ["TypingClub: 10 minutes", "2-minute test if ready", "Note results"],
      ["Difficulty selection works", "Range changes", "Tested all 3 levels"],
    ),
    mkDay(
      59,10,3,"Fri","replit","Input safety",
      "Handle bad input (letters, blanks)",
      "Khan Academy: brain teasers (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Use try/except to catch non-number input",
        "If input is bad, print a friendly message",
        "Keep the game running (don’t crash)",
        "Test with: letters, blank, huge numbers",
      ],
      ["Brain teasers 10 minutes", "Pick 1 hardest", "Explain reasoning"],
      ["TypingClub: 10 minutes", "1-minute test", "Aim for steady accuracy"],
      ["Program doesn’t crash", "Friendly error message", "Tested 3 bad inputs"],
    ),
    mkDay(
      60,10,3,"Sat","replit","Build sprint",
      "Project: Improved guessing game",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub: review",
      "Presentation: explain difficulty design",
      [
        "Polish your game text and add comments",
        "Add replay (y/n)",
        "Add a ‘best score’ for this run (optional)",
        "Demo to a parent and explain how difficulty changes the experience",
      ],
      ["10-minute mixed set", "Retry 2 mistakes", "Say 1 skill improved"],
      ["TypingClub: 10 minutes", "1-minute test", "Compare to Tuesday"],
      ["Game feels complete", "Replay works", "Can explain design choices"],
    ),

    mkDay(
      61,11,3,"Mon","replit","Lists",
      "Store items in a list",
      "Khan Academy: reasoning puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Create a list of items (e.g., backpack = [])",
        "Append 3 items",
        "Print the list",
        "Remove 1 item and print again",
      ],
      ["Reasoning 10 minutes", "Explain 1 answer", "Check work"],
      ["TypingClub: 10 minutes", "Accuracy 90%+", "Slow is fine"],
      ["Understands lists", "Can add/remove items", "Printed list contents"],
    ),
    mkDay(
      62,11,3,"Tue","replit","Inventory",
      "Add/remove items (inventory)",
      "Khan Academy: word logic problems (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Make commands: take, drop, inventory",
        "Use the list to store items",
        "Print helpful messages (e.g., 'You took the key')",
        "Test each command at least once",
      ],
      ["Word logic 10 minutes", "Write down 1 tricky one", "Explain answer"],
      ["TypingClub: 10 minutes", "1-minute test", "Note WPM"],
      ["Inventory commands work", "List updates", "Messages are clear"],
    ),
    mkDay(
      63,11,3,"Wed","replit","Functions",
      "Reusable actions (look, take, move)",
      "Khan Academy: pattern puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Create functions: show_room(), handle_command()",
        "Move repeated code into functions",
        "Call the functions from your main loop",
        "Test: does everything still work?",
      ],
      ["Patterns 10 minutes", "Write 2 rules", "Recheck last 2"],
      ["TypingClub: 10 minutes", "Accuracy target: 92%", "Redo 1 weak lesson"],
      ["Used functions", "Code is shorter/clearer", "Program still works"],
    ),
    mkDay(
      64,11,3,"Thu","replit","Multiple endings",
      "Win/lose paths based on choices",
      "Khan Academy: logic puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Add at least 2 endings (win/lose)",
        "Make endings depend on inventory or choices",
        "Print an ending message",
        "Test both endings",
      ],
      ["Logic 10 minutes", "Explain 1 solution", "Check final answer"],
      ["TypingClub: 10 minutes", "2-minute test if ready", "Note results"],
      ["2 endings exist", "Choices affect outcome", "Tested both endings"],
    ),
    mkDay(
      65,11,3,"Fri","replit","Refactoring",
      "Clean code + comments",
      "Khan Academy: brain teasers (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Rename variables so they make sense",
        "Add 5 helpful comments",
        "Remove duplicate code",
        "Run through a full play-test",
      ],
      ["Brain teasers 10 minutes", "Pick 1 hardest", "Explain reasoning"],
      ["TypingClub: 10 minutes", "1-minute test", "Accuracy first"],
      ["Code reads clearly", "Has comments", "Play-test completed"],
    ),
    mkDay(
      66,11,3,"Sat","replit","Build sprint",
      "Project: Text adventure (chapter 1)",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub: review",
      "Presentation: show choices branching",
      [
        "Write a short story: start → 2 choices → result",
        "Make at least 3 rooms/locations",
        "Use inventory for 1 meaningful decision",
        "Demo to a parent: show two different paths",
      ],
      ["10-minute mixed set", "Retry 2 mistakes", "Say 1 skill improved"],
      ["TypingClub: 10 minutes", "1-minute test", "Stop when tired"],
      ["Chapter 1 playable", "Has branching", "Can explain structure"],
    ),

    mkDay(
      67,12,3,"Mon","replit","Plan capstone",
      "Map story, rooms, inventory, endings",
      "Khan Academy: reasoning puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Draw a quick map of rooms and connections",
        "List 5 items and what they do",
        "Define 2 endings (win/lose) and how to reach them",
        "Write a checklist for the next 4 lessons",
      ],
      ["Reasoning 10 minutes", "Explain 1 answer", "Check work"],
      ["TypingClub: 10 minutes", "Accuracy 90%+", "Slow is fine"],
      ["Capstone plan exists", "Items + endings planned", "Checklist written"],
    ),
    mkDay(
      68,12,3,"Tue","replit","Build section 1",
      "Intro + first choices",
      "Khan Academy: word problems (10 mins)",
      "TypingClub: 10 minutes",
      "Mini-present: progress update",
      [
        "Build intro text and starting room",
        "Add at least 2 choices",
        "Make sure invalid commands get a friendly message",
        "Run a short play-test",
      ],
      ["Word problems 10 minutes", "Show working for 2", "Explain 1"],
      ["TypingClub: 10 minutes", "1-minute test", "Note WPM"],
      ["Intro works", "First choices exist", "Friendly invalid-command handling"],
    ),
    mkDay(
      69,12,3,"Wed","replit","Build section 2",
      "Add random events + score",
      "Khan Academy: pattern puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Add a random event in 1 room (50/50 outcome)",
        "Add a score or 'luck' variable",
        "Make score change based on choices",
        "Test the random event 5 times",
      ],
      ["Patterns 10 minutes", "Write 2 rules", "Recheck last 2"],
      ["TypingClub: 10 minutes", "Accuracy target: 92%", "Redo 1 weak lesson"],
      ["Random event works", "Score updates", "Tested multiple runs"],
    ),
    mkDay(
      70,12,3,"Thu","replit","Build section 3",
      "Add endings + replay option",
      "Khan Academy: logic puzzles (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Implement win ending and lose ending",
        "Add replay (y/n) at the end",
        "Reset inventory/score on replay",
        "Test: reach both endings",
      ],
      ["Logic 10 minutes", "Explain 1 solution", "Check final answer"],
      ["TypingClub: 10 minutes", "2-minute test if ready", "Note results"],
      ["Endings trigger correctly", "Replay works", "Resets happen properly"],
    ),
    mkDay(
      71,12,3,"Fri","replit","Testing + polish",
      "Fix bugs, improve text, clean code",
      "Khan Academy: brain teasers (10 mins)",
      "TypingClub: 10 minutes",
      "",
      [
        "Play-test start → ending and write down 3 issues",
        "Fix at least 2 issues",
        "Improve writing: clearer choices, less clutter",
        "Add comments where future-you will thank you",
      ],
      ["Brain teasers 10 minutes", "Pick 1 hardest", "Explain reasoning"],
      ["TypingClub: 10 minutes", "1-minute test", "Accuracy first"],
      ["2 issues fixed", "Text reads clearly", "Code is tidy"],
    ),
    mkDay(
      72,12,3,"Sat","replit","Demo day",
      "Capstone: full text adventure demo",
      "Khan Academy: quick mixed puzzles (10 mins)",
      "TypingClub final check-in",
      "Optional: share with family/friends",
      [
        "Do a full run, then a different run",
        "Ask someone to try it and watch where they get stuck",
        "Write 3 improvements you’d make next week",
        "Celebrate: you built a whole program!",
      ],
      ["10-minute mixed set", "Retry 2 mistakes", "Say 1 skill you improved"],
      ["TypingClub: 10 minutes", "Final 1-minute test", "Compare to Phase 1"],
      ["Capstone demo works", "Has feedback + next steps", "Typing progress recorded"],
    ),
  ];

  function buildCurriculum(track) {
    const isFoundation = track === "foundation";

    return baseDays.map(d => {
      const nd = { ...d };

      if (isFoundation) {
        nd.mainTopic = nd.mainTopic
          .replace("Lua variables", "Lua basics (variables)")
          .replace("Refactoring", "Clean-up day")
          .replace("Leaderboard", "High score board");

        nd.buildTask = nd.buildTask
          .replace("Build base game loop", "Make the game work (1 simple loop)")
          .replace("Handle bad input (letters, blanks)", "If input is wrong, show a friendly message")
          .replace("Enemy follows player (simple chase)", "Make an enemy move slowly towards the player")
          .replace("Project: Economy + power-ups", "Project: Coins + 1 power-up")
          .replace("Project: Text adventure (chapter 1)", "Project: Text adventure (short chapter 1)");

        nd.logicTask = nd.logicTask
          .replace("Multi-step", "Short multi-step")
          .replace("Reasoning puzzles", "Reasoning puzzles (short)")
          .replace("Brain teasers", "Brain teasers (easy/medium)");

        nd.typingTask = nd.typingTask
          .replace("target 35 wpm", "steady practice")
          .replace("target 40 wpm", "steady practice")
          .replace("target 45–50 wpm", "steady practice");

        nd.notes = (nd.notes ? nd.notes + " • " : "") +
          "Foundation tip: copy it, then customise 1 thing.";
      } else {
        const stretch =
          d.num % 6 === 0 ? "Builder bonus: add 1 extra feature." :
          d.dow === "Fri" ? "Builder bonus: write 2 bugs you fixed." :
          d.dow === "Tue" ? "Builder bonus: explain your choices." :
          "Builder bonus: try 1 improvement without a tutorial.";

        nd.notes = (nd.notes ? nd.notes + " • " : "") + stretch;
      }

      return nd;
    });
  }

  const curricula = {
    foundation: { id: "foundation", name: "Foundation (Year 3–4)", days: buildCurriculum("foundation") },
    builder: { id: "builder", name: "Builder (Year 5–6)", days: buildCurriculum("builder") },
  };

  function trackFromYearGroup(yearGroup) {
    const yg = Number(yearGroup);
    if (yg === 3 || yg === 4) return "foundation";
    return "builder";
  }

  // ---------- profiles ----------
  function loadProfiles() {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
  }
  function saveProfiles(profiles) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }

  // No default profile: user must create profiles explicitly.
  function ensureDefaultProfile() { /* intentionally empty */ }

  function migrateProfilesIfNeeded() {
    const profiles = loadProfiles();
    let changed = false;

    for (const p of profiles) {
      if (p.yearGroup == null) { p.yearGroup = 5; changed = true; }
      if (!p.track) { p.track = trackFromYearGroup(p.yearGroup); changed = true; }
      const should = trackFromYearGroup(p.yearGroup);
      if (p.track !== should && (p.track !== "foundation" && p.track !== "builder")) {
        p.track = should;
        changed = true;
      }
    }

    if (changed) saveProfiles(profiles);
  }

  function getProfiles() {
    migrateProfilesIfNeeded();
    return loadProfiles();
  }

  function getProfileById(id) {
    return getProfiles().find(p => p.id === id) || null;
  }

  function getActiveProfileId() {
    migrateProfilesIfNeeded();
    const profiles = loadProfiles();
    if (!profiles.length) return null;
    const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (saved && profiles.some(p => p.id === saved)) return saved;
    return profiles[0].id;
  }

  function getActiveProfile() {
    const id = getActiveProfileId();
    return id ? getProfileById(id) : null;
  }

  function setActiveProfile(id) {
    const p = getProfileById(id);
    if (!p) { alert("Profile not found."); return; }
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  }

  function createProfile({ name, yearGroup, startDate }) {
    migrateProfilesIfNeeded();

    const yg = Number(yearGroup);
    const track = trackFromYearGroup(yg);
    const profiles = loadProfiles();
    const id = cryptoId();

    profiles.push({
      id,
      name: name.trim(),
      yearGroup: yg,
      track,
      startDate: (startDate || "").trim(),
    });

    saveProfiles(profiles);
    localStorage.setItem(stateKey(id), JSON.stringify({}));
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  }

  function updateProfile(id, patch) {
    const profiles = loadProfiles();
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) return;

    const next = { ...profiles[idx], ...patch };
    if (patch.yearGroup != null) next.track = trackFromYearGroup(patch.yearGroup);

    profiles[idx] = next;
    saveProfiles(profiles);
  }

  function deleteProfile(id) {
    const profiles = loadProfiles();
    const ok = confirm("Delete this profile and all its ticks on this device?");
    if (!ok) return;

    const next = profiles.filter(p => p.id !== id);
    saveProfiles(next);
    localStorage.removeItem(stateKey(id));

    const active = getActiveProfileId();
    if (active === id) {
      if (next.length) localStorage.setItem(ACTIVE_PROFILE_KEY, next[0].id);
      else localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
  }

  // ---------- curriculum selection ----------
  function getActiveCurriculum() {
    const p = getActiveProfile();
    const track = p?.track || trackFromYearGroup(p?.yearGroup || 5);
    return curricula[track] || curricula.builder;
  }

  function getDays(profileId) {
    const p = profileId ? getProfileById(profileId) : getActiveProfile();
    const track = p?.track || trackFromYearGroup(p?.yearGroup || 5);
    // Backwards/forwards compatible alias: internally we used "month" but the UI calls it "phase".
    // We expose both properties so older saved data and newer content can coexist safely.
    return (curricula[track] || curricula.builder).days.map(d => ({
      ...d,
      phase: (d.phase ?? d.month)
    }));
  }

  function phaseOf(day) {
    return (day && (day.phase ?? day.month)) || 0;
  }

  // ---------- state per profile ----------
  function loadState(profileId) {
    migrateProfilesIfNeeded();
    const pid = profileId || getActiveProfileId();
    if (!pid) return {};
    return JSON.parse(localStorage.getItem(stateKey(pid)) || "{}");
  }

  function saveState(profileId, st) {
    const pid = profileId || getActiveProfileId();
    if (!pid) return;
    localStorage.setItem(stateKey(pid), JSON.stringify(st));
  }

  function setChecked(dayNum, key, val, profileId) {
    const st = loadState(profileId);
    st[dayNum] = st[dayNum] || {};
    st[dayNum][key] = !!val;
    saveState(profileId, st);
  }

  function isChecked(dayNum, key, profileId) {
    const st = loadState(profileId);
    return !!(st[dayNum] && st[dayNum][key]);
  }

  function dayIsComplete(dayNum, profileId) {
    return ["main", "logic", "typing", "present"].every(k => isChecked(dayNum, k, profileId));
  }

  // ---------- start date mapping ----------
  function getStartDate(profileId) {
    const p = profileId ? getProfileById(profileId) : getActiveProfile();
    if (!p || !p.startDate) return null;
    const d = new Date(p.startDate + "T00:00:00");
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function planDayForDate(dateObj, profileId) {
    const start = getStartDate(profileId);
    if (!start) return null;

    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);
    if (d < start) return null;

    let cur = new Date(start);
    let count = 0;

    while (cur <= d) {
      if (cur.getDay() !== 0) count++; // skip Sundays
      cur.setDate(cur.getDate() + 1);
      if (count > 400) break;
    }

    if (d.getDay() === 0) return null;
    if (count < 1 || count > 72) return null;
    return count;
  }

  // ---------- progress ----------
  function computeOverallProgress(profileId) {
    const days = getDays(profileId);
    const totalDays = days.length;
    const completeDays = days.filter(d => dayIsComplete(d.num, profileId)).length;
    const pct = Math.round((completeDays / totalDays) * 100);
    return { totalDays, completeDays, pct };
  }

  function computeMonthProgress(month, profileId) {
    const days = getDays(profileId);
    const monthDays = days.filter(d => phaseOf(d) === month);
    const total = monthDays.length;
    const complete = monthDays.filter(d => dayIsComplete(d.num, profileId)).length;
    const pct = Math.round((complete / total) * 100);
    return { total, complete, pct };
  }

  function nextIncompleteDay(profileId) {
    const days = getDays(profileId);
    return days.find(x => !dayIsComplete(x.num, profileId)) || null;
  }

  function computeStreak(profileId) {
    const days = getDays(profileId);
    const start = getStartDate(profileId);

    if (!start) {
      let i = days.length - 1;
      while (i >= 0 && !dayIsComplete(days[i].num, profileId)) i--;
      if (i < 0) return 0;
      let streak = 0;
      while (i >= 0 && dayIsComplete(days[i].num, profileId)) { streak++; i--; }
      return streak;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cursor = new Date(today);
    let dayNum = planDayForDate(cursor, profileId);

    while (dayNum === null && cursor >= start) {
      cursor.setDate(cursor.getDate() - 1);
      dayNum = planDayForDate(cursor, profileId);
      if ((today - cursor) > 1000 * 60 * 60 * 24 * 500) break;
    }
    if (dayNum === null) return 0;

    let streak = 0;
    while (dayNum >= 1 && dayIsComplete(dayNum, profileId)) {
      streak++;
      dayNum--;
    }
    return streak;
  }

  // ---------- rendering: day cards ----------
  function linkFor(key) {
    const p = platforms[key];
    return `<a href="${p.url}" target="_blank" rel="noreferrer">${esc(p.name)}</a>`;
  }

  function renderCheck(dayNum, key, label, profileId) {
    const id = `c-${profileId}-${dayNum}-${key}`;
    return `
      <label class="check" for="${id}">
        <input id="${id}" type="checkbox" data-day="${dayNum}" data-key="${key}" ${isChecked(dayNum, key, profileId) ? "checked" : ""} />
        ${esc(label)}
      </label>
    `;
  }

  function renderBulletList(items) {
    if (!items || !Array.isArray(items) || items.length === 0) return "";
    return `<ul class="taskList">${items.map(it => `<li>${esc(it)}</li>`).join("")}</ul>`;
  }

  function renderDayCard(d, profileId, { expandedDefault = false } = {}) {
    const done = dayIsComplete(d.num, profileId);
    const statusClass = done ? "kidTag kidTag--done" : "kidTag";
    const detailsOpen = expandedDefault ? " open" : "";

    return `
      <article class="dayCard" id="day-${d.num}">
        <div class="dayCard__top">
          <div class="stack gap8">
            <h3 class="dayTitle">Lesson ${d.num} — ${esc(d.dow)}</h3>
            <div class="dayMeta">Week ${d.week} • Phase ${phaseOf(d)} • Main: ${esc(platforms[d.mainKey].name)}</div>
            ${d.notes ? `<div class="dayMeta">${esc(d.notes)}</div>` : ""}
          </div>
          <div class="${statusClass}">${done ? "🏅 Completed" : "In progress"}</div>
        </div>

        <div class="dayGrid">
          <div class="task">
            <div class="task__k">Main platform</div>
            <div class="task__v">
              ${linkFor(d.mainKey)}: <strong>${esc(d.mainTopic)}</strong>
              <div class="muted small" style="margin-top:6px">Task: ${esc(d.buildTask)}</div>
              ${d.buildSteps ? renderBulletList(d.buildSteps) : ""}
            </div>
          </div>
          <div class="task">
            <div class="task__k">Logic</div>
            <div class="task__v">
              ${linkFor("logic")}
              <div class="muted small" style="margin-top:6px">Task: ${esc(d.logicTask)}</div>
              ${d.logicSteps ? renderBulletList(d.logicSteps) : ""}
            </div>
          </div>
          <div class="task">
            <div class="task__k">Typing</div>
            <div class="task__v">
              ${linkFor("typing")}
              <div class="muted small" style="margin-top:6px">Task: ${esc(d.typingTask)}</div>
              ${d.typingSteps ? renderBulletList(d.typingSteps) : ""}
            </div>
          </div>
          <div class="task">
            <div class="task__k">Outcomes</div>
            <div class="task__v">
              ${d.outcomes ? renderBulletList(d.outcomes) : "<div class=\"muted\">Finish a small version first, then upgrade it.</div>"}
            </div>
          </div>
        </div>

        <div class="checkRow" data-day="${d.num}">
          ${renderCheck(d.num, "main", "Main done", profileId)}
          ${renderCheck(d.num, "logic", "Logic done", profileId)}
          ${renderCheck(d.num, "typing", "Typing done", profileId)}
          ${renderCheck(d.num, "present", "Presented / explained", profileId)}
        </div>

        <details class="dayDetails"${detailsOpen}>
          <summary>What counts as “Presented / explained”?</summary>
          <div class="muted small">60 seconds: “Here’s what I built, what broke, and what I fixed.”</div>
        </details>
      </article>
    `;
  }

  function wireCheckboxes(container, profileId) {
    container.querySelectorAll('input[type="checkbox"][data-day][data-key]').forEach(cb => {
      cb.addEventListener("change", (e) => {
        const dayNum = Number(e.target.getAttribute("data-day"));
        const key = e.target.getAttribute("data-key");
        setChecked(dayNum, key, e.target.checked, profileId);

        const card = document.getElementById(`day-${dayNum}`);
        if (card) {
          const tag = card.querySelector(".kidTag");
          const done = dayIsComplete(dayNum, profileId);
          if (tag) {
            tag.classList.toggle("kidTag--done", done);
            tag.textContent = done ? "🏅 Completed" : "In progress";
          }
        }
      });
    });
  }

  // ---------- page renderers ----------
  function renderMonthPage(opts) {
    // Allow a no-arg call: auto-detect the current Journey page.
    if (!opts) {
      const file = (location.pathname || "").split("/").pop()?.toLowerCase() || "";
      const phase = file.includes("phase1") || file.includes("month1") ? 1 :
                    file.includes("phase2") || file.includes("month2") ? 2 :
                    file.includes("phase3") || file.includes("month3") ? 3 : null;
      if (!phase) return;
      opts = {
        month: phase,
        dayListId: "dayList",
        searchInputId: "search",
        progressTextId: "mProgressText",
        progressBarId: "mProgressBar",
        streakId: "mStreak",
        jumpBtnId: "jumpToday",
        expandBtnId: "expandAll",
        collapseBtnId: "collapseAll",
        headerTrackId: "trackLine"
      };
    }

    const {
      month, dayListId, searchInputId,
      progressTextId, progressBarId, streakId,
      jumpBtnId, expandBtnId, collapseBtnId,
      headerTrackId
    } = opts;

    const profileId = getActiveProfileId();
    const profile = getActiveProfile();
    const curriculum = getActiveCurriculum();
    const days = getDays(profileId);

    const mount = document.getElementById(dayListId);
    const search = document.getElementById(searchInputId);

    // No profile yet → show a friendly call-to-action instead of breaking pages.
    if (!profileId || !profile) {
      if (headerTrackId) {
        const el = document.getElementById(headerTrackId);
        if (el) el.textContent = "Create a child profile to begin";
      }
      if (mount) {
        mount.innerHTML = `
          <div class="card card--soft stack">
            <h2 class="h2">No active child profile</h2>
            <p class="muted">Create a child profile first, then come back to start ticking off lessons.</p>
            <div class="ctaRow">
              <a class="btn btn--primary" href="./profiles.html">Create a profile</a>
              <a class="btn" href="./tracks.html">View tracks</a>
            </div>
          </div>
        `;
      }
      if (search) search.disabled = true;
      if (progressTextId) document.getElementById(progressTextId).textContent = "—";
      if (progressBarId) document.getElementById(progressBarId).style.width = "0%";
      if (streakId) document.getElementById(streakId).textContent = "0";
      return;
    }

    if (headerTrackId) {
      const el = document.getElementById(headerTrackId);
      if (el) el.textContent = `${curriculum.name} • Year ${profile.yearGroup}`;
    }

    function draw(expandedDefault = false) {
      const q = (search?.value || "").trim().toLowerCase();

      const monthDays = days
        .filter(d => phaseOf(d) === month)
        .filter(d => {
          if (!q) return true;
          const extra = [
            ...(Array.isArray(d.buildSteps) ? d.buildSteps : []),
            ...(Array.isArray(d.logicSteps) ? d.logicSteps : []),
            ...(Array.isArray(d.typingSteps) ? d.typingSteps : []),
            ...(Array.isArray(d.outcomes) ? d.outcomes : []),
          ].join(" ");
          const hay = `${d.mainTopic} ${d.buildTask} ${d.logicTask} ${d.typingTask} ${d.notes} ${extra}`.toLowerCase();
          return hay.includes(q);
        });

      mount.innerHTML = monthDays.map(d => renderDayCard(d, profileId, { expandedDefault })).join("");
      wireCheckboxes(mount, profileId);

      const mp = computeMonthProgress(month, profileId);
      document.getElementById(progressTextId).textContent = `${mp.complete} / ${mp.total} lessons`;
      document.getElementById(progressBarId).style.width = `${mp.pct}%`;
      document.getElementById(streakId).textContent = computeStreak(profileId);
    }

    draw(false);

    if (search) search.addEventListener("input", () => draw(false));

    document.getElementById(jumpBtnId)?.addEventListener("click", () => {
      const next = nextIncompleteDay(profileId);
      if (!next) return;

      const nextPhase = phaseOf(next);
      if (nextPhase !== month) {
        const target = nextPhase === 1 ? "./phase1.html" : nextPhase === 2 ? "./phase2.html" : "./phase3.html";
        window.location.href = `${target}#day-${next.num}`;
        return;
      }

      window.location.hash = `day-${next.num}`;
      document.getElementById(`day-${next.num}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById(expandBtnId)?.addEventListener("click", () => draw(true));
    document.getElementById(collapseBtnId)?.addEventListener("click", () => draw(false));
  }

  function renderPrintPage({ mountId } = {}) {
    const mid = mountId || "printList";
    const mount = document.getElementById(mid);
    const meta = document.getElementById("printMeta");

    // Not on print page (or mount missing)
    if (!mount) return;

    try {
      const profiles = getProfiles();
      const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
      const hasSaved = !!(saved && profiles.some(p => p.id === saved));
      const profileId = hasSaved ? saved : null;

      if (!profiles.length) {
        // No profiles at all
        mount.innerHTML = `
          <section class="card card--soft stack">
            <h2 class="h2">Please create at least one child profile to use this feature</h2>
            <p class="muted">Printable Plans are generated from a child profile’s track and progress.</p>
            <div class="ctaRow">
              <a class="btn btn--primary" href="./profiles.html">Create a profile</a>
              <a class="btn" href="./tracks.html">View tracks</a>
            </div>
          </section>
        `;
        if (meta) meta.textContent = "—";
        return;
      }

      if (!profileId) {
        // Profiles exist, but none has been explicitly selected as "active".
        mount.innerHTML = `
          <section class="card card--soft stack">
            <h2 class="h2">No active profile selected; please select a child profile to print</h2>
            <p class="muted">Go to Profiles and pick a child, then come back to print their plan.</p>
            <div class="ctaRow">
              <a class="btn btn--primary" href="./profiles.html">Select a child profile</a>
              <a class="btn" href="./tracks.html">View tracks</a>
            </div>
          </section>
        `;
        if (meta) meta.textContent = "—";
        return;
      }

      const days = getDays(profileId);

      const p = getActiveProfile();
      const cur = getActiveCurriculum();
      if (meta) {
        meta.textContent = `${p?.name || ""} • ${cur?.name || ""} • Start: ${p?.startDate ? fmtDate(p.startDate) : "Not set"}`.trim();
      }

      const phaseName = (m) => m === 1 ? "Phase 1 — Scratch" : m === 2 ? "Phase 2 — Roblox Studio" : "Phase 3 — Python";

      // Group as Phase → Week for a cleaner printout.
      const phases = [1, 2, 3].map(phase => {
        const phaseDays = days.filter(d => phaseOf(d) === phase);
        const weeks = Array.from(new Set(phaseDays.map(d => d.week))).sort((a, b) => a - b);

        const weekBlocks = weeks.map(week => {
          const label = weekLabel(week, profileId);
          const wp = weekProgress(week, profileId);
          const rows = phaseDays
            .filter(d => d.week === week)
            .sort((a, b) => a.num - b.num)
            .map(d => {
              const done = dayIsComplete(d.num, profileId);
              return `
                <tr class="printRow">
                  <td class="printChk">${done ? "☑" : "☐"}</td>
                  <td class="printLesson">
                    <div class="printLesson__t">Lesson ${d.num} • ${esc(d.dow)}</div>
                    <div class="printLesson__m muted small">Main: ${esc(platforms[d.mainKey].name)} • ${esc(d.mainTopic)}</div>
                  </td>
                  <td class="printTasks">
                    <div><span class="printK">Build:</span> ${esc(d.buildTask)}</div>
                    <div><span class="printK">Logic:</span> ${esc(d.logicTask)}</div>
                    <div><span class="printK">Typing:</span> ${esc(d.typingTask)}</div>
                  </td>
                </tr>
              `;
            }).join("");

          return `
            <section class="card card--soft printWeek">
              <div class="printWeek__head">
                <div class="printWeek__title">${esc(label)}</div>
                <div class="muted small">${wp.complete}/${wp.total} lessons completed • ${wp.pct}%</div>
              </div>
              <div class="tableWrap">
                <table class="printTable">
                  <thead>
                    <tr>
                      <th class="printChk">Done</th>
                      <th>Lesson</th>
                      <th>Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows}
                  </tbody>
                </table>
              </div>
            </section>
          `;
        }).join("");

        return `
          <section class="stack">
            <h2 class="h2">${phaseName(phase)}</h2>
            ${weekBlocks || `<p class="muted">No lessons in this phase for this child profile.</p>`}
          </section>
        `;
      }).join("");

      mount.innerHTML = `
        <section class="card printTips noPrint">
          <div class="muted">Tip: tick lessons on the main plan pages — this printout will automatically reflect progress.</div>
        </section>
        ${phases}
      `;
    } catch (e) {
      console.error(e);
      mount.innerHTML = `
        <section class="card card--soft stack">
          <h2 class="h2">Printable Plan couldn’t load</h2>
          <p class="muted">Something went wrong while building the print view. Open <a href="./debug.html">debug.html</a> to run checks.</p>
          <div class="ctaRow">
            <a class="btn" href="./profiles.html">Profiles</a>
            <button class="btn btn--soft" type="button" onclick="location.reload()">Reload</button>
          </div>
        </section>
      `;
    }
  }

  // Extra safety: on some mobile browsers + BFCache restores, a page can appear
  // without re-running all scripts exactly as expected. This ensures Print Plan
  // always re-renders when the page is shown.
  function initPrintPage() {
    const f = (location.pathname || "").split("/").pop() || "";
    if (f.toLowerCase() !== "print.html") return;

    const mount = document.getElementById("printList");
    if (!mount) return;

    if (mount.dataset.ytBound === "1") return;
    mount.dataset.ytBound = "1";

    const rerender = () => {
      try { renderPrintPage(); } catch (e) { /* no-op */ }
    };

    // Re-render when returning via back/forward cache
    window.addEventListener("pageshow", rerender);

    // If something prevented the first render, try once more shortly after load.
    setTimeout(() => {
      if (mount.innerHTML.trim() === "") rerender();
    }, 120);
  }

  function weekDateRange(week, profileId) {
    const start = getStartDate(profileId);
    if (!start) return null;

    const offsetPlanDays = (week - 1) * 6;
    let cur = new Date(start);
    let planCount = 0;

    while (planCount < offsetPlanDays) {
      cur.setDate(cur.getDate() + 1);
      if (cur.getDay() !== 0) planCount++;
      if (planCount > 1000) break;
    }

    const weekStart = new Date(cur);

    let end = new Date(weekStart);
    let endCount = 0;
    while (endCount < 5) {
      end.setDate(end.getDate() + 1);
      if (end.getDay() !== 0) endCount++;
      if (endCount > 1000) break;
    }
    return { start: weekStart, end };
  }

  function weekLabel(week, profileId) {
    const pid = profileId || getActiveProfileId();
    const r = weekDateRange(week, pid);
    if (!r) return `Week ${week}`;
    const s = r.start.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const e = r.end.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    return `Week ${week} (${s} – ${e})`;
  }

  function weekProgress(week, profileId) {
    const pid = profileId || getActiveProfileId();
    const days = getDays(pid);
    const weekDays = days.filter(d => d.week === week);
    const total = weekDays.length;
    const complete = weekDays.filter(d => dayIsComplete(d.num, pid)).length;
    const pct = total ? Math.round((complete / total) * 100) : 0;
    return { total, complete, pct, fullyComplete: complete === total };
  }

  function certificateTitleForWeek(week, track) {
    const t = track || "builder";
    const foundationTitles = {
      1: "Scratch Explorer",
      2: "Maze Maker",
      3: "Level Star",
      4: "Scratch Showcase",
      5: "Roblox Builder",
      6: "Script Starter",
      7: "Power-Up Pro",
      8: "Game Publisher",
      9: "Python Beginner",
      10: "Loop Legend",
      11: "Story Builder",
      12: "Champion Coder"
    };
    const builderTitles = {
      1: "Movement Master",
      2: "Rule Builder",
      3: "Level Creator",
      4: "Scratch Showcase Star",
      5: "World Builder",
      6: "Script Starter",
      7: "System Designer",
      8: "Publisher Power",
      9: "Python Beginner Boss",
      10: "Logic Loop Legend",
      11: "Adventure Architect",
      12: "Capstone Champion"
    };
    const map = t === "foundation" ? foundationTitles : builderTitles;
    return map[week] || "Achievement Unlocked";
  }

  function renderCertificateHTML({ week }) {
    const pid = getActiveProfileId();
    if (!pid) {
      return `
        <section class="card card--soft stack">
          <h2 class="h2">No child profile yet</h2>
          <p class="muted">Create a child profile first, then you can generate weekly certificates.</p>
          <div class="ctaRow">
            <a class="btn btn--primary" href="./profiles.html">Create a profile</a>
            <a class="btn" href="./tracks.html">View tracks</a>
          </div>
        </section>
      `;
    }
    const profile = getProfileById(pid);
    const label = weekLabel(week, pid);
    const wp = weekProgress(week, pid);
    const days = getDays(pid);

    const title = certificateTitleForWeek(week, profile?.track);
    const seal = wp.fullyComplete ? "🏆" : (wp.pct >= 50 ? "⭐" : "🚀");
    const kind = wp.fullyComplete ? "Completion Certificate" : "Progress Certificate";
    const msg = wp.fullyComplete
      ? "Completed every day this week — brilliant consistency."
      : "Progress made — keep going and finish strong.";

    const weekDays = days.filter(d => d.week === week);
    const list = weekDays.map(d => {
      const done = dayIsComplete(d.num, pid);
      return `<div class="row row--compact">
        <div>
          <div class="row__title">Lesson ${d.num} — ${esc(d.dow)}</div>
          <div class="row__meta">${esc(platforms[d.mainKey].name)} • ${esc(d.mainTopic)}</div>
        </div>
        <div class="row__meta row__meta--strong">${done ? "✓ Done" : "—"}</div>
      </div>`;
    }).join("");

    return `
      <section class="cert card cert">
        <div class="cert__inner">
          <div class="certGrid">
            <div>
              <div class="muted small">${esc(kind)}</div>
              <h2 class="cert__title">${esc(title)}</h2>
              <div class="certMeta">
                <span class="pill pill--static"><span class="pill__k">Week</span><span class="pill__v">${esc(label)}</span></span>
                <span class="pill pill--static"><span class="pill__k">Progress</span><span class="pill__v">${wp.complete}/${wp.total} lessons (${wp.pct}%)</span></span>
                <span class="pill pill--static"><span class="pill__k">Track</span><span class="pill__v">${esc(profile?.track === "foundation" ? "Foundation" : "Builder")}</span></span>
                <span class="pill pill--static"><span class="pill__k">Year</span><span class="pill__v">${esc(profile?.yearGroup ?? "—")}</span></span>
              </div>
            </div>
            <div class="cert__seal" aria-hidden="true">${seal}</div>
          </div>

          <div class="certLine"></div>

          <div class="grid2">
            <div class="stack">
              <div class="muted small">Awarded to</div>
              <div class="certName">${esc(profile?.name || "—")}</div>
              <div class="muted">${esc(msg)}</div>

              <div class="certFoot">
                <div class="sig">
                  <div class="muted small">Parent / Mentor signature</div>
                  <div class="sigLine"></div>
                </div>
                <div class="sig">
                  <div class="muted small">Date</div>
                  <div class="sigLine"></div>
                </div>
              </div>
            </div>

            <div class="stack">
              <div class="muted small">This week’s checklist</div>
              <div class="stack">${list}</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function suggestWeek() {
    const pid = getActiveProfileId();
    const next = nextIncompleteDay(pid);
    if (!next) return 12;
    return next.week;
  }

  function renderDashboard(ids) {
    const profileId = getActiveProfileId();
    const profile = getActiveProfile();
    const curriculum = getActiveCurriculum();
    const overall = computeOverallProgress(profileId);
    const streak = computeStreak(profileId);
    const next = nextIncompleteDay(profileId);

    if (ids.profileNameId) document.getElementById(ids.profileNameId).textContent = profile?.name || "No profile";
    if (ids.profileMetaId) {
      const meta = profile
        ? `Year ${profile.yearGroup} • Start: ${profile.startDate ? fmtDate(profile.startDate) : "Not set"}`
        : "—";
      document.getElementById(ids.profileMetaId).textContent = meta;
    }

    document.getElementById(ids.overallId).textContent = `${overall.completeDays} / ${overall.totalDays}`;
    document.getElementById(ids.overallBarId).style.width = `${overall.pct}%`;
    document.getElementById(ids.overallPctId).textContent = `${overall.pct}%`;
    document.getElementById(ids.streakId).textContent = streak;

    if (next) {
      document.getElementById(ids.nextId).textContent = `Lesson ${next.num}`;
      const pnum = phaseOf(next);
      const hint = pnum === 1 ? "Scratch building." : pnum === 2 ? "Roblox build + scripting." : "Python projects.";
      document.getElementById(ids.nextHintId).textContent = `Next: Phase ${pnum} • ${hint}`;
    } else {
      document.getElementById(ids.nextId).textContent = "All done 🎉";
      document.getElementById(ids.nextHintId).textContent = "Completed the full plan.";
    }

    const byMonth = document.getElementById(ids.byMonthId);
    byMonth.innerHTML = [1, 2, 3].map(m => {
      const mp = computeMonthProgress(m, profileId);
      const name = m === 1 ? "Phase 1 — Scratch" : m === 2 ? "Phase 2 — Roblox Studio" : "Phase 3 — Python";
      return `
        <div class="row">
          <div>
            <div class="row__title">${name}</div>
            <div class="row__meta">${mp.complete} / ${mp.total} lessons completed</div>
          </div>
          <div class="row__right">
            <div class="bar"><div style="width:${mp.pct}%; height:100%"></div></div>
            <div class="small muted">${mp.pct}%</div>
          </div>
        </div>
      `;
    }).join("");

    const byWeek = document.getElementById(ids.byWeekId);
    byWeek.innerHTML = Array.from({ length: 12 }, (_, i) => i + 1).map(w => {
      const wp = weekProgress(w, profileId);
      const label = weekLabel(w, profileId);
      return `
        <div class="row">
          <div>
            <div class="row__title">${esc(label)}</div>
            <div class="row__meta">${wp.complete} / ${wp.total} lessons completed</div>
          </div>
          <div class="row__right">
            <div class="bar"><div style="width:${wp.pct}%; height:100%"></div></div>
            <div class="small muted">${wp.pct}%</div>
          </div>
        </div>
      `;
    }).join("");
  }

  // ---------- resets ----------
  function resetActiveChildTicks() {
    const pid = getActiveProfileId();
    const ok = confirm("Clear ticks for the active child on this device?");
    if (!ok) return;
    localStorage.setItem(stateKey(pid), JSON.stringify({}));
    window.location.reload();
  }

  
function initProfilesPage() {
  if (!location.pathname.toLowerCase().endsWith("profiles.html")) return;
  // profiles.html contains its own inline UI logic (rendering + create/update/delete).
  // Avoid double-binding the "Create profile" button, which can cause misleading
  // validation alerts even when a profile is created successfully.
  if (window.__USE_INLINE_PROFILES__ === true) return;

  const nameEl = document.getElementById("childName");
  const yearEl = document.getElementById("yearGroup");
  const trackEl = document.getElementById("trackSelect");
  const startEl = document.getElementById("startDate");
  const createBtn = document.getElementById("createProfileBtn");
  const nextMonBtn = document.getElementById("setNextMonBtn");

  if (!createBtn || createBtn.dataset.ytaBound === "1") return;
  createBtn.dataset.ytaBound = "1";

  // Set start to next Monday (robust across desktop/mobile date inputs)
  function setNextMonday() {
    const iso = nextMondayISO();
    if (startEl) {
      startEl.value = iso;
      try { startEl.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {}
      try { startEl.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {}
    }
  }

  if (nextMonBtn) {
    nextMonBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setNextMonday();
    });
  }

  createBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const name = (nameEl?.value || "").trim();
    const year = (yearEl?.value || "").trim();
    const track = (trackEl?.value || "").trim();
    const startDate = (startEl?.value || "").trim();

    if (!name) { alert("Please enter a child name."); nameEl?.focus(); return; }

    // Create and activate profile
    try {
      const prof = createProfile({
        name,
        year,
        track,
        startDate: startDate || null
      });
      setActiveProfile(prof.id);
      // Friendly refresh
      alert("Profile created.");
      location.reload();
    } catch (err) {
      console.error(err);
      alert("Could not create profile. Please try again.");
    }
  });
}

function initFooterYear(){
    const apply = () => {
      const y = String(new Date().getFullYear());
      document.querySelectorAll('[data-yt="year"]').forEach(el => { el.textContent = y; });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", apply, { once: true });
    } else {
      apply();
    }
  }

  // ---------- init ----------
  function init() {
    if (!__inited) {
      __inited = true;
      migrateProfilesIfNeeded();
    }

    // UI wiring (safe to call multiple times; each function guards its bindings)
    retryInitMobileNav();
    initJourneyDropdown();
    initKidModeUI();
    initProfilesPage();
    initCertificatesPage();
    initPrintPage();
    initFooterYear();

    // Enforce Parent lock on protected areas + hide parent-only chrome when locked
    enforceKidModeGuards();

    // Page renderers (guards inside)
    renderMonthPage();
    renderDashboard();
    renderPrintPage();
  }

// If the shared header/nav/footer is injected after this script runs (non-defer pages),
  // run the UI initialisers again once chrome exists.
  document.addEventListener("yta:chrome:ready", () => {
    try {
      retryInitMobileNav();
      initJourneyDropdown();
      initKidModeUI();
      initFooterYear();
    } catch (e) {
      /* no-op */
    }
  });

  // ---------- public API ----------
  return {
    init,
    platforms,
    curricula,

    initKidModeUI,
    setKidMode,
    getKidMode,

    getProfiles,
    getProfileById,
    getActiveProfileId,
    getActiveProfile,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,

    getActiveCurriculum,
    getDays,

    fmtDate,
    nextMondayISO,

    computeOverallProgress,
    computeMonthProgress,
    computeStreak,
    nextIncompleteDay,

    renderMonthPage,
    renderPrintPage,
    renderDashboard,

    weekLabel,
    weekProgress,
    renderCertificateHTML,
    suggestWeek,

    resetActiveChildTicks,
    initCertificatesPage,
    initPrintPage,
    initFooterYear
  };
})();


// AUTO_INIT_YTA: ensure core init runs even on pages without inline bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  try {
    YTA.init();
    YTA.initKidModeUI();
    // If the header/footer are injected after init runs, re-bind nav controls.
    document.addEventListener('yta:chrome:ready', () => {
      try { YTA.init(); } catch (e) { /* no-op */ }
    });
    // Safety: one more bind shortly after load (covers slow JS execution on mobile)
    setTimeout(() => { try { YTA.init(); } catch (e) {} }, 60);
  } catch (e) { /* no-op */ }
});
