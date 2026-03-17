if (window.lucide && typeof window.lucide.createIcons === "function") {
  window.lucide.createIcons();
}

const ROOM_KEY = "bookshelf";
window.APP_ROOM_KEY = ROOM_KEY;

const panelToolbar = document.getElementById("toolbarPanel");
const panelSliders = document.getElementById("paramsPanel");
const panelChat = document.getElementById("chatPanel");

function togglePanel(el) {
  if (!el) return;
  el.classList.toggle("hidden");
  setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
}

const btnToggleToolbar = document.getElementById("btnToggleToolbar");
const btnToggleParams = document.getElementById("btnToggleParams");
const btnToggleChat = document.getElementById("btnToggleChat");
const btnBack = document.getElementById("btnBack");

if (btnToggleToolbar) btnToggleToolbar.onclick = () => togglePanel(panelToolbar);
if (btnToggleParams) btnToggleParams.onclick = () => togglePanel(panelSliders);
if (btnToggleChat) btnToggleChat.onclick = () => togglePanel(panelChat);

window.addEventListener("keydown", (e) => {
  const tag = e.target?.tagName;
  if (tag === "TEXTAREA" || tag === "INPUT") return;

  if (e.key === "1") togglePanel(panelToolbar);
  if (e.key === "2") togglePanel(panelSliders);
  if (e.key === "3") togglePanel(panelChat);
});

if (btnBack) {
  btnBack.onclick = () => {
    window.location.href = "../index.html";
  };
}

await import("./three.js");