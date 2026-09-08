// Verify network behavior on a production preview, with agent-browser on PATH.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const run = (...args) =>
  execFileSync("agent-browser", ["--session", "loading-check", ...args], {
    encoding: "utf8",
    timeout: 60000,
  });
const get = (code) =>
  JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`).trim()));
const waitFor = (id) =>
  run(
    "wait",
    "--fn",
    `window.sceneDebug?.destination==='${id}'&&!sceneDebug.loading`,
  );
const resources = () =>
  get(
    'performance.getEntriesByType("resource").map(e=>e.name.split("/").pop())',
  );
try {
  run(
    "open",
    `${process.env.SCENE_URL || "http://127.0.0.1:5183/"}#bamboo-path`,
  );
  waitFor("bamboo-path");
  const first = resources();
  assert.deepEqual(
    first.filter((name) => name.endsWith(".glb")),
    ["bamboo-path.glb"],
  );
  assert.ok(
    !first.some((name) =>
      /willow-foliage|ink-stone|mountains-v2|three-pools-/.test(name),
    ),
    "Do not download original-scene assets or code for a forest deep link",
  );
  run("select", "#destination", "wansong");
  waitFor("wansong");
  assert.equal(
    resources().filter((name) => name === "jiuxi-backdrop.png").length,
    1,
    "Reuse the shared forest backdrop",
  );
  run("select", "#destination", "three-pools");
  waitFor("three-pools");
  const original = resources();
  for (const name of [
    "architecture.glb",
    "willow-trunks.glb",
    "shore-rocks.glb",
    "willow-foliage.png",
  ])
    assert.ok(original.includes(name));
  run("select", "#destination", "bamboo-path");
  waitFor("bamboo-path");
  assert.equal(
    resources().filter((name) => name === "bamboo-path.glb").length,
    1,
    "Cached revisit must not fetch the model again",
  );
  run(
    "eval",
    `(() => {
    const nativeFetch = window.fetch;
    window.fetch = (url, options) => {
      if (!String(url).endsWith('leifeng.glb')) return nativeFetch(url, options);
      window.slowModelSignal = options.signal;
      return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once:true}));
    };
  })()`,
  );
  run("select", "#destination", "leifeng");
  run("wait", "--fn", "Boolean(window.slowModelSignal)");
  run("select", "#destination", "qian-king");
  waitFor("qian-king");
  assert.equal(
    get("window.slowModelSignal.aborted"),
    true,
    "Switching must abort the previous model request",
  );
  assert.ok(!run("errors").trim());
  console.log(
    "Per-scene startup, lazy original code/assets, shared texture reuse, cached revisits and canceled model requests passed.",
  );
} finally {
  run("close");
}
