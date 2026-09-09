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
    'performance.getEntriesByType("resource").map(e=>new URL(e.name).pathname)',
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
    [],
  );
  assert.ok(
    !first.some((name) =>
      /willow-foliage|ink-stone|mountains-v2|three-pools-/.test(name),
    ),
    "Do not download original-scene assets or code for a forest deep link",
  );
  const painted = first.filter((name) => name.includes("/painted/"));
  assert.equal(painted.length, 4);
  assert.ok(painted.every((name) => name.includes("/bamboo-path/")));
  run("select", "#destination", "wansong");
  waitFor("wansong");
  assert.equal(
    resources().filter((name) => name.includes("/painted/wansong/")).length,
    3,
    "Load only the chosen painting's layers",
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
    assert.ok(original.some((path) => path.endsWith("/" + name)));
  run(
    "eval",
    `(() => {
    window.instanceDisposals = 0;
    window.expectedInstanceDisposals = 0;
    sceneDebug.scene.getObjectByName('three-pools').traverse(object => {
      if (!object.isInstancedMesh) return;
      window.expectedInstanceDisposals++;
      object.addEventListener('dispose', () => window.instanceDisposals++);
    });
  })()`,
  );
  run("select", "#destination", "bamboo-path");
  waitFor("bamboo-path");
  assert.equal(
    resources().filter((name) => name.includes("/painted/bamboo-path/")).length,
    4,
    "Cached revisit must not fetch the painting again",
  );
  run(
    "eval",
    `(() => {
    const nativeFetch = window.fetch;
    window.fetch = (url, options) => {
      if (!String(url).includes('/painted/ruan-islet/')) return nativeFetch(url, options);
      window.slowImageSignal = options.signal;
      return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once:true}));
    };
  })()`,
  );
  run("select", "#destination", "ruan-islet");
  run("wait", "--fn", "Boolean(window.slowImageSignal)");
  run("select", "#destination", "qian-king");
  waitFor("qian-king");
  assert.equal(
    get("window.slowImageSignal.aborted"),
    true,
    "Switching must abort the previous image request",
  );
  run("select", "#destination", "dragon-well");
  waitFor("dragon-well");
  assert.ok(get("window.expectedInstanceDisposals") > 0);
  assert.equal(
    get("window.instanceDisposals"),
    get("window.expectedInstanceDisposals"),
    "Evicting Three Pools must release instanced foliage GPU buffers",
  );
  assert.ok(!run("errors").trim());
  console.log(
    "Per-scene startup, lazy original code/assets, per-scene images, cached revisits and canceled image requests passed.",
  );
} finally {
  run("close");
}
