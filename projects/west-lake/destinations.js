import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

export const destinations = {
  "three-pools": {
    title: "三潭印月",
    subtitle: "一湖烟水 · 半卷江南",
    poem: ["水光潋滟晴方好", "山色空蒙雨亦奇"],
    paper: "#f5f2e8",
    fog: "#e9eadf",
    density: 0.0068,
    sky: "#fbf4de",
    ground: "#748579",
    sun: "#fff9e9",
    sunPower: 2.2,
    wash: [0.84, 0.85, 0.8],
    washAmount: 0.33,
    water: [0.61, 0.71, 0.68],
    view: { width: 43, height: 8, depth: -3, minimum: 64 },
  },
  leifeng: {
    title: "雷峰夕照",
    subtitle: "夕照山 · 暮色入湖",
    poem: ["湖上金波起", "塔影入烟霞"],
    asset: "leifeng.glb",
    paper: "#f5e9d4",
    fog: "#e8cfac",
    density: 0.0055,
    sky: "#ffe4b8",
    ground: "#8a8069",
    sun: "#ffd08a",
    sunPower: 2.5,
    wash: [0.91, 0.69, 0.44],
    washAmount: 0.45,
    water: [0.79, 0.66, 0.46],
    view: { width: 43, height: 8, depth: -3, minimum: 64 },
  },
  "broken-bridge": {
    title: "断桥残雪",
    subtitle: "白堤东端 · 雪霁初晴",
    poem: ["一桥分晴雪", "半湖入画来"],
    asset: "broken-bridge.glb",
    paper: "#eef2f2",
    fog: "#e1e9ec",
    density: 0.008,
    sky: "#ecf4ff",
    ground: "#7f939d",
    sun: "#f7fbff",
    sunPower: 1.5,
    wash: [0.82, 0.89, 0.93],
    washAmount: 0.64,
    water: [0.64, 0.74, 0.79],
    view: { width: 43, height: 6, depth: -3, minimum: 64 },
  },
  "nine-creeks": {
    title: "九溪烟树",
    subtitle: "山林茶径 · 溪声入林",
    poem: ["树深闻水响", "烟起见溪长"],
    asset: "nine-creeks.glb",
    backdrop: "jiuxi-backdrop.png",
    paper: "#eef1e5",
    fog: "#d7e2d1",
    density: 0.01,
    sky: "#f1f4dc",
    ground: "#54745c",
    sun: "#edf2cc",
    sunPower: 1.8,
    wash: [0.66, 0.76, 0.64],
    washAmount: 0.18,
    water: [0.4, 0.59, 0.49],
    view: { width: 31, height: 5, depth: -8, minimum: 50 },
  },
};

export function destinationFromHash(hash) {
  const key = hash.replace(/^#/, "");
  return Object.hasOwn(destinations, key) ? key : "three-pools";
}

// Four destinations form a bounded cache. Revisiting a scene does not reload its assets.
const loaded = new Map();
let canopyPromise;
const decoder = new DRACOLoader();
decoder.setDecoderConfig({ type: "wasm" });
decoder.setWorkerLimit(2);
export function loadDestination(
  id,
  { assetBase, texture, inkMaterial, inkEdges, time },
) {
  if (loaded.has(id)) return loaded.get(id);
  const config = destinations[id];
  const pending = (async () => {
    decoder.setDecoderPath(`${assetBase}draco/`);
    const group = (
      await new GLTFLoader()
        .setDRACOLoader(decoder)
        .loadAsync(`${assetBase}${config.asset}`)
    ).scene;
    group.name = id;
    const canopyTexture =
      id === "broken-bridge"
        ? null
        : await (canopyPromise ??= new THREE.TextureLoader()
            .loadAsync(`${assetBase}woodland-canopy.png`)
            .then((texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.flipY = false;
              return texture;
            })
            .catch((error) => {
              canopyPromise = null;
              throw error;
            }));
    const meshes = [];
    group.traverse((object) => {
      if (object.isMesh) meshes.push(object);
    });
    for (const object of meshes) {
      const material = object.material;
      object.castShadow = object.receiveShadow = true;
      material.roughness = 1;
      material.side = THREE.DoubleSide;
      if (material.name.startsWith("crown")) {
        object.castShadow = object.receiveShadow = false;
        const tint = material.name.startsWith("crown2")
          ? new THREE.Vector3(1.0, 0.93, 0.78)
          : new THREE.Vector3(0.88, 0.97, 0.88);
        object.material = new THREE.ShaderMaterial({
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          fog: true,
          uniforms: {
            ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
            canopy: { value: canopyTexture },
            sceneTime: time,
            tint: { value: tint },
          },
          vertexShader: `uniform float sceneTime; varying vec2 vUv;
            #include <fog_pars_vertex>
            void main(){vUv=uv;vec3 p=position;p.x+=sin(sceneTime*.55+position.z*.24)*.10*(.3+uv.y*.7);vec4 mvPosition=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mvPosition;
            #include <fog_vertex>
            }`,
          fragmentShader: `uniform sampler2D canopy;uniform vec3 tint;varying vec2 vUv;
            #include <fog_pars_fragment>
            void main(){vec3 pigment=texture2D(canopy,vUv).rgb;float alpha=smoothstep(.018,.13,max(pigment.r,pigment.g)-pigment.b);if(alpha<.12)discard;vec3 foliageColor=clamp((pigment-vec3(1.0-alpha))/max(alpha,.05),0.0,1.0)*tint*.80;gl_FragColor=vec4(foliageColor,alpha);
            #include <fog_fragment>
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            }`,
        });
      } else if (material.name.startsWith("leaf")) {
        material.customProgramCacheKey = () => "hangzhou-foliage";
        material.onBeforeCompile = (shader) => {
          shader.uniforms.sceneTime = time;
          shader.vertexShader =
            "uniform float sceneTime;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            transformed.x += sin(sceneTime*.55 + position.z*.24) * smoothstep(1.0,8.0,position.y) * .10;`,
          );
        };
      } else if (material.name === "waterfall") {
        object.castShadow = false;
        material.color.set("#b4cbb8");
        material.onBeforeCompile = (shader) => {
          shader.uniforms.sceneTime = time;
          shader.vertexShader =
            "varying vec3 streamPosition;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nstreamPosition=position;",
          );
          shader.fragmentShader =
            "uniform float sceneTime; varying vec3 streamPosition;\n" +
            shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <dithering_fragment>",
            `#include <dithering_fragment>
            float streak=pow(.5+.5*sin(streamPosition.x*25.0+streamPosition.z*8.0-sceneTime*4.0),9.0);
            gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.91,.96,.91),.35+streak*.35);`,
          );
        };
      } else if (!material.name.startsWith("snow")) {
        if (/stone|earth|bark/.test(material.name)) material.map = texture;
        if (material.name !== "earth") inkMaterial(material, 0.12);
        if (/stoneedge|wooddark/.test(material.name))
          inkEdges(object, 32, 0.18);
      }
    }
    if (config.backdrop) {
      group.userData.backdrop = await new THREE.TextureLoader().loadAsync(
        `${assetBase}${config.backdrop}`,
      );
      group.userData.backdrop.colorSpace = THREE.SRGBColorSpace;
    }
    if (id === "leifeng") {
      const sun = new THREE.Mesh(
        new THREE.PlaneGeometry(15, 15),
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          fog: false,
          vertexShader:
            "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
          fragmentShader:
            "varying vec2 vUv; void main(){float r=length(vUv-.5)*2.0;float disc=1.0-smoothstep(.38,.49,r);float halo=exp(-r*r*5.0)*.18;gl_FragColor=vec4(1.0,.67,.31,disc*.52+halo);}",
        }),
      );
      sun.position.set(-27, 19, -90);
      group.add(sun);
    }
    if (id === "broken-bridge") {
      const points = [];
      for (let i = 0; i < 200; i++)
        points.push(
          Math.sin(i * 2.39) * 48,
          (i * 0.731) % 24,
          Math.cos(i * 4.27) * 25,
        );
      const snowGeometry = new THREE.BufferGeometry();
      snowGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3),
      );
      const snowMaterial = new THREE.PointsMaterial({
        color: "#ffffff",
        size: 0.12,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
      });
      snowMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.sceneTime = time;
        shader.vertexShader =
          "uniform float sceneTime;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          transformed.y=mod(position.y-sceneTime*.35+240.0,24.0);
          transformed.x+=sin(sceneTime*.25+position.z)*.5;`,
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <opaque_fragment>",
          "diffuseColor.a *= 1.0-smoothstep(.18,.5,length(gl_PointCoord-.5));\n#include <opaque_fragment>",
        );
      };
      group.add(new THREE.Points(snowGeometry, snowMaterial));
    }
    return group;
  })().catch((error) => {
    loaded.delete(id);
    throw error;
  });
  loaded.set(id, pending);
  return pending;
}
