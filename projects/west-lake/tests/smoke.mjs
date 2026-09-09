// Run with a local server active: npm test (requires agent-browser on PATH).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const run = (...args) =>
  execFileSync("agent-browser", ["--session", "west-lake-smoke", ...args], {
    encoding: "utf8",
    timeout: 60000,
  });
const evaluate = (code) =>
  JSON.parse(run("eval", `JSON.stringify(${code})`).trim());
const get = (code) => JSON.parse(evaluate(code));
// Sample the lake itself so a moving clock cannot mask a frozen water shader.
const waterPixels = () =>
  get(`(() => {
  const source = sceneDebug.renderer.domElement;
  const sample = document.createElement('canvas');
  sample.width = 256; sample.height = 72;
  const context = sample.getContext('2d', {willReadFrequently: true});
  context.drawImage(source, source.width * .56, source.height * .72,
    source.width * .42, source.height * .20, 0, 0, 256, 72);
  let hash = 2166136261;
  for (const value of context.getImageData(0, 0, 256, 72).data) {
    hash = Math.imul(hash ^ value, 16777619);
  }
  return hash >>> 0;
})()`);
const scratch = mkdtempSync(join(tmpdir(), "west-lake-check-"));
try {
  run("open", process.env.SCENE_URL || "http://localhost:5173");
  run("set", "viewport", "1440", "900");
  run(
    "wait",
    "--fn",
    "window.sceneDebug?.destination === 'three-pools' && sceneDebug.renderer.info.render.triangles > 10000",
  );
  assert.equal(get("sceneDebug.ready"), true);
  assert.ok(get("sceneDebug.renderer.info.render.triangles") > 10000);
  const initial = get("sceneDebug.camera.position.toArray()");
  run("click", "#motion");
  assert.equal(get("sceneDebug.paused"), true);
  const frozen = get("sceneDebug.time");
  const stillWater = waterPixels();
  run(
    "eval",
    "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
  );
  assert.equal(get("sceneDebug.time"), frozen);
  assert.equal(
    waterPixels(),
    stillWater,
    "Paused water must remain visually still",
  );
  run("mouse", "move", "750", "440");
  run("mouse", "down");
  run("mouse", "move", "910", "460");
  run("mouse", "up");
  assert.notDeepEqual(get("sceneDebug.camera.position.toArray()"), initial);
  run("click", "#reset");
  run("wait", "--fn", "Math.abs(sceneDebug.camera.position.x) < 0.01");
  run("download", "#capture", join(scratch, "scene.png"));
  assert.equal(
    readFileSync(join(scratch, "scene.png")).subarray(1, 4).toString(),
    "PNG",
  );
  run("click", "#motion");
  assert.equal(get("sceneDebug.paused"), false);
  const flowingWater = waterPixels();
  run("eval", "new Promise(resolve => setTimeout(resolve, 450))");
  assert.notEqual(
    waterPixels(),
    flowingWater,
    "Water must move after resuming",
  );
  const ids = ["three-pools", "fish-harbor", "broken-bridge", "nine-creeks"];
  const switchTo = (id) => {
    run("select", "#destination", id);
    run(
      "wait",
      "--fn",
      `sceneDebug.destination === '${id}' && getComputedStyle(document.querySelector("#loading")).opacity === "0"`,
    );
    assert.deepEqual(
      get(
        `sceneDebug.scene.children.filter(o => ${JSON.stringify(ids)}.includes(o.name) && o.visible).map(o => o.name)`,
      ),
      [id],
    );
    assert.equal(get('document.querySelector("#destination").value'), id);
    assert.equal(get("location.hash"), `#${id}`);
  };
  run("reload");
  run(
    "wait",
    "--fn",
    'window.sceneDebug?.destination === "three-pools" && !sceneDebug.loading',
  );
  const blockedModel = new URL(
    "assets/painted/fish-harbor/background.webp",
    get("location.href"),
  ).href;
  run("network", "route", blockedModel, "--abort");
  run("select", "#destination", "fish-harbor");
  run(
    "wait",
    "--fn",
    'sceneDebug.destination === "three-pools" && !sceneDebug.loading && document.querySelector("#toast").textContent.includes("载入失败")',
  );
  assert.equal(
    get('document.querySelector("#destination").value'),
    "three-pools",
  );
  run("network", "unroute", blockedModel);
  run("console", "--clear");
  run("errors", "--clear");
  for (const id of ids.slice(1)) switchTo(id);
  const cachedGeometryCount = get("sceneDebug.renderer.info.memory.geometries");
  switchTo("fish-harbor");
  switchTo("nine-creeks");
  assert.equal(
    get("sceneDebug.renderer.info.memory.geometries"),
    cachedGeometryCount,
    "Revisits must reuse scene geometry",
  );
  run("back");
  run(
    "wait",
    "--fn",
    'sceneDebug.destination === "fish-harbor" && !sceneDebug.loading',
  );
  run("forward");
  run(
    "wait",
    "--fn",
    'sceneDebug.destination === "nine-creeks" && !sceneDebug.loading',
  );
  run("reload");
  run(
    "wait",
    "--fn",
    'window.sceneDebug?.destination === "nine-creeks" && !sceneDebug.loading',
  );
  assert.equal(get("document.title"), "九溪烟树 · 杭州小景");
  switchTo("broken-bridge");
  assert.equal(get("sceneDebug.controls.enableRotate"), false);
  assert.equal(get("sceneDebug.controls.enablePan"), true);
  run("mouse", "move", "750", "440");
  run("mouse", "down");
  run("mouse", "move", "960", "450");
  run("mouse", "up");
  run("wait", "250");
  assert.ok(Math.abs(get("sceneDebug.camera.position.x")) > 0.1);
  assert.ok(Math.abs(get("sceneDebug.camera.position.y")) < 0.001);
  run("click", "#reset");
  assert.ok(Math.abs(get("sceneDebug.camera.position.x")) < 0.001);
  run("set", "viewport", "390", "844");
  assert.equal(get("document.documentElement.scrollWidth <= innerWidth"), true);
  const consoleOutput = run("console");
  assert.ok(!consoleOutput.includes("[error]"), consoleOutput);
  assert.ok(!run("errors").trim());
  console.log(
    "Scene load, rendering, water animation/pause, destination switching/cache/deep links/history, orbit, reset, PNG export and narrow layout passed.",
  );
} finally {
  run("close");
  rmSync(scratch, { recursive: true, force: true });
}
