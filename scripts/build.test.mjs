import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  destinations,
  destinationFromHash,
} from "../projects/west-lake/destinations.js";

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
  const source = await readFile(
    new URL("../projects/west-lake/main.js", site),
    "utf8",
  );
  const runtimeAssets = [...source.matchAll(/\$\{assetBase\}([^`]+)`/g)].map(
    (match) => match[1],
  );
  assert.ok(runtimeAssets.length >= 7);
  for (const asset of runtimeAssets) {
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
