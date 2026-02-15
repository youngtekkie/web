/* FILE: app.js — Track-based (Year 3–6) + multi-child profiles + start date + mobile nav + certificates */

const YTA = (() => {
  let __inited = false;
  let __kidBound = false;
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

      // robust scroll-lock (no iOS jump on close)
      document.body.classList.add("noScroll");
      document.body.style.top = `-${scrollY}px`;

      ui.drawerOpen = true;
      saveUI(ui);
    }

    function close() {
      drawer.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      setExpanded(false);

      document.body.classList.remove("noScroll");
      const top = document.body.style.top;
      document.body.style.top = "";
      const restore = top ? Math.abs(parseInt(top, 10)) : scrollY;
      window.scrollTo(0, restore);

      ui.drawerOpen = false;
      saveUI(ui);
    }

    navBtns.forEach(btn => btn.addEventListener("click", () => {
      const isOpen = drawer.classList.contains("is-open");
      isOpen ? close() : open();
    }));

    backdrop.addEventListener("click", close);
    drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    // optional: persist open state across accidental reloads
    if (ui.drawerOpen) {
      // don’t force-open if desktop
      if (window.matchMedia("(max-width: 899px)").matches) open();
      else ui.drawerOpen = false, saveUI(ui);
    }
  }

  // ---------- kid mode ----------
  function getKidMode() { return localStorage.getItem(KIDMODE_KEY) === "1"; }
  function setKidMode(on) {
    localStorage.setItem(KIDMODE_KEY, on ? "1" : "0");
    document.body.classList.toggle("kidmode", on);
  }
  function initKidModeUI() {
    document.body.classList.toggle("kidmode", getKidMode());
    const btn = document.getElementById("kidModeToggle");
    if (!btn) return;

    // prevent duplicate listeners if pages call this more than once
    if (btn.dataset.ytaBound === "1") {
      // still ensure label is correct
      const onNow = getKidMode();
      btn.setAttribute("aria-pressed", onNow ? "true" : "false");
      btn.textContent = `Kid Mode: ${onNow ? "On" : "Off"}`;
      return;
    }
    btn.dataset.ytaBound = "1";

    const on = getKidMode();
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = `Kid Mode: ${on ? "On" : "Off"}`;

    btn.addEventListener("click", () => {
      const now = !getKidMode();
      setKidMode(now);
      btn.setAttribute("aria-pressed", now ? "true" : "false");
      btn.textContent = `Kid Mode: ${now ? "On" : "Off"}`;
    });
  }


  // ---------- curriculum ----------
  function mkDay(num, week, month, dow, mainKey, mainTopic, buildTask, logicTask, typingTask, notes = "") {
    return { num, week, month, dow, mainKey, mainTopic, buildTask, logicTask, typingTask, notes };
  }

  // Base plan (builder-ish). We’ll derive Foundation (Y3–4) and Builder (Y5–6) from it.
  const baseDays = [
    // Month 1: Scratch (1–24)
    mkDay(1,1,1,"Mon","scratch","Scratch basics + motion","Move sprite with arrow keys","Multi-step word problems","TypingClub lessons 1–5"),
    mkDay(2,1,1,"Tue","scratch","Loops","Continuous movement + bounce off edges","Pattern puzzles","Continue lessons"),
    mkDay(3,1,1,"Wed","scratch","Variables","Create a score counter","Arithmetic reasoning","Accuracy focus"),
    mkDay(4,1,1,"Thu","scratch","Random numbers","Falling objects spawn randomly","Time problems","1-minute speed test"),
    mkDay(5,1,1,"Fri","scratch","Lives + Game Over","Lose condition when lives reach zero","Brain teasers","Timed test"),
    mkDay(6,1,1,"Sat","scratch","Build sprint","Project: Catch Game (score, lives, increasing speed)","Quick mixed puzzles (10 mins)","TypingClub quick review","Presentation: explain how it works"),

    mkDay(7,2,1,"Mon","scratch","If statements","Maze basics (walls + movement rules)","Fractions reasoning","TypingClub"),
    mkDay(8,2,1,"Tue","scratch","Timer variable","Countdown challenge for maze","Word logic problems","TypingClub","Mini-present: what did you add?"),
    mkDay(9,2,1,"Wed","scratch","Enemy logic","Enemy follows player (simple chase)","Pattern challenge","TypingClub"),
    mkDay(10,2,1,"Thu","scratch","Win conditions + sound","Win/lose screens + sound effects","Multi-step puzzles","TypingClub"),
    mkDay(11,2,1,"Fri","scratch","Debugging day","Break one thing, then fix it","Mixed challenge","TypingClub"),
    mkDay(12,2,1,"Sat","scratch","Build sprint","Project: Maze Escape (timer, enemy, win/lose)","Quick mixed puzzles (10 mins)","TypingClub review","Presentation: show the full game"),

    mkDay(13,3,1,"Mon","scratch","Cloning","Multiple falling objects using clones","Multiplication reasoning","TypingClub (target 35 wpm)"),
    mkDay(14,3,1,"Tue","scratch","Difficulty scaling","Speed increases over time","Logic word problems","TypingClub"),
    mkDay(15,3,1,"Wed","scratch","Levels","Create Level 2 (background switch)","Pattern puzzles","TypingClub"),
    mkDay(16,3,1,"Thu","scratch","Restart system","Restart button / reset variables","Multi-step maths","TypingClub"),
    mkDay(17,3,1,"Fri","scratch","Polish","Animations + sound polish","Brain teasers","TypingClub"),
    mkDay(18,3,1,"Sat","scratch","Build sprint","Project: 2-Level Platformer","Quick mixed puzzles (10 mins)","TypingClub review","Presentation: explain levels + scoring"),

    mkDay(19,4,1,"Mon","scratch","Plan","Plan a final game on paper (goal, rules, scoring)","Reasoning puzzles","TypingClub"),
    mkDay(20,4,1,"Tue","scratch","Build stage 1","Start screen + core movement","Word problems","TypingClub","Mini-present: what’s built so far?"),
    mkDay(21,4,1,"Wed","scratch","Build stage 2","Add scoring + difficulty","Pattern puzzles","TypingClub"),
    mkDay(22,4,1,"Thu","scratch","Build stage 3","Add lives + win/lose states","Logic puzzles","TypingClub"),
    mkDay(23,4,1,"Fri","scratch","Bug fixing + polish","Fix issues + improve visuals/sound","Mixed challenge","TypingClub"),
    mkDay(24,4,1,"Sat","scratch","Demo day","Final Scratch game presentation","Quick mixed puzzles (10 mins)","TypingClub check-in","Optional: share link to family"),

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

  function ensureDefaultProfile() {
    const profiles = loadProfiles();
    if (profiles.length > 0) return;

    const id = cryptoId();
    const def = [{
      id,
      name: "Child 1",
      yearGroup: 5,
      track: "builder",
      startDate: ""
    }];
    saveProfiles(def);
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    localStorage.setItem(stateKey(id), JSON.stringify({}));
  }

  function migrateProfilesIfNeeded() {
    ensureDefaultProfile();
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
    ensureDefaultProfile();
    migrateProfilesIfNeeded();
    return loadProfiles();
  }

  function getProfileById(id) {
    return getProfiles().find(p => p.id === id) || null;
  }

  function getActiveProfileId() {
    ensureDefaultProfile();
    migrateProfilesIfNeeded();
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || getProfiles()[0].id;
  }

  function getActiveProfile() {
    const id = getActiveProfileId();
    return getProfileById(id);
  }

  function setActiveProfile(id) {
    const p = getProfileById(id);
    if (!p) { alert("Profile not found."); return; }
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  }

  function createProfile({ name, yearGroup, startDate }) {
    ensureDefaultProfile();
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
    if (profiles.length <= 1) { alert("You must keep at least one profile."); return; }
    const ok = confirm("Delete this profile and all its ticks on this device?");
    if (!ok) return;

    const next = profiles.filter(p => p.id !== id);
    saveProfiles(next);
    localStorage.removeItem(stateKey(id));

    const active = getActiveProfileId();
    if (active === id) localStorage.setItem(ACTIVE_PROFILE_KEY, next[0].id);
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
    ensureDefaultProfile();
    migrateProfilesIfNeeded();
    const pid = profileId || getActiveProfileId();
    return JSON.parse(localStorage.getItem(stateKey(pid)) || "{}");
  }

  function saveState(profileId, st) {
    const pid = profileId || getActiveProfileId();
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
            <div class="task__v">${linkFor(d.mainKey)} — <strong>${esc(d.mainTopic)}</strong><br><span class="muted">Task:</span> ${esc(d.buildTask)}</div>
          </div>
          <div class="task">
            <div class="task__k">Logic</div>
            <div class="task__v">${linkFor("logic")}<br>${esc(d.logicTask)}</div>
          </div>
          <div class="task">
            <div class="task__k">Typing</div>
            <div class="task__v">${linkFor("typing")}<br>${esc(d.typingTask)}</div>
          </div>
          <div class="task">
            <div class="task__k">Tip</div>
            <div class="task__v">Finish a small version first, then upgrade it.</div>
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
          const hay = `${d.mainTopic} ${d.buildTask} ${d.logicTask} ${d.typingTask} ${d.notes}`.toLowerCase();
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
      const meta = `${curriculum.name} • Year ${profile?.yearGroup ?? "—"} • Start: ${profile?.startDate ? fmtDate(profile.startDate) : "Not set"}`;
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

  // ---------- init ----------
  function init() {
    if (__inited) return;
    __inited = true;
    ensureDefaultProfile();
    migrateProfilesIfNeeded();
    initMobileNav();
    initFooterYear();
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
  try { YTA.init(); YTA.initKidModeUI(); } catch (e) { /* no-op */ }
});
