import * as THREE from "three";
import { assetBase } from "./assets.js";

const paper = new THREE.Color("#f7f4eb");
const vertexShader = `varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }`;

// Match every layer to the same reference camera. Curved foreground surfaces
// sit nearer than the completed background, so a lateral move reveals parallax.
function createPanel(texture, paint, depth, bend, aspect) {
  const foreground = Boolean(paint);
  const geometry = new THREE.PlaneGeometry(1, 1, 64, 24);
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    let u = uvs.getX(i),
      v = uvs.getY(i);
    if (!foreground) {
      u = u * 1.5 - 0.25;
      v = v * 1.3 - 0.15;
      uvs.setXY(i, u, v);
    }
    const distance = depth + bend * (u - 0.5) ** 2;
    positions.setXYZ(
      i,
      ((u - 0.5) * 80 * distance) / 60,
      ((v - 0.5) * (80 / aspect) * distance) / 60,
      60 - distance,
    );
  }
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: foreground,
    depthWrite: !foreground,
    uniforms: {
      paint: { value: paint || texture },
      mask: { value: texture },
      paper: { value: paper },
    },
    vertexShader,
    fragmentShader: foreground
      ? `
      uniform sampler2D mask;
      uniform sampler2D paint;
      varying vec2 vUv;
      void main() {
        vec3 matte = texture2D(mask, vUv).rgb;
        float chroma = min(matte.r, matte.b) - matte.g;
        float alpha = 1. - smoothstep(.10, .75, chroma);
        if (alpha < .02) discard;
        float border = min(min(vUv.x, 1. - vUv.x), vUv.y);
        alpha *= smoothstep(0., .025, border);
        // Generated mattes supply coverage only. Original artwork supplies all
        // visible colour, including the pale washes along foliage edges.
        gl_FragColor = vec4(texture2D(paint, vUv).rgb, alpha);
        #include <colorspace_fragment>
      }`
      : `
      uniform sampler2D paint;
      uniform vec3 paper;
      varying vec2 vUv;
      void main() {
        vec3 color = texture2D(paint, vUv).rgb;
        float edge = min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y));
        color = mix(paper, color, smoothstep(0., .045, edge));
        gl_FragColor = vec4(color, 1.);
        #include <colorspace_fragment>
      }`,
  });
  const panel = new THREE.Mesh(geometry, material);
  panel.renderOrder = 120 - depth;
  return panel;
}

export async function buildPaintedScene(id, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const textures = [];
  const names =
    id === "bamboo-path"
      ? ["background", "source", "left-key", "right-key"]
      : ["background", "source", "foreground-key"];
  const jobs = names.map(async (name) => {
    const response = await fetch(`${assetBase}painted/${id}/${name}.webp`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${id}/${name}: HTTP ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob(), {
      imageOrientation: "flipY",
      premultiplyAlpha: "none",
      colorSpaceConversion: "none",
    });
    if (controller.signal.aborted) {
      bitmap.close();
      controller.signal.throwIfAborted();
    }
    const texture = new THREE.Texture(bitmap);
    texture.flipY = false;
    texture.colorSpace = name.endsWith("-key")
      ? THREE.NoColorSpace
      : THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textures.push(texture);
    return texture;
  });
  try {
    const [background, source, first, second] = await Promise.all(jobs);
    signal.throwIfAborted();
    const group = new THREE.Group();
    group.name = id;
    group.userData.painted = true;
    const aspect = source.image.width / source.image.height;
    group.userData.frameAspect = aspect;
    group.userData.ownedTextures = textures;
    group.add(createPanel(background, null, 95, 5, aspect));
    group.add(
      createPanel(first, source, second ? 43 : 48, second ? 4 : 5, aspect),
    );
    if (second) group.add(createPanel(second, source, 50, 3, aspect));
    return group;
  } catch (error) {
    controller.abort();
    await Promise.allSettled(jobs);
    for (const texture of textures) {
      texture.dispose();
      texture.image.close();
    }
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
