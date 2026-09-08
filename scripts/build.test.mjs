import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  destinations,
  collections,
  destinationOrder,
  destinationFromHash,
} from "../projects/west-lake/catalog.js";

const site = new URL("../_site/", import.meta.url);

test("collection links and previews resolve within a project Pages subpath", async () => {
  const html = await readFile(new URL("index.html", site), "utf8");
  const links = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(links.includes("./projects/west-lake/"));
  for (const link of links.filter(
    (link) => !/^(?:https?:|data:|#)/.test(link),
  )) {
    assert.ok(
      !link.startsWith("/"),
      `Root-relative URL breaks project Pages: ${link}`,
    );
    await stat(new URL(link, site));
  }
});

test("built scene uses relative bundles and includes all runtime model and texture files", async () => {
  const scene = new URL("projects/west-lake/", site);
  const html = await readFile(new URL("index.html", scene), "utf8");
  for (const [, link] of html.matchAll(
    /(?:src|href)="(\.\/assets\/[^\"]+)"/g,
  )) {
    await stat(new URL(link, scene));
  }
  for (const asset of [
    "limestone.png",
    "ink-stone.png",
    "mountains-v2.png",
    "willow-foliage.png",
    "architecture.glb",
    "willow-trunks.glb",
    "shore-rocks.glb",
  ]) {
    assert.ok((await stat(new URL(`assets/${asset}`, scene))).size > 0);
  }
  assert.ok(!html.includes('src="/assets/'));
});

test("landmark routes and their local decoders and assets ship together", async () => {
  assert.equal(destinationFromHash(""), "three-pools");
  assert.equal(destinationFromHash("#not-a-landmark"), "three-pools");
  assert.equal(destinationFromHash("#__proto__"), "three-pools");
  for (const [id, config] of Object.entries(destinations)) {
    assert.equal(destinationFromHash(`#${id}`), id);
    for (const asset of [config.asset, config.backdrop].filter(Boolean)) {
      assert.ok(
        (await stat(new URL(`projects/west-lake/assets/${asset}`, site))).size >
          0,
      );
    }
  }
  for (const asset of [
    "woodland-canopy.png",
    "hillside-ink.png",
    "draco/draco_decoder.wasm",
    "draco/draco_wasm_wrapper.js",
    "draco/LICENSE.txt",
  ]) {
    assert.ok(
      (await stat(new URL(`projects/west-lake/assets/${asset}`, site))).size >
        0,
    );
  }
});

test("three generations contain exactly thirty distinct reachable scenes", () => {
  assert.deepEqual(
    collections.map((group) => group.ids.length),
    [10, 10, 10],
  );
  assert.equal(new Set(destinationOrder).size, 30);
  assert.deepEqual(
    new Set(destinationOrder),
    new Set(Object.keys(destinations)),
  );
  assert.deepEqual(
    collections.map((group) => group.ids.map((id) => destinations[id].title)),
    [
      [
        "苏堤春晓",
        "曲院风荷",
        "平湖秋月",
        "断桥残雪",
        "花港观鱼",
        "柳浪闻莺",
        "三潭印月",
        "双峰插云",
        "雷峰夕照",
        "南屏晚钟",
      ],
      [
        "云栖竹径",
        "满陇桂雨",
        "虎跑梦泉",
        "龙井问茶",
        "九溪烟树",
        "吴山天风",
        "阮墩环碧",
        "黄龙吐翠",
        "玉皇飞云",
        "宝石流霞",
      ],
      [
        "灵隐禅踪",
        "六和听涛",
        "岳墓栖霞",
        "湖滨晴雨",
        "钱祠表忠",
        "万松书缘",
        "杨堤景行",
        "三台云水",
        "梅坞春早",
        "北街梦寻",
      ],
    ],
  );
  const assets = Object.values(destinations)
    .map((config) => config.asset)
    .filter(Boolean);
  assert.equal(
    new Set(assets).size,
    29,
    "Each added place needs its own authored model",
  );
});
