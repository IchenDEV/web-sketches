// Run against a local preview with agent-browser installed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const run = (...args) =>
  execFileSync("agent-browser", ["--session", "ambience-check", ...args], {
    encoding: "utf8",
    timeout: 60000,
  });
const get = (code) =>
  JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`).trim()));
const wait = (expression) => run("wait", "--fn", expression);
try {
  run("open", `${process.env.SCENE_URL || "http://127.0.0.1:5183/"}#wansong`);
  wait("window.sceneDebug?.destination === 'wansong' && !sceneDebug.loading");
  assert.equal(
    get(
      "performance.getEntriesByType('resource').some(e=>/assets\\/(audio|previews)\\//.test(e.name))",
    ),
    false,
  );
  assert.equal(get("document.querySelector('audio').paused"), true);
  run(
    "eval",
    `(() => {
    const audio = document.querySelector('audio');
    window.normalPlay = audio.play.bind(audio);
    audio.play = () => Promise.reject(new Error('Playback unavailable'));
  })()`,
  );
  run("click", "#music-toggle");
  wait("document.querySelector('#music-status').textContent.includes('重试')");
  assert.equal(
    get("document.querySelector('#music-toggle').getAttribute('aria-pressed')"),
    "false",
  );
  run("eval", "document.querySelector('audio').play = window.normalPlay");
  run("click", "#music-toggle");
  wait(
    "!document.querySelector('audio').paused && document.querySelector('audio').currentTime > .1",
  );
  const before = get("document.querySelector('audio').currentTime");
  run("select", "#destination", "bamboo-path");
  wait("sceneDebug.destination === 'bamboo-path' && !sceneDebug.loading");
  assert.ok(get("document.querySelector('audio').currentTime") >= before);
  run("click", "#music-toggle");
  const paused = get("document.querySelector('audio').currentTime");
  run("wait", "200");
  assert.equal(get("document.querySelector('audio').currentTime"), paused);
  run(
    "eval",
    `(() => {
    const slider = document.querySelector('#music-volume');
    slider.value = '18'; slider.dispatchEvent(new Event('input'));
  })()`,
  );
  assert.equal(get("document.querySelector('audio').volume"), 0.18);
  run("click", "#open-atlas");
  assert.equal(get("document.querySelectorAll('.atlas-grid img').length"), 30);
  wait("document.querySelector('.atlas-grid img').naturalWidth > 0");
  run("click", '[data-destination="fish-harbor"]');
  wait("sceneDebug.destination === 'fish-harbor' && !sceneDebug.loading");
  assert.equal(get("document.querySelector('#atlas').open"), false);
  run("reload");
  wait("window.sceneDebug?.ready");
  assert.equal(get("document.querySelector('audio').paused"), true);
  assert.equal(get("document.querySelector('#music-volume').value"), "18");
  assert.ok(!run("errors").trim());
  console.log(
    "Music opt-in, retry, pause, volume persistence, continuous scene changes and preview selection passed.",
  );
} finally {
  run("close");
}
