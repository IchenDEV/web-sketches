import * as THREE from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import { loadTexture, loadModel } from "./assets.js";
import { inkMaterials } from "./materials.js";
export async function buildThreePools(windUniform, signal) {
  const [
    texture,
    inkTexture,
    willowMap,
    initialArchitecture,
    initialTrunks,
    initialShore,
  ] = await Promise.all([
    loadTexture("limestone.png"),
    loadTexture("ink-stone.png"),
    loadTexture("willow-foliage.png"),
    loadModel("architecture.glb", signal),
    loadModel("willow-trunks.glb", signal),
    loadModel("shore-rocks.glb", signal),
  ]);
  signal.throwIfAborted();
  const originalScene = new THREE.Group();
  originalScene.name = "three-pools";
  const { inkMaterial, inkEdges } = inkMaterials(inkTexture);
  let seed = 1790489760;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  const rand = (a, b) => a + (b - a) * random();
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
  stone.userData.originalStone = true;
  inkMaterial(stone, 0.32);
  inkMaterial(bark, 0.22);
  function mesh(geometry, material) {
    const object = new THREE.Mesh(geometry, material);
    object.castShadow = object.receiveShadow = true;
    originalScene.add(object);
    return object;
  }
  function land(cx, cz, sx, sz, height) {
    const g = new THREE.SphereGeometry(1, 64, 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const n =
        1 +
        0.06 * Math.sin(x * 14 + z * 11) +
        0.035 * Math.sin(z * 24 - x * 17);
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

  const gltf = initialArchitecture;
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

  const trunks = initialTrunks;
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
  const shore = initialShore;
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
  originalScene.userData.leafCount = leafMatrices.length;
  return originalScene;
}
