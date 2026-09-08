import {
  destinations,
  destinationFromHash,
  loadDestination,
  trimDestinationCache,
  cancelPendingDestinations,
} from "./destinations.js";
import { createAtlas } from "./atlas.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Reflector } from "three/addons/objects/Reflector.js";

function showLoadError() {
  const loading = document.querySelector("#loading");
  loading.classList.remove("done");
  loading.textContent = "场景载入失败，请刷新重试";
}
addEventListener("unhandledrejection", showLoadError);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#f5f2e8");
scene.fog = new THREE.FogExp2("#e9eadf", 0.0068);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector("#scene").appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(
  32,
  innerWidth / innerHeight,
  0.2,
  450,
);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 34;
controls.maxDistance = 130;
controls.minPolarAngle = Math.PI * 0.44;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minAzimuthAngle = -0.35;
controls.maxAzimuthAngle = 0.35;
let sceneView = destinations["three-pools"].view;
function resetCamera() {
  const framingWidth =
    innerWidth < 650
      ? (sceneView.portraitWidth ?? sceneView.width)
      : sceneView.width;
  controls.enableDamping = false;
  controls.update();
  camera.fov = Math.max(
    32,
    THREE.MathUtils.radToDeg(
      2 * Math.atan(framingWidth / (85 * camera.aspect)),
    ),
  );
  camera.updateProjectionMatrix();
  const distance = Math.max(
    sceneView.minimum,
    framingWidth /
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) /
      camera.aspect,
  );
  camera.position.set(
    0,
    sceneView.height + distance * 0.13,
    distance + sceneView.depth + 3,
  );
  controls.target.set(0, sceneView.height, sceneView.depth);
  controls.update();
  controls.enableDamping = true;
}
resetCamera();
const skyLight = new THREE.HemisphereLight("#fbf4de", "#748579", 1.45);
scene.add(skyLight);
const sun = new THREE.DirectionalLight("#fff9e9", 2.2);
sun.position.set(-35, 65, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -55,
  right: 45,
  top: 35,
  bottom: -35,
  near: 1,
  far: 150,
});
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.035;
scene.add(sun);

const windUniform = { value: 0 };
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(390, 105),
  new THREE.MeshBasicMaterial({
    fog: false,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
  }),
);
const backdropWash = { value: new THREE.Vector3(0.84, 0.85, 0.8) };
const backdropWashAmount = { value: 0.33 };
backdrop.material.onBeforeCompile = (shader) => {
  shader.uniforms.backdropWash = backdropWash;
  shader.uniforms.backdropWashAmount = backdropWashAmount;
  shader.fragmentShader =
    "uniform vec3 backdropWash; uniform float backdropWashAmount;\n" +
    shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <opaque_fragment>",
    "diffuseColor.a *= smoothstep(.22,.39,vMapUv.y); outgoingLight = mix(outgoingLight,backdropWash,backdropWashAmount); diffuseColor.a *= 1.0-smoothstep(.75,1.0,vMapUv.y);\n#include <opaque_fragment>",
  );
};
backdrop.visible = false;
backdrop.renderOrder = -1;
scene.add(backdrop);
backdrop.position.set(0, 0, -135);
backdrop.castShadow = false;
backdrop.receiveShadow = false;

// One surface owns reflections, capillary waves, contact shading and ripples.
// Keeping the ripples here avoids static line geometry being reflected twice.
const waterShader = structuredClone(Reflector.ReflectorShader);
waterShader.uniforms = THREE.UniformsUtils.clone(
  Reflector.ReflectorShader.uniforms,
);
waterShader.uniforms.time = { value: 0 };
waterShader.uniforms.waterTintBase = {
  value: new THREE.Vector3(0.61, 0.71, 0.68),
};
waterShader.uniforms.originalBanks = { value: true };
waterShader.uniforms.rippleCount = { value: 4 };
waterShader.uniforms.rippleCenters = {
  value: [
    new THREE.Vector4(22, 9, 0.62, 0.4),
    new THREE.Vector4(29, 15, 0.9, 2.6),
    new THREE.Vector4(37, 10, 0.77, 4.7),
    new THREE.Vector4(16, 3, 0.96, 1.8),
  ],
};
waterShader.uniforms.rippleShapes = {
  value: [
    new THREE.Vector2(1, 1),
    new THREE.Vector2(1, 1),
    new THREE.Vector2(1, 1),
    new THREE.Vector2(2.75, 0.85),
  ],
};
waterShader.uniforms.reflectionTexel = {
  value: new THREE.Vector2(1 / 1536, 1 / 768),
};
waterShader.vertexShader = waterShader.vertexShader
  .replace("varying vec4 vUv;", "varying vec4 vUv; varying vec3 worldPos;")
  .replace(
    "vUv = textureMatrix",
    "worldPos = (modelMatrix * vec4(position, 1.0)).xyz; vUv = textureMatrix",
  );
waterShader.fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 reflectionTexel;
  uniform float time;
  uniform vec3 waterTintBase;
  uniform bool originalBanks;
  uniform int rippleCount;
  uniform vec4 rippleCenters[4];
  uniform vec2 rippleShapes[4];
  varying vec4 vUv;
  varying vec3 worldPos;
  #include <common>

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float waterNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), f.x),
      mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + 1.0), f.x),
      f.y
    );
  }

  // xy: surface slope; zw: dark and light sides of an outward-moving crest.
  vec4 objectRipple(vec2 p, vec2 center, vec2 shape, float radius, float phaseOffset) {
    vec2 offset = (p - center) / shape;
    float distanceToCenter = length(offset);
    float distanceFromEdge = max(0.0, distanceToCenter - radius);
    if (distanceFromEdge > 7.0) return vec4(0.0);

    vec2 direction = offset / max(distanceToCenter, 0.001);
    float envelope = exp(-distanceFromEdge * 0.63)
      * smoothstep(radius * 0.82, radius + 0.18, distanceToCenter);
    float arc = smoothstep(0.24, 0.72,
      waterNoise(direction * 3.6 + phaseOffset + vec2(time * 0.025, 0.0)));
    float phase = distanceFromEdge * 6.4 - time * 1.45 + phaseOffset;
    phase += waterNoise(direction * 5.0 + phaseOffset) * 0.8;
    float aa = min(0.16, fwidth(phase));
    float darkCrest = smoothstep(0.88 - aa, 1.0, cos(phase));
    float lightCrest = smoothstep(0.88 - aa, 1.0, cos(phase - 0.48));
    vec2 slope = direction / shape * sin(phase) * envelope * 0.12;
    return vec4(slope, darkCrest * envelope * arc, lightCrest * envelope * arc);
  }

  vec3 softReflection(vec2 uv, float roughness) {
    vec2 blur = reflectionTexel * vec2(2.8 + roughness * 4.0, 0.65);
    return texture2D(tDiffuse, uv).rgb * 0.4
      + texture2D(tDiffuse, uv + vec2(blur.x, 0.0)).rgb * 0.2
      + texture2D(tDiffuse, uv - vec2(blur.x, 0.0)).rgb * 0.2
      + texture2D(tDiffuse, uv + vec2(0.0, blur.y)).rgb * 0.1
      + texture2D(tDiffuse, uv - vec2(0.0, blur.y)).rgb * 0.1;
  }

  void main() {
    vec2 p = worldPos.xz;
    float swell = sin(p.x * 0.28 + p.y * 1.45 - time * 0.55);
    float crossing = sin(p.x * 0.73 - p.y * 2.5 + time * 0.8);
    vec2 slope = vec2(swell * 0.38 + crossing * 0.13,
      sin(p.y * 3.7 + p.x * 0.2 - time * 0.7) * 0.4);

    vec4 ripples=vec4(0.0);
    for(int i=0;i<4;i++) {
      if(i<rippleCount) ripples+=objectRipple(p,rippleCenters[i].xy,rippleShapes[i],rippleCenters[i].z,rippleCenters[i].w);
    }
    slope += ripples.xy;

    vec2 uv = vUv.xy / vUv.w + slope * vec2(0.0032, 0.0021);
    float roughness = waterNoise(p * 0.18 + time * 0.025);
    vec3 reflected = softReflection(uv, roughness);
    vec3 surfaceNormal = normalize(vec3(-slope.x * 0.065, 1.0, -slope.y * 0.065));
    vec3 viewDirection = normalize(cameraPosition - worldPos);
    float grazing = pow(1.0 - clamp(dot(surfaceNormal, viewDirection), 0.0, 1.0), 3.0);

    // Ripples distort recognizable silhouettes rather than replacing them with stripes.
    float reflectionBreak = waterNoise(vec2(p.x * 0.36, p.y * 5.0 - time * 0.1));
    float reflectionWeight = mix(0.3, 0.58, grazing)
      * mix(0.62, 1.0, smoothstep(0.24, 0.7, reflectionBreak));
    float distanceHaze = smoothstep(60.0, 160.0, length(cameraPosition - worldPos));
    vec3 waterTint = mix(waterTintBase, vec3(0.79, 0.81, 0.75), distanceHaze * 0.6);
    float reflectedLuminance = dot(reflected, vec3(0.2126, 0.7152, 0.0722));
    float reflectedSubject = smoothstep(0.04, 0.36, 0.87 - reflectedLuminance);
    // Do not modulate empty sky reflections: that turns the whole lake into a line field.
    vec3 color = mix(waterTint, reflected, reflectionWeight * reflectedSubject);
    color += (waterNoise(p * 0.065 + time * 0.01) - 0.5) * vec3(0.012, 0.016, 0.014);

    // Sparse, differently sized pigment marks leave calm open water between clusters.
    vec2 flow = p + vec2(waterNoise(p * 0.09) * 1.6,
      waterNoise(p * 0.08 + 7.0) * 0.24);
    float smallMarks = waterNoise(flow * vec2(0.42, 7.5) - vec2(time * 0.01, time * 0.065));
    float clusters = waterNoise(flow * 0.12 + 9.0);
    float pigment = smoothstep(0.56, 0.8, smallMarks) * smoothstep(0.3, 0.67, clusters);
    color = mix(color, vec3(0.32, 0.48, 0.46), pigment * 0.3);

    float leftBank = abs(length((p - vec2(-35.0, -3.0)) / vec2(20.0, 10.0)) - 1.0) * 10.0;
    float rightBank = abs(length((p - vec2(2.0, -6.0)) / vec2(8.0, 5.0)) - 1.0) * 5.0;
    float bankContact = originalBanks ? exp(-min(leftBank, rightBank) * 2.0) : 0.0;
    color = mix(color, vec3(0.38, 0.5, 0.43), bankContact * 0.16);
    color -= ripples.z * vec3(0.16, 0.18, 0.165);
    color += ripples.w * vec3(0.16, 0.15, 0.12);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.968, 0.955, 0.923), 0.1);
    gl_FragColor.rgb -= ripples.z * vec3(0.035, 0.045, 0.043);
    gl_FragColor.rgb += ripples.w * vec3(0.018, 0.02, 0.018);
    gl_FragColor.rgb -= pigment * vec3(0.035, 0.025, 0.018);
  }
`;
const water = new Reflector(new THREE.PlaneGeometry(550, 550), {
  textureWidth: 1536,
  textureHeight: 768,
  clipBias: 0.002,
  shader: waterShader,
  multisample: 0,
});
water.name = "lake-water";
water.material.depthWrite = false;
water.rotation.x = -Math.PI / 2;
water.position.y = -0.04;
scene.add(water);

let paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
  time = 0,
  last = performance.now(),
  frames = 0,
  sample = performance.now();
const motion = document.querySelector("#motion");
function updateMotion() {
  motion.textContent = paused ? "继续光阴" : "暂停光阴";
  motion.setAttribute("aria-pressed", String(paused));
}
updateMotion();
motion.onclick = () => {
  paused = !paused;
  updateMotion();
};
document.querySelector("#reset").onclick = resetCamera;
document.querySelector("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    toast("当前浏览器不支持全屏");
  }
};
function toast(text) {
  const el = document.querySelector("#toast");
  el.textContent = text;
  el.style.opacity = 1;
  setTimeout(() => (el.style.opacity = 0), 2200);
}
document.querySelector("#capture").onclick = () => {
  if (!currentDestination) return;
  renderer.render(scene, camera);
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `${destinations[currentDestination].title}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("画面已保存");
  });
};
addEventListener("keydown", (e) => {
  if (e.key === "h" && !/INPUT|TEXTAREA/.test(e.target.tagName))
    document.body.classList.toggle("clean");
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  resetCamera();
});
let currentDestination = null;
let requestedDestination = "three-pools";
let activeGroup = null;
let selectionVersion = 0;
const destinationSelect = document.querySelector("#destination");
const loading = document.querySelector("#loading");
const updateAtlas = createAtlas((id) => {
  location.hash = id;
});
async function switchDestination(id) {
  const version = ++selectionVersion;
  requestedDestination = id;
  cancelPendingDestinations(id);
  const config = destinations[id];
  loading.textContent = `正在铺开${config.title}…`;
  loading.classList.remove("done");
  destinationSelect.value = id;
  try {
    const group = await loadDestination(id, { time: windUniform });
    if (version !== selectionVersion) {
      trimDestinationCache(currentDestination, requestedDestination);
      return;
    }
    if (activeGroup) activeGroup.visible = false;
    if (!group.parent) scene.add(group);
    group.visible = true;
    activeGroup = group;
    currentDestination = id;
    trimDestinationCache(id);
    updateAtlas(id);
    water.visible = config.waterVisible !== false;
    sceneView = config.view;
    scene.background.set(config.paper);
    scene.fog.color.set(config.fog);
    scene.fog.density = config.density;
    skyLight.color.set(config.sky);
    skyLight.groundColor.set(config.ground);
    sun.color.set(config.sun);
    sun.intensity = config.sunPower;
    backdrop.material.map = group.userData.backdrop;
    backdrop.material.needsUpdate = true;
    backdrop.visible = true;
    backdropWash.value.fromArray(config.wash);
    backdropWashAmount.value = config.washAmount;
    water.material.uniforms.waterTintBase.value.fromArray(config.water);
    water.material.uniforms.originalBanks.value = id === "three-pools";
    const centers = water.material.uniforms.rippleCenters.value;
    const shapes = water.material.uniforms.rippleShapes.value;
    water.material.uniforms.rippleCount.value =
      id === "three-pools"
        ? 4
        : ["leifeng", "nine-creeks"].includes(id)
          ? 1
          : 0;
    if (id === "three-pools") {
      [
        [22, 9, 0.62, 0.4],
        [29, 15, 0.9, 2.6],
        [37, 10, 0.77, 4.7],
        [16, 3, 0.96, 1.8],
      ].forEach((entry, i) => centers[i].fromArray(entry));
      [
        [1, 1],
        [1, 1],
        [1, 1],
        [2.75, 0.85],
      ].forEach((entry, i) => shapes[i].fromArray(entry));
    } else if (id === "leifeng") {
      centers[0].set(-10, 8, 0.96, 1.8);
      shapes[0].set(2.75, 0.85);
    } else if (id === "nine-creeks") {
      centers[0].set(-3, -19.5, 0.5, 1);
      shapes[0].set(2.8, 1);
    }
    document.documentElement.style.setProperty("--paper", config.paper);
    document.querySelector("h1").textContent = config.title;
    document.querySelector("header p").textContent = config.subtitle;
    document.querySelector(".seal").textContent =
      id === "nine-creeks" ? "九溪" : "西湖";
    document
      .querySelector(".poem")
      .replaceChildren(
        document.createTextNode(config.poem[0]),
        document.createElement("br"),
        document.createTextNode(config.poem[1]),
      );
    document
      .querySelector("#scene")
      .setAttribute("aria-label", `${config.title}三维山水场景`);
    document.title = `${config.title} · 杭州小景`;
    resetCamera();
    loading.classList.add("done");
  } catch (error) {
    if (version !== selectionVersion) return;
    if (currentDestination) {
      destinationSelect.value = currentDestination;
      history.replaceState(null, "", `#${currentDestination}`);
    }
    loading.classList.add("done");
    toast("景点载入失败，请重新选择重试");
    console.error(error);
  }
}
destinationSelect.disabled = false;
destinationSelect.onchange = () => {
  location.hash = destinationSelect.value;
};
addEventListener("hashchange", () =>
  switchDestination(destinationFromHash(location.hash)),
);
window.sceneDebug = {
  renderer,
  scene,
  camera,
  controls,
  get paused() {
    return paused;
  },
  get time() {
    return time;
  },
  get leaves() {
    return activeGroup?.userData.leafCount || 0;
  },
  fps: 0,
  get destination() {
    return currentDestination;
  },
  get loading() {
    return !loading.classList.contains("done");
  },
  get ready() {
    return currentDestination !== null;
  },
};
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!paused) time += dt;
  windUniform.value = time;
  water.material.uniforms.time.value = time;
  controls.update();
  renderer.render(scene, camera);
  frames++;
  if (now - sample > 1200) {
    window.sceneDebug.fps = (frames * 1000) / (now - sample);
    sample = now;
    frames = 0;
  }
});
switchDestination(destinationFromHash(location.hash));
