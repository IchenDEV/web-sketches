import {
  destinations,
  destinationFromHash,
  loadDestination,
} from "./destinations.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";

function showLoadError() {
  const loading = document.querySelector("#loading");
  loading.classList.remove("done");
  loading.textContent = "场景载入失败，请刷新重试";
}
addEventListener("unhandledrejection", showLoadError);
const scene = new THREE.Scene();
const originalScene = new THREE.Group();
originalScene.name = "three-pools";
scene.add(originalScene);
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
  controls.enableDamping = false;
  controls.update();
  camera.fov = Math.max(
    32,
    THREE.MathUtils.radToDeg(
      2 * Math.atan(sceneView.width / (85 * camera.aspect)),
    ),
  );
  camera.updateProjectionMatrix();
  const distance = Math.max(
    sceneView.minimum,
    sceneView.width /
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

let seed = 1790489760;
function random() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
const rand = (a, b) => a + (b - a) * random();
const assetBase = `${import.meta.env.BASE_URL}assets/`;
const texture = await new THREE.TextureLoader().loadAsync(
  `${assetBase}limestone.png`,
);
texture.colorSpace = THREE.SRGBColorSpace;
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(2, 2);
const stone = new THREE.MeshStandardMaterial({
  color: "#c4c7bc",
  map: texture,
  roughness: 1,
  bumpMap: texture,
  bumpScale: 0.16,
});
const bark = new THREE.MeshStandardMaterial({
  color: "#303a31",
  map: texture,
  bumpMap: texture,
  bumpScale: 0.22,
  roughness: 1,
});
const earth = new THREE.MeshStandardMaterial({
  color: "#9fae92",
  map: texture,
  roughness: 1,
});
const inkTexture = await new THREE.TextureLoader().loadAsync(
  `${assetBase}ink-stone.png`,
);
inkTexture.colorSpace = THREE.SRGBColorSpace;
inkTexture.wrapS = inkTexture.wrapT = THREE.RepeatWrapping;
function inkMaterial(material, strength = 0.14) {
  const paleStone = material === stone || /stone|fracture/.test(material.name);
  material.customProgramCacheKey = () =>
    `ink-${strength}-${paleStone}-${material.name}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.inkMap = { value: inkTexture };
    shader.vertexShader = "varying vec3 inkPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
  vec4 inkPoint=vec4(position,1.0);
  #ifdef USE_INSTANCING
  inkPoint=instanceMatrix*inkPoint;
  #endif
  inkPosition=(modelMatrix*inkPoint).xyz;`,
    );
    shader.fragmentShader =
      "uniform sampler2D inkMap; varying vec3 inkPosition;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
  float contour=pow(1.0-abs(dot(normal,normalize(vViewPosition))),2.0);
  float wash=sin(inkPosition.x*.9+sin(inkPosition.y*1.5))*sin(inkPosition.z*1.3+inkPosition.y*.8);
  vec3 flatPigment=linearToOutputTexel(vec4(diffuseColor.rgb,1.0)).rgb;
  flatPigment=mix(flatPigment,vec3(.82,.83,.77),${paleStone ? ".5" : ".12"});
  gl_FragColor.rgb=mix(gl_FragColor.rgb,flatPigment,.6);
  gl_FragColor.rgb*=1.0-contour*${strength};
  float washPatch=smoothstep(-.2,.65,wash);
  gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.77,.79,.72),washPatch*${paleStone ? ".28" : ".16"});
  gl_FragColor.rgb+=wash*.014;
  vec2 paintedUV=${/roof|ridge/.test(material.name) ? "inkPosition.xz*.10" : /^wood/.test(material.name) ? "inkPosition.xy*.09" : "inkPosition.xy*.21+inkPosition.z*.027"};
  vec3 paintedStone=linearToOutputTexel(texture2D(inkMap,paintedUV)).rgb;
  ${
    paleStone
      ? `gl_FragColor.rgb=mix(gl_FragColor.rgb,paintedStone,.65);
  if(inkPosition.x>19.0 && inkPosition.z>6.0){float undercut=1.0-smoothstep(.18,.9,inkPosition.y);gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.29,.34,.30),undercut*.65);
  float bodyWash=(1.0-smoothstep(.69,.84,paintedStone.r))*(1.0-undercut);
  gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.27,.34,.30),bodyWash*.48);}`
      : `gl_FragColor.rgb*=mix(.50,1.25,paintedStone.r);
  float jointMark=exp(-pow((inkPosition.y-6.7)*7.0,2.0))*smoothstep(-.3,.7,sin(inkPosition.x*5.1+inkPosition.z*4.7));
  gl_FragColor.rgb*=1.0-jointMark*.23;`
  }
  ${material.name === "ridge" ? `if(sin(inkPosition.x*14.0+inkPosition.z*19.0)+sin(inkPosition.x*1.7+inkPosition.z*2.2)>.15)discard;` : ""}
  if(inkPosition.z < -100.0) gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.38,.43,.39),.43);`,
    );
  };
}

function inkEdges(object, threshold = 26, opacity = 0.32) {
  const edges = new THREE.EdgesGeometry(object.geometry, threshold);
  const source = edges.attributes.position,
    strokes = [];
  for (let i = 0; i < source.count; i += 2) {
    const x = source.getX(i),
      y = source.getY(i),
      z = source.getZ(i);
    const pick = Math.abs(Math.sin(x * 19.3 + y * 37.1 + z * 7.7));
    if (pick < 0.48) continue;
    strokes.push(
      x,
      y,
      z,
      source.getX(i + 1),
      source.getY(i + 1),
      source.getZ(i + 1),
    );
  }
  edges.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(strokes, 3),
  );
  object.add(
    new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color: "#35453e",
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    ),
  );
}
inkMaterial(stone, 0.32);
inkMaterial(bark, 0.22);
function mesh(geometry, material, parent = originalScene) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const mountainMap = await new THREE.TextureLoader().loadAsync(
  `${assetBase}mountains-v2.png`,
);
mountainMap.colorSpace = THREE.SRGBColorSpace;
const backdrop = mesh(
  new THREE.PlaneGeometry(390, 105),
  new THREE.MeshBasicMaterial({
    map: mountainMap,
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
backdrop.renderOrder = -1;
scene.add(backdrop);
backdrop.position.set(0, 0, -135);
backdrop.castShadow = false;
backdrop.receiveShadow = false;

function land(cx, cz, sx, sz, height) {
  const g = new THREE.SphereGeometry(1, 64, 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const n =
      1 + 0.06 * Math.sin(x * 14 + z * 11) + 0.035 * Math.sin(z * 24 - x * 17);
    p.setXYZ(i, cx + x * sx * n, y * height - 0.3, cz + z * sz * n);
  }
  g.computeVertexNormals();
  mesh(g, earth);
}
land(-35, -3, 20, 10, 1.8);
land(2, -6, 8, 5, 1.35);
function rockGeometry() {
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 5)),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    let n =
      1 +
      0.16 * Math.sin(x * 7 + z * 5) * Math.cos(y * 9) +
      0.07 * Math.sin(x * 17 + y * 13 + z * 11);
    p.setXYZ(
      i,
      Math.min(x * n, 0.76 + z * 0.25),
      Math.min(y * n, 0.69 + x * 0.22),
      Math.max(z * n, -0.8 + y * 0.18),
    );
  }
  g.computeVertexNormals();
  return g;
}
const rockGeo = rockGeometry();
const rocks = new THREE.InstancedMesh(rockGeo, stone, 180);
const dummy = new THREE.Object3D();
for (let i = 0; i < 180; i++) {
  let x, z, s;
  if (i < 135) {
    const a = rand(0.04, Math.PI * 1.12);
    x = -35 + Math.cos(a) * rand(17.5, 20.4);
    z = -3 + Math.sin(a) * rand(8.4, 10.4);
    s = rand(0.35, 1.65);
  } else {
    const a = rand(0, Math.PI * 2);
    x = 2 + Math.cos(a) * rand(6.5, 8.4);
    z = -6 + Math.sin(a) * rand(3.9, 5.6);
    s = rand(0.25, 0.85);
  }
  dummy.position.set(x, s * 0.22, z);
  dummy.scale.set(s * rand(0.8, 1.6), s * rand(0.65, 1.3), s);
  dummy.rotation.set(rand(-0.2, 0.2), rand(0, 6.28), rand(-0.3, 0.3));
  dummy.updateMatrix();
  rocks.setMatrixAt(i, dummy.matrix);
  rocks.setColorAt(i, new THREE.Color().setHSL(0.16, 0.06, rand(0.72, 1.0)));
}
rocks.castShadow = true;
rocks.receiveShadow = true;
originalScene.add(rocks);

const leafGeometry = new THREE.BufferGeometry();
leafGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      0, 0.5, 0, -0.14, 0, 0.025, 0, -0.5, 0, 0, 0.5, 0, 0, -0.5, 0, 0.14, 0,
      0.025,
    ],
    3,
  ),
);
leafGeometry.computeVertexNormals();
const foliageMaterial = new THREE.MeshStandardMaterial({
  color: "#c5cfb6",
  roughness: 1,
  side: THREE.DoubleSide,
});
const windUniform = { value: 0 };
foliageMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.windTime = windUniform;
  shader.vertexShader = "uniform float windTime;\n" + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
vec4 anchor = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
transformed.x += sin(windTime*0.7 + anchor.x*.23 + anchor.y*.55)*.12;
transformed.z += cos(windTime*.5 + anchor.z*.3)*.08;`,
  );
};
const leafMatrices = [],
  leafColors = [],
  branchGeos = [];
function branch(points, radius) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const g = new THREE.TubeGeometry(
    curve,
    Math.max(8, points.length * 5),
    radius,
    9,
    false,
  );
  const bp = g.attributes.position,
    segments = g.parameters.tubularSegments;
  for (let i = 0; i < bp.count; i++) {
    const t = Math.floor(i / 10) / segments,
      c = curve.getPointAt(Math.min(t, 1)),
      scale = 1 - t * 0.83;
    bp.setXYZ(
      i,
      c.x + (bp.getX(i) - c.x) * scale,
      c.y + (bp.getY(i) - c.y) * scale,
      c.z + (bp.getZ(i) - c.z) * scale,
    );
  }
  g.computeVertexNormals();
  branchGeos.push(g);
  return curve;
}
function leaf(x, y, z, size) {
  dummy.position.set(x, y, z);
  dummy.scale.set(size * rand(0.75, 1.2), size, size);
  dummy.rotation.set(rand(-0.8, 0.8), rand(0, 6.28), rand(-0.55, 0.55));
  dummy.updateMatrix();
  leafMatrices.push(dummy.matrix.clone());
  leafColors.push(
    new THREE.Color().setHSL(
      rand(0.17, 0.24),
      rand(0.12, 0.28),
      rand(0.35, 0.65),
    ),
  );
}
// Stable planting seed keeps the grove composition repeatable.
seed = 1146177413;
const willowMap = await new THREE.TextureLoader().loadAsync(
  `${assetBase}willow-foliage.png`,
);
willowMap.colorSpace = THREE.SRGBColorSpace;
const willowWash = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  uniforms: { map: { value: willowMap }, time: windUniform },
  vertexShader: `uniform float time;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x+=sin(time*.55+position.y*.25)*(1.0-uv.y)*.17;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
  fragmentShader: `uniform sampler2D map;varying vec2 vUv;void main(){vec4 s=texture2D(map,vUv);float pigment=max(s.r,s.g)-s.b;float a=smoothstep(.024,.085,pigment);vec3 c=mix(s.rgb,vec3(.47,.54,.37),.18)*.65;float veil=.82+.18*sin(vUv.x*3.0+vUv.y*4.0);
gl_FragColor=vec4(c,a*.92*veil);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
});
for (const [x, z, h, spread] of [
  [-41, 4, 24, 9],
  [-29, -1, 22, 9],
  [-17, -6, 13, 4],
]) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2,
      r = spread * (i % 2 ? 0.62 : 0.85),
      top = h * (0.81 + 0.12 * Math.sin(i * 2.7));
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(h * 0.44, h * 0.82, 3, 12),
      willowWash,
    );
    patch.position.set(
      x + Math.cos(a) * r,
      top - h * 0.375,
      z + Math.sin(a) * r * 0.44,
    );
    patch.rotation.y = Math.sin(a) * 0.35;
    originalScene.add(patch);
  }
}
function tree(x, y, z, h) {
  branch(
    [
      [x, y, z],
      [x + 0.2, y + h * 0.65, z],
      [x - 0.1, y + h, z],
    ],
    h * 0.034,
  );
  for (let j = 0; j < 7; j++) {
    const a = rand(0, 6.28),
      r = h * rand(0.22, 0.47),
      cx = x + Math.cos(a) * r,
      cy = y + h * rand(0.58, 0.95),
      cz = z + Math.sin(a) * r;
    branch(
      [
        [x, y + h * 0.35, z],
        [cx, cy, cz],
      ],
      h * 0.015,
    );
    for (let k = 0; k < 100; k++) {
      const az = rand(0, 6.28),
        v = rand(-1, 1),
        d = Math.cbrt(random()) * h * 0.25;
      leaf(
        cx + Math.cos(az) * Math.sqrt(1 - v * v) * d,
        cy + v * d * 0.75,
        cz + Math.sin(az) * Math.sqrt(1 - v * v) * d,
        rand(0.25, 0.6),
      );
    }
  }
}
for (let i = 0; i < 27; i++) {
  const x = rand(-46, 8),
    z = rand(-12, -5);
  if (x > -14 && x < -1) continue;
  tree(x, 1, z, rand(2.3, 6.2));
}

for (let i = 0; i < 260; i++) {
  const x = rand(-51, 9),
    z = rand(-11, 7);
  const onLeft = ((x + 35) / 18) ** 2 + ((z + 3) / 8) ** 2 < 1;
  const onRight = ((x - 2) / 7) ** 2 + ((z + 6) / 4) ** 2 < 1;
  if (
    !(onLeft || onRight) ||
    Math.hypot(x + 25, z) < 4.7 ||
    (x > -15 && x < 0 && Math.abs(z + 2) < 3)
  )
    continue;
  const h = rand(0.35, 1.7),
    y = onRight ? 0.8 : 1.0;
  for (let k = 0; k < 170; k++) {
    const a = rand(0, 6.28),
      v = rand(-1, 1),
      d = Math.cbrt(random()) * h;
    leaf(
      x + Math.cos(a) * Math.sqrt(1 - v * v) * d,
      y + (v + 1) * h * 0.5,
      z + Math.sin(a) * Math.sqrt(1 - v * v) * d,
      rand(0.15, 0.36),
    );
  }
}
mesh(mergeGeometries(branchGeos), bark);
branchGeos.forEach((g) => g.dispose());
const leaves = new THREE.InstancedMesh(
  leafGeometry,
  foliageMaterial,
  leafMatrices.length,
);
leafMatrices.forEach((m, i) => {
  leaves.setMatrixAt(i, m);
  leaves.setColorAt(i, leafColors[i]);
});
leaves.castShadow = true;
leaves.receiveShadow = true;
originalScene.add(leaves);

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

try {
  const gltf = await new GLTFLoader().loadAsync(`${assetBase}architecture.glb`);
  originalScene.add(gltf.scene);
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      const positions = o.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i),
          y = positions.getY(i),
          z = positions.getZ(i);
        if (z < -28) {
          positions.setX(i, 5.9 + (x - 3) * 4.02);
          positions.setZ(i, -135 + (z + 35) * 4.02);
          positions.setY(i, -0.6 + (y - 11) * 2.49);
        } else if (Math.abs(x + 25) < 5.5 && Math.abs(z) < 5.5) {
          positions.setX(i, -27 + (x + 25) * 1.4);
          positions.setY(i, 0.2 + (y - 0.2) * 1.35);
          positions.setZ(i, z * 1.4);
        }
      }
      positions.needsUpdate = true;
      o.geometry.computeBoundingSphere();
      if (o.material.name !== "ridge") inkEdges(o, 27, 0.35);
      o.castShadow = true;
      o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        m.roughness = 0.95;
        inkMaterial(m, 0.23);
        const palette = {
          roof: "#303d3d",
          ridge: "#44534d",
          wood: "#817359",
          wooddark: "#383f32",
          woodlight: "#927957",
          stone: "#d3c9ab",
          stone2: "#b1bab0",
          stoneedge: "#ccc7b2",
          shadow: "#273933",
          mortar: "#777865",
          boat: "#624c30",
          cloth: "#666a58",
          plaster: "#e2e3d6",
        };
        if (palette[m.name]) m.color.set(palette[m.name]);
        if (/stone|limestone|rock/i.test(m.name)) {
          m.map = texture;
          m.bumpMap = texture;
          m.bumpScale = 0.07;
          m.needsUpdate = true;
        }
      }
    }
  });
  window.architecture = gltf.scene;
  const trunks = await new GLTFLoader().loadAsync(
    `${assetBase}willow-trunks.glb`,
  );
  trunks.scene.traverse((o) => {
    if (o.isMesh) {
      const points = o.geometry.attributes.position;
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i),
          y = points.getY(i),
          top = x < -34 ? 21.5 : x < -21 ? 19.5 : 11.3;
        if (y > top) points.setY(i, top + (y - top) * 0.35);
      }
      points.needsUpdate = true;
      o.geometry.computeBoundingSphere();
      o.castShadow = true;
      o.receiveShadow = true;
      o.material.color.set(
        o.material.name === "willow_bark" ? "#4a4b3e" : "#353e32",
      );
      o.material.map = texture;
      o.material.bumpMap = texture;
      o.material.bumpScale = 0.16;
    }
  });
  originalScene.add(trunks.scene);
  const shore = await new GLTFLoader().loadAsync(`${assetBase}shore-rocks.glb`);
  shore.scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.material.roughness = 1;
      inkMaterial(o.material, 0.18);
      inkEdges(o, 19, 0.48);
    }
  });
  originalScene.add(shore.scene);
} catch (error) {
  document.querySelector("#loading").textContent = "亭桥尚未载入，请刷新重试";
  console.error(error);
  throw error;
}

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
let currentDestination = "three-pools";
let activeGroup = originalScene;
let selectionVersion = 0;
const destinationSelect = document.querySelector("#destination");
const loading = document.querySelector("#loading");
async function switchDestination(id) {
  const version = ++selectionVersion;
  const config = destinations[id];
  loading.textContent = `正在铺开${config.title}…`;
  loading.classList.remove("done");
  destinationSelect.value = id;
  try {
    const group =
      id === "three-pools"
        ? originalScene
        : await loadDestination(id, {
            assetBase,
            texture,
            inkMaterial,
            inkEdges,
            time: windUniform,
          });
    if (version !== selectionVersion) return;
    activeGroup.visible = false;
    if (!group.parent) scene.add(group);
    group.visible = true;
    activeGroup = group;
    currentDestination = id;
    sceneView = config.view;
    scene.background.set(config.paper);
    scene.fog.color.set(config.fog);
    scene.fog.density = config.density;
    skyLight.color.set(config.sky);
    skyLight.groundColor.set(config.ground);
    sun.color.set(config.sun);
    sun.intensity = config.sunPower;
    backdrop.material.map = group.userData.backdrop || mountainMap;
    backdropWash.value.fromArray(config.wash);
    backdropWashAmount.value = config.washAmount;
    water.material.uniforms.waterTintBase.value.fromArray(config.water);
    water.material.uniforms.originalBanks.value = id === "three-pools";
    const centers = water.material.uniforms.rippleCenters.value;
    const shapes = water.material.uniforms.rippleShapes.value;
    water.material.uniforms.rippleCount.value =
      id === "three-pools" ? 4 : id === "broken-bridge" ? 0 : 1;
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
    destinationSelect.value = currentDestination;
    history.replaceState(null, "", `#${currentDestination}`);
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
await switchDestination(destinationFromHash(location.hash));
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
    return leafMatrices.length;
  },
  fps: 0,
  get destination() {
    return currentDestination;
  },
  get loading() {
    return !loading.classList.contains("done");
  },
  ready: true,
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
document.querySelector("#loading").classList.add("done");
