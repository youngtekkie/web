/* FILE: app.js — Track-based (Year 3–6) + multi-child profiles + start date + mobile nav + certificates */

const YTA = (() => {
  let __inited = false;

  // ---------- storage keys ----------
  const PROFILES_KEY = "yta_profiles_v2";
  const ACTIVE_PROFILE_KEY = "yta_active_profile_v2";
  const KIDMODE_KEY = "yta_kidmode_v2";
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

  // ---------- Journey dropdown (details.navDrop) ----------
  // Fix: close the dropdown after selecting a month, and close on outside click/Escape.
  function initJourneyDropdown() {
    const drops = Array.from(document.querySelectorAll("details.navDrop"));
    if (!drops.length) return;

    drops.forEach(d => {
      // prevent double-binding if init() is ever called twice (belt + braces)
      if (d.dataset.ytaBound === "1") return;
      d.dataset.ytaBound = "1";

      // Close when clicking a link inside (Month 1/2/3 etc.)
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
      btn.textContent = locked ? "🔒 Parent" : "🧒 Kid";
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
          <a class="btn btn--soft" href="./month1.html">Go to Journey</a>
        </div>
        <p class="parentLockHint">Tip: on mobile, tap the “🔒 Parent” button in the top bar to unlock.</p>
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
        "Say 1 skill you improved this month",
      ],
      [
        "TypingClub: 1-minute test",
        "Compare to day 1",
        "High-five your keyboard politely",
      ],
      ["Project shared", "Can present clearly", "Typing progress compared"],
    ),

    // Month 2: Roblox (25–48)
    mkDay(25,5,2,"Mon","roblox","Studio basics","Learn interface: Explorer, Properties, parts","Reasoning puzzles","TypingClub"),
    mkDay(26,5,2,"Tue","roblox","Parts + anchoring","Build a simple obby path","Pattern puzzles","TypingClub"),
    mkDay(27,5,2,"Wed","roblox","Terrain tools","Add terrain + obstacles","Word problems","TypingClub"),
    mkDay(28,5,2,"Thu","roblox","Level design","Design full obstacle course layout","Logic puzzles","TypingClub"),
    mkDay(29,5,2,"Fri","roblox","Refinement","Improve spacing, fairness, reset points","Brain teasers","TypingClub"),
    mkDay(30,5,2,"Sat","roblox","Build sprint","Project: Full Obby + checkpoints","Quick mixed puzzles (10 mins)","TypingClub","Presentation: show course flow"),

    mkDay(31,6,2,"Mon","roblox","Lua variables","Create a variable + print output","Reasoning puzzles","TypingClub (target 40 wpm)"),
    mkDay(32,6,2,"Tue","roblox","If statements","Trigger: if player touches → do action","Word logic problems","TypingClub"),
    mkDay(33,6,2,"Wed","roblox","Functions","Make a reusable function for an action","Pattern puzzles","TypingClub"),
    mkDay(34,6,2,"Thu","roblox","Triggers","Door opens when item collected","Logic puzzles","TypingClub"),
    mkDay(35,6,2,"Fri","roblox","Timers","Add countdown / time limit concept","Brain teasers","TypingClub"),
    mkDay(36,6,2,"Sat","roblox","Build sprint","Project: Door unlock system + timer","Quick mixed puzzles (10 mins)","TypingClub","Presentation: show script working"),

    mkDay(37,7,2,"Mon","roblox","Points system","Award points for actions","Reasoning puzzles","TypingClub"),
    mkDay(38,7,2,"Tue","roblox","Currency","Create coin/currency variable","Word problems","TypingClub"),
    mkDay(39,7,2,"Wed","roblox","Shop basics","Simple shop UI concept (buy power-up)","Pattern puzzles","TypingClub"),
    mkDay(40,7,2,"Thu","roblox","Leaderboard","Track best score/time","Logic puzzles","TypingClub"),
    mkDay(41,7,2,"Fri","roblox","Power-ups","Speed boost / jump boost","Brain teasers","TypingClub"),
    mkDay(42,7,2,"Sat","roblox","Build sprint","Project: Economy + power-ups","Quick mixed puzzles (10 mins)","TypingClub","Presentation: explain economy rules"),

    mkDay(43,8,2,"Mon","roblox","Bug fixing","Test and fix issues","Reasoning puzzles","TypingClub"),
    mkDay(44,8,2,"Tue","roblox","UI improvement","Add instructions screen / signage","Word logic problems","TypingClub"),
    mkDay(45,8,2,"Wed","roblox","Polish","Better layout, pacing, visuals","Pattern puzzles","TypingClub"),
    mkDay(46,8,2,"Thu","roblox","Testing","Play-test like a new player","Logic puzzles","TypingClub"),
    mkDay(47,8,2,"Fri","roblox","Final checks","Final bugs + reset systems","Brain teasers","TypingClub"),
    mkDay(48,8,2,"Sat","roblox","Publish day","Publish Roblox game (with supervision)","Quick mixed puzzles (10 mins)","TypingClub","Presentation: ‘What makes my game fun?’"),

    // Month 3: Python (49–72)
    mkDay(49,9,3,"Mon","replit","Print + variables","Hello world + variables","Reasoning puzzles","TypingClub (target 45–50 wpm)"),
    mkDay(50,9,3,"Tue","replit","Input","Ask questions, store answers","Word problems","TypingClub"),
    mkDay(51,9,3,"Wed","replit","If statements","Quiz: correct/incorrect logic","Pattern puzzles","TypingClub"),
    mkDay(52,9,3,"Thu","replit","Loops","Repeat questions / attempts","Logic puzzles","TypingClub"),
    mkDay(53,9,3,"Fri","replit","Mini challenge","5-question quiz with score","Brain teasers","TypingClub"),
    mkDay(54,9,3,"Sat","replit","Build sprint","Project: Interactive Quiz (score + replay)","Quick mixed puzzles (10 mins)","TypingClub","Presentation: demo quiz"),

    mkDay(55,10,3,"Mon","replit","Random","Use random numbers","Reasoning puzzles","TypingClub"),
    mkDay(56,10,3,"Tue","replit","Guess the number","Build base game loop","Word problems","TypingClub"),
    mkDay(57,10,3,"Wed","replit","Scoring","Score based on attempts","Pattern puzzles","TypingClub"),
    mkDay(58,10,3,"Thu","replit","Difficulty levels","Easy/medium/hard ranges","Logic puzzles","TypingClub"),
    mkDay(59,10,3,"Fri","replit","Input safety","Handle bad input (letters, blanks)","Brain teasers","TypingClub"),
    mkDay(60,10,3,"Sat","replit","Build sprint","Project: Improved guessing game","Quick mixed puzzles (10 mins)","TypingClub","Presentation: explain difficulty design"),

    mkDay(61,11,3,"Mon","replit","Lists","Store items in a list","Reasoning puzzles","TypingClub"),
    mkDay(62,11,3,"Tue","replit","Inventory","Add/remove items (inventory)","Word logic problems","TypingClub"),
    mkDay(63,11,3,"Wed","replit","Functions","Reusable actions (look, take, move)","Pattern puzzles","TypingClub"),
    mkDay(64,11,3,"Thu","replit","Multiple endings","Win/lose paths based on choices","Logic puzzles","TypingClub"),
    mkDay(65,11,3,"Fri","replit","Refactoring","Clean code + comments","Brain teasers","TypingClub"),
    mkDay(66,11,3,"Sat","replit","Build sprint","Project: Text adventure (chapter 1)","Quick mixed puzzles (10 mins)","TypingClub","Presentation: show choices branching"),

    mkDay(67,12,3,"Mon","replit","Plan capstone","Map story, rooms, inventory, endings","Reasoning puzzles","TypingClub"),
    mkDay(68,12,3,"Tue","replit","Build section 1","Intro + first choices","Word problems","TypingClub","Mini-present: progress update"),
    mkDay(69,12,3,"Wed","replit","Build section 2","Add random events + score","Pattern puzzles","TypingClub"),
    mkDay(70,12,3,"Thu","replit","Build section 3","Add endings + replay option","Logic puzzles","TypingClub"),
    mkDay(71,12,3,"Fri","replit","Testing + polish","Fix bugs, improve text, clean code","Brain teasers","TypingClub"),
    mkDay(72,12,3,"Sat","replit","Demo day","Capstone: full text adventure demo","Quick mixed puzzles (10 mins)","TypingClub final check-in","Optional: share with family/friends"),
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
    return (curricula[track] || curricula.builder).days;
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
    const monthDays = days.filter(d => d.month === month);
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
            <h3 class="dayTitle">Day ${d.num} — ${esc(d.dow)}</h3>
            <div class="dayMeta">Week ${d.week} • Month ${d.month} • Main: ${esc(platforms[d.mainKey].name)}</div>
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
            <p class="muted">Create a child profile first, then come back to start ticking off days.</p>
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
        .filter(d => d.month === month)
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
      document.getElementById(progressTextId).textContent = `${mp.complete} / ${mp.total} days`;
      document.getElementById(progressBarId).style.width = `${mp.pct}%`;
      document.getElementById(streakId).textContent = computeStreak(profileId);
    }

    draw(false);

    if (search) search.addEventListener("input", () => draw(false));

    document.getElementById(jumpBtnId)?.addEventListener("click", () => {
      const next = nextIncompleteDay(profileId);
      if (!next) return;

      if (next.month !== month) {
        const target = next.month === 1 ? "./month1.html" : next.month === 2 ? "./month2.html" : "./month3.html";
        window.location.href = `${target}#day-${next.num}`;
        return;
      }

      window.location.hash = `day-${next.num}`;
      document.getElementById(`day-${next.num}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById(expandBtnId)?.addEventListener("click", () => draw(true));
    document.getElementById(collapseBtnId)?.addEventListener("click", () => draw(false));
  }

  function renderPrintPage({ mountId }) {
    const profileId = getActiveProfileId();
    const days = getDays(profileId);
    const mount = document.getElementById(mountId);

    if (!profileId) {
      mount.innerHTML = `
        <section class="card card--soft stack">
          <h2 class="h2">No child profile yet</h2>
          <p class="muted">Create a profile first so the print view matches your child’s year group.</p>
          <div class="ctaRow">
            <a class="btn btn--primary" href="./profiles.html">Create a profile</a>
            <a class="btn" href="./tracks.html">View tracks</a>
          </div>
        </section>
      `;
      return;
    }

    mount.innerHTML = days.map(d => `
      <article class="card dayCard">
        <h3 class="dayTitle">Day ${d.num} — ${esc(d.dow)} (Week ${d.week}, Month ${d.month})</h3>
        <div class="muted small">Main: ${esc(platforms[d.mainKey].name)} • Topic: ${esc(d.mainTopic)}</div>
        <div class="dayGrid">
          <div class="task"><div class="task__k">Main task</div><div class="task__v">${esc(d.buildTask)}</div></div>
          <div class="task"><div class="task__k">Logic</div><div class="task__v">${esc(d.logicTask)}</div></div>
          <div class="task"><div class="task__k">Typing</div><div class="task__v">${esc(d.typingTask)}</div></div>
          <div class="task"><div class="task__k">Completed?</div><div class="task__v">${dayIsComplete(d.num, profileId) ? "Yes ✓" : "No"}</div></div>
        </div>
      </article>
    `).join("");
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
    const pct = Math.round((complete / total) * 100);
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
          <div class="row__title">Day ${d.num} — ${esc(d.dow)}</div>
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
                <span class="pill pill--static"><span class="pill__k">Progress</span><span class="pill__v">${wp.complete}/${wp.total} days (${wp.pct}%)</span></span>
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
      document.getElementById(ids.nextId).textContent = `Day ${next.num}`;
      const hint = next.month === 1 ? "Scratch building." : next.month === 2 ? "Roblox build + scripting." : "Python projects.";
      document.getElementById(ids.nextHintId).textContent = `Next: Month ${next.month} • ${hint}`;
    } else {
      document.getElementById(ids.nextId).textContent = "All done 🎉";
      document.getElementById(ids.nextHintId).textContent = "Completed the full plan.";
    }

    const byMonth = document.getElementById(ids.byMonthId);
    byMonth.innerHTML = [1, 2, 3].map(m => {
      const mp = computeMonthProgress(m, profileId);
      const name = m === 1 ? "Month 1 — Scratch" : m === 2 ? "Month 2 — Roblox Studio" : "Month 3 — Python";
      return `
        <div class="row">
          <div>
            <div class="row__title">${name}</div>
            <div class="row__meta">${mp.complete} / ${mp.total} days completed</div>
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
            <div class="row__meta">${wp.complete} / ${wp.total} days completed</div>
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
    initMobileNav();
    initJourneyDropdown();
    initKidModeUI();
    initProfilesPage();
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
      initMobileNav();
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
