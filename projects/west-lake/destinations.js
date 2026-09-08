import * as THREE from "three";
import { loadTexture, loadModel, disposeGroup } from "./assets.js";
import { inkMaterials } from "./materials.js";

import { addAtmosphere } from "./atmosphere.js";
import { destinations } from "./catalog.js";
export {
  destinations,
  destinationFromHash,
  collections,
  destinationOrder,
} from "./catalog.js";

// New landscapes use restrained surface grain; the original shore ink shader is
// tied to its particular towers and projects oversized markings on broad hills.
function landscapeMaterial(material, hillside) {
  const terrain = /^(earth|sand)$/.test(material.name);
  const hill = /^(earth|mountain|mountainfar)$/.test(material.name);
  material.customProgramCacheKey = () => `landscape-${terrain}-${hill}`;
  // Keep depth writes on the opaque pass. Transparent ground would overpaint
  // alpha tree crowns and expose triangular patches when the camera moves.
  if (terrain) material.alphaHash = true;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec3 landscapePosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nlandscapePosition=(modelMatrix*vec4(position,1.0)).xyz;",
    );
    shader.uniforms.hillsideInk = { value: hillside };
    shader.fragmentShader =
      "uniform sampler2D hillsideInk;varying vec3 landscapePosition;\n" +
      shader.fragmentShader;
    if (/^(earth|mountain|mountainfar)$/.test(material.name)) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 forestPigment=texture2D(hillsideInk,landscapePosition.xz*.016+landscapePosition.y*.003).rgb;
        float hill=smoothstep(.8,4.0,landscapePosition.y);
        diffuseColor.rgb=mix(diffuseColor.rgb,forestPigment*.8+diffuseColor.rgb*.2,hill*.7);`,
      );
    }
    if (terrain) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <alphahash_fragment>",
        "diffuseColor.a*=smoothstep(-105.0,-32.0,landscapePosition.z);\n#include <alphahash_fragment>",
      );
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
      float wash=sin(landscapePosition.x*.43+sin(landscapePosition.z*.37))*sin(landscapePosition.y*.55+landscapePosition.z*.29);
      gl_FragColor.rgb*=1.0+wash*.025;`,
    );
  };
}

// Keep three recent scenes, including Three Pools. Shared textures stay cached.
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
    const backdropPromise = loadTexture(config.backdrop || "mountains-v2.png");
    if (id === "three-pools") {
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
    const legacyInk = ["leifeng", "broken-bridge", "nine-creeks"].includes(id);
    const [model, texture, canopyTexture, hillside, inkTexture, backdrop] =
      await Promise.all([
        loadModel(config.asset, signal),
        loadTexture("limestone.png"),
        id === "broken-bridge" ? null : loadTexture("woodland-canopy.png"),
        legacyInk ? null : loadTexture("hillside-ink.png"),
        legacyInk ? loadTexture("ink-stone.png") : null,
        backdropPromise,
      ]);
    const group = model.scene;
    if (signal.aborted) {
      disposeGroup(group);
      signal.throwIfAborted();
    }
    group.name = id;
    group.userData.backdrop = backdrop;
    const { inkMaterial, inkEdges } = inkMaterials(inkTexture);
    const meshes = [];
    group.traverse((object) => {
      if (object.isMesh) meshes.push(object);
    });
    for (const object of meshes) {
      const material = object.material;
      material.name = material.name.replace(/\.\d+$/, "");
      object.castShadow = object.receiveShadow = true;
      material.roughness = 1;
      material.side = THREE.DoubleSide;
      if (material.name.startsWith("crown")) {
        object.castShadow = object.receiveShadow = false;
        const tint = config.foliageTint
          ? new THREE.Vector3(...config.foliageTint)
          : material.name.startsWith("crown2")
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
            pigmentDepth: {
              value: ["leifeng", "broken-bridge", "nine-creeks"].includes(id)
                ? 1
                : 0.6,
            },
          },
          vertexShader: `uniform float sceneTime; varying vec2 vUv; varying vec3 canopyPosition;
            #include <fog_pars_vertex>
            void main(){vUv=uv;canopyPosition=(modelMatrix*vec4(position,1.0)).xyz;vec3 p=position;p.x+=sin(sceneTime*.55+position.z*.24)*.10*(.3+uv.y*.7);vec4 mvPosition=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mvPosition;
            #include <fog_vertex>
            }`,
          fragmentShader: `uniform sampler2D canopy;uniform float pigmentDepth;uniform vec3 tint;varying vec2 vUv;varying vec3 canopyPosition;
            #include <fog_pars_fragment>
            void main(){vec3 pigment=texture2D(canopy,vUv).rgb;float alpha=smoothstep(.018,.13,max(pigment.r,pigment.g)-pigment.b);if(alpha<.12)discard;vec3 foliageColor=clamp((pigment-vec3(1.0-alpha))/max(alpha,.05),0.0,1.0)*tint*.80;foliageColor=mix(vec3(.10,.17,.075)*tint,foliageColor,pigmentDepth);gl_FragColor=vec4(foliageColor,alpha*smoothstep(-105.0,-32.0,canopyPosition.z));
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
      } else if (["waterfall", "pool"].includes(material.name)) {
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
        if (["leifeng", "broken-bridge", "nine-creeks"].includes(id)) {
          if (material.name !== "earth") inkMaterial(material, 0.12);
        } else {
          if (/stone|earth|bark|paving|brick|sand/.test(material.name)) {
            material.map = texture;
            material.bumpMap = texture;
            material.bumpScale = 0.045;
          }
          landscapeMaterial(material, hillside);
        }
        if (/stoneedge|wooddark/.test(material.name))
          inkEdges(object, 32, 0.18);
      }
    }
    addAtmosphere(group, config, time);
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
    resolved.set(id, group);
    return group;
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
