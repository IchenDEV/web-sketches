import { loadTexture, disposeGroup } from "./assets.js";
import { destinations } from "./catalog.js";
import { paintedDestinations } from "./painted-catalog.js";
export {
  destinations,
  destinationFromHash,
  collections,
  destinationOrder,
} from "./catalog.js";

// Keep three recent scenes, including Three Pools. Only original shared textures stay cached.
const loaded = new Map();
const resolved = new Map();
export function trimDestinationCache(activeId, requestedId = activeId) {
  for (const [id, group] of resolved) {
    if (resolved.size <= 3) break;
    if (id === activeId || id === requestedId) continue;
    disposeGroup(group);
    resolved.delete(id);
    loaded.delete(id);
  }
}
const pendingLoads = new Map();
export function cancelPendingDestinations(keepId) {
  for (const [id, controller] of pendingLoads) {
    if (id !== keepId) {
      controller.abort();
      pendingLoads.delete(id);
      loaded.delete(id);
    }
  }
}
export function loadDestination(id, { time }) {
  if (loaded.has(id)) {
    if (resolved.has(id)) {
      const group = resolved.get(id);
      resolved.delete(id);
      resolved.set(id, group);
    }
    return loaded.get(id);
  }
  const config = destinations[id];
  const controller = new AbortController();
  const { signal } = controller;
  pendingLoads.set(id, controller);
  const pending = (async () => {
    if (paintedDestinations.has(id)) {
      const { buildPaintedScene } = await import("./painted-scene.js");
      signal.throwIfAborted();
      const group = await buildPaintedScene(id, signal);
      resolved.set(id, group);
      return group;
    }
    if (id === "three-pools") {
      const backdropPromise = loadTexture(
        config.backdrop || "mountains-v2.png",
      );
      const [{ buildThreePools }, backdrop] = await Promise.all([
        import("./three-pools.js"),
        backdropPromise,
      ]);
      signal.throwIfAborted();
      const group = await buildThreePools(time, signal);
      group.userData.backdrop = backdrop;
      resolved.set(id, group);
      return group;
    }
    throw new Error(`No painted layers registered for ${id}`);
  })().catch((error) => {
    if (loaded.get(id) === pending) loaded.delete(id);
    throw error;
  });
  pending
    .finally(() => {
      if (pendingLoads.get(id) === controller) pendingLoads.delete(id);
    })
    .catch(() => {});
  loaded.set(id, pending);
  return pending;
}
