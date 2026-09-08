import * as THREE from "three";
export function inkMaterials(inkTexture) {
  function inkMaterial(material, strength = 0.14) {
    const paleStone =
      material.userData.originalStone || /stone|fracture/.test(material.name);
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

  return { inkMaterial, inkEdges };
}
