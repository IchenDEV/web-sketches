import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

export const assetBase = `${import.meta.env.BASE_URL}assets/`;
const textures = new Map();
const decoder = new DRACOLoader();
decoder.setDecoderPath(`${assetBase}draco/`);
decoder.setDecoderConfig({ type: "wasm" });
decoder.setWorkerLimit(2);

// Only requested textures enter this cache. Shared textures survive scene eviction.
export function loadTexture(name) {
  if (!textures.has(name)) {
    const pending = new THREE.TextureLoader()
      .loadAsync(`${assetBase}${name}`)
      .then((map) => {
        map.colorSpace = THREE.SRGBColorSpace;
        if (
          ["limestone.png", "ink-stone.png", "hillside-ink.png"].includes(name)
        )
          map.wrapS = map.wrapT = THREE.RepeatWrapping;
        if (name === "limestone.png") map.repeat.set(2, 2);
        if (name === "woodland-canopy.png") map.flipY = false;
        return map;
      })
      .catch((error) => {
        textures.delete(name);
        throw error;
      });
    textures.set(name, pending);
  }
  return textures.get(name);
}

export async function loadModel(name, signal) {
  const response = await fetch(`${assetBase}${name}`, { signal });
  if (!response.ok) throw new Error(`Model ${name}: HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  signal.throwIfAborted();
  const model = await new GLTFLoader()
    .setDRACOLoader(decoder)
    .parseAsync(buffer, assetBase);
  // A decode already in progress cannot be interrupted; do not retain its result.
  if (signal.aborted) {
    disposeGroup(model.scene);
    signal.throwIfAborted();
  }
  return model;
}

export function disposeGroup(group) {
  group.removeFromParent();
  const resources = new Set();
  group.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean))
      resources.add(material);
  });
  for (const resource of resources) resource.dispose();
}
