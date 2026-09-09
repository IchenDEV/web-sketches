const audio = document.querySelector("#background-music");
const button = document.querySelector("#music-toggle");
const volume = document.querySelector("#music-volume");
const status = document.querySelector("#music-status");
let requested = false;
let pending = false;
let revision = 0;

try {
  const saved = localStorage.getItem("west-lake-music-volume");
  if (saved !== null && Number.isFinite(Number(saved)))
    volume.value = Math.max(0, Math.min(100, Number(saved)));
} catch {
  /* Storage can be unavailable in private browsing. */
}
audio.volume = Number(volume.value) / 100;

function render() {
  button.textContent = pending ? "载入琴声…" : requested ? "暂停琴声" : "听琴";
  button.setAttribute("aria-pressed", String(requested));
  button.setAttribute(
    "aria-label",
    requested ? "暂停背景音乐" : "播放背景音乐：古琴《佩兰》",
  );
}
button.addEventListener("click", async () => {
  const current = ++revision;
  requested = !requested;
  pending = requested;
  status.textContent = "";
  render();
  if (!requested) {
    audio.pause();
    return;
  }
  // No audio request until an explicit click; changing scenes never replaces it.
  if (!audio.src)
    audio.src = `${import.meta.env.BASE_URL}assets/audio/pei-lan.mp3`;
  try {
    await audio.play();
    if (current !== revision) return;
    pending = false;
    render();
  } catch {
    if (current !== revision) return;
    requested = pending = false;
    status.textContent = "琴声暂未载入，请点击重试。";
    render();
  }
});
audio.addEventListener("pause", () => {
  if (pending) return;
  requested = false;
  render();
});
audio.addEventListener("error", () => {
  revision++;
  requested = pending = false;
  status.textContent = "琴声暂未载入，请点击重试。";
  audio.removeAttribute("src");
  render();
});
volume.addEventListener("input", () => {
  audio.volume = Number(volume.value) / 100;
  try {
    localStorage.setItem("west-lake-music-volume", volume.value);
  } catch {}
});
render();
