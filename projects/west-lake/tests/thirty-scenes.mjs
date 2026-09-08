import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { destinations, destinationOrder } from "../catalog.js";
const run = (...args) =>
  execFileSync("agent-browser", ["--session", "thirty-check", ...args], {
    encoding: "utf8",
    timeout: 60000,
  });
const get = (code) => JSON.parse(run("eval", `JSON.stringify(${code})`).trim());
const value = (code) => JSON.parse(get(code));
const waitFor = (id) =>
  run(
    "wait",
    "--fn",
    `window.sceneDebug?.destination === '${id}' && !sceneDebug.loading`,
  );
try {
  run("open", process.env.SCENE_URL || "http://127.0.0.1:5182/");
  run("set", "viewport", "1440", "900");
  run("wait", "--fn", "window.sceneDebug?.ready");
  assert.equal(
    value('document.querySelectorAll("#destination optgroup").length'),
    3,
  );
  assert.equal(
    value('document.querySelectorAll("#destination option").length'),
    30,
  );
  run("click", "#open-atlas");
  assert.equal(value('document.querySelector("#atlas").open'), true);
  run("click", '[data-destination="bamboo-path"]');
  waitFor("bamboo-path");
  assert.equal(value('document.querySelector("#atlas").open'), false);
  for (const id of destinationOrder) {
    run("select", "#destination", id);
    waitFor(id);
    assert.equal(
      value("document.title"),
      `${destinations[id].title} · 杭州小景`,
    );
    assert.ok(
      value("sceneDebug.renderer.info.render.triangles") > 10000,
      `${id} must render geometry`,
    );
    assert.deepEqual(
      value(
        `sceneDebug.scene.children.filter(o=>${JSON.stringify(destinationOrder)}.includes(o.name)&&o.visible).map(o=>o.name)`,
      ),
      [id],
    );
    assert.ok(
      value(
        `sceneDebug.scene.children.filter(o=>${JSON.stringify(destinationOrder)}.includes(o.name)).length`,
      ) <= 4,
      "Evict old models during a complete tour",
    );
    assert.equal(
      value(
        'document.querySelector("#atlas [aria-current]").dataset.destination',
      ),
      id,
    );
  }
  // Complete tour wraps, including across collection boundaries.
  run("click", "#next-scene");
  waitFor("su-causeway");
  run("click", "#previous-scene");
  waitFor("beishan");
  // Competing lazy loads must never replace the last requested scene.
  run(
    "eval",
    `(async () => {
    const select = document.querySelector('#destination');
    for (const id of ['yellow-dragon','lotus-breeze','wansong']) {
      select.value = id; select.dispatchEvent(new Event('change'));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  })()`,
  );
  waitFor("wansong");
  run("wait", "1200");
  assert.equal(value("sceneDebug.destination"), "wansong");
  run("reload");
  waitFor("wansong");
  run("set", "viewport", "390", "844");
  run("click", "#open-atlas");
  assert.equal(
    value("document.documentElement.scrollWidth <= innerWidth"),
    true,
  );
  assert.equal(
    value(
      'document.querySelector("#atlas").scrollWidth <= document.querySelector("#atlas").clientWidth',
    ),
    true,
  );
  run("press", "Escape");
  assert.equal(value('document.querySelector("#atlas").open'), false);
  assert.equal(value("document.activeElement.id"), "open-atlas");
  assert.ok(!run("console").includes("[error]"));
  assert.ok(!run("errors").trim());
  console.log(
    "30 unique scenes, bounded cache, atlas selection, tour wrap, lazy-load races, deep links and mobile dialog passed.",
  );
} finally {
  run("close");
}
