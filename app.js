const YT_MODE_KEY = "yt_parent_unlocked";
const YT_PASS_KEY = "yt_parent_password";

function isParentUnlocked() {
  return localStorage.getItem(YT_MODE_KEY) === "true";
}

function setParentUnlocked(val) {
  localStorage.setItem(YT_MODE_KEY, val ? "true" : "false");
}

function updateModeButton() {
  const btn = document.getElementById("kidModeToggle");
  if (!btn) return;

  if (isParentUnlocked()) {
    btn.textContent = "🧒 Kid";
  } else {
    btn.textContent = "🔒 Parent";
  }
}

function protectParentPages() {
  if (isParentUnlocked()) return;

  const parentOnlyPages = [
    "dashboard.html",
    "profiles.html",
    "tracks.html",
    "print.html",
    "certificates.html"
  ];

  const current = window.location.pathname.split("/").pop();

  if (parentOnlyPages.includes(current)) {
    document.body.innerHTML = `
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        height:100vh;
        flex-direction:column;
        font-family:Inter, sans-serif;
        text-align:center;
      ">
        <h2>🔒 Parent Access</h2>
        <button onclick="unlockParent()">Unlock</button>
        <br/><br/>
        <a href="index.html">Go to Journey</a>
      </div>
    `;
  }
}

function unlockParent() {
  let storedPass = localStorage.getItem(YT_PASS_KEY);

  if (!storedPass) {
    const newPass = prompt("Create Parent Password:");
    if (!newPass) return;
    localStorage.setItem(YT_PASS_KEY, newPass);
    storedPass = newPass;
  }

  const entered = prompt("Enter Parent Password:");
  if (entered === storedPass) {
    setParentUnlocked(true);
    location.reload();
  } else {
    alert("Incorrect password");
  }
}

function toggleMode() {
  if (isParentUnlocked()) {
    setParentUnlocked(false);
    location.reload();
  } else {
    unlockParent();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  protectParentPages();
  updateModeButton();

  const btn = document.getElementById("kidModeToggle");
  if (btn) {
    btn.addEventListener("click", toggleMode);
  }
});