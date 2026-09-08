import * as THREE from "three";

function skyDisc(group, moon) {
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(17, 17),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { moon: { value: moon ? 1 : 0 } },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: `uniform float moon;varying vec2 vUv;
      void main(){float r=length(vUv-.5)*2.0;
      float disc=1.0-smoothstep(.38,.43,r);float halo=exp(-r*r*5.0)*.16;
      vec3 color=mix(vec3(1.0,.67,.31),vec3(.96,.97,.86),moon);
      gl_FragColor=vec4(color,disc*.72+halo);}`,
    }),
  );
  disc.position.set(moon ? 23 : -27, moon ? 23 : 19, -90);
  group.add(disc);
}

function particles(group, config, time) {
  const rain = Boolean(config.rain);
  const count = rain ? 380 : 140;
  const positions = [];
  for (let i = 0; i < count; i++)
    positions.push(
      Math.sin(i * 2.39) * 43,
      (i * 0.731) % 25,
      Math.cos(i * 4.27) * 30,
    );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const material = new THREE.PointsMaterial({
    color: config.petals || "#c0d0cf",
    size: rain ? 0.7 : 0.13,
    transparent: true,
    opacity: rain ? 0.37 : 0.8,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.sceneTime = time;
    shader.vertexShader = "uniform float sceneTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      transformed.y=mod(position.y-sceneTime*${rain ? "8.0" : ".65"}+2500.0,25.0);
      transformed.x+=sin(sceneTime*.25+position.z)*${rain ? ".15" : "1.6"};`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      rain
        ? "diffuseColor.a *= (1.0-smoothstep(.03,.09,abs(gl_PointCoord.x-.5)))*(1.0-smoothstep(.3,.5,abs(gl_PointCoord.y-.5)));\n#include <opaque_fragment>"
        : "diffuseColor.a *= 1.0-smoothstep(.15,.5,length((gl_PointCoord-.5)*vec2(1.0,1.5)));\n#include <opaque_fragment>",
    );
  };
  group.add(new THREE.Points(geometry, material));
}

function mist(group, time) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { sceneTime: time },
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `uniform float sceneTime;varying vec2 vUv;
      void main(){vec2 uv=vUv;float band=exp(-pow((uv.y-.5)*5.5,2.0));
      float wisps=.55+.25*sin(uv.x*18.0+sceneTime*.05)+.2*sin(uv.x*39.0-uv.y*6.0+sceneTime*.07);
      float edge=smoothstep(0.0,.18,uv.x)*(1.0-smoothstep(.82,1.0,uv.x));
      gl_FragColor=vec4(.91,.93,.86,band*wisps*edge*.36);}`,
  });
  for (const [y, z, width] of [
    [6, -22, 120],
    [11, -50, 150],
    [3, -3, 100],
  ]) {
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(width, 8), material);
    cloud.position.set(0, y, z);
    group.add(cloud);
  }
}

function tide(group, time) {
  const wave = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 70),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { sceneTime: time },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: `uniform float sceneTime;varying vec2 vUv;
      void main(){float crest=pow(.5+.5*sin(vUv.y*42.0+sin(vUv.x*31.0)*.45+sceneTime*.9),28.0);
      float feather=.5+.5*sin(vUv.x*430.0+sin(vUv.y*71.0));
      float edge=smoothstep(0.0,.12,vUv.y)*(1.0-smoothstep(.85,1.0,vUv.y));
      gl_FragColor=vec4(.89,.94,.88,crest*feather*edge*.48);}`,
    }),
  );
  wave.rotation.x = -Math.PI / 2;
  wave.position.set(0, 0.04, 28);
  group.add(wave);
}

function birds(group, time) {
  const vertices = [];
  for (let i = 0; i < 12; i++) {
    const x = -20 + i * 3.3,
      y = 12 + Math.sin(i * 2.7) * 2,
      z = -15 - i * 0.8;
    vertices.push(
      x - 0.35,
      y + 0.13,
      z,
      x,
      y,
      z,
      x,
      y,
      z,
      x + 0.35,
      y + 0.13,
      z,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  const material = new THREE.LineBasicMaterial({
    color: "#575c43",
    transparent: true,
    opacity: 0.6,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.sceneTime = time;
    shader.vertexShader = "uniform float sceneTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed.x += sin(sceneTime*.11)*3.0;transformed.y += sin(sceneTime*1.5+position.x)*.2;",
    );
  };
  group.add(new THREE.LineSegments(geometry, material));
}

export function addAtmosphere(group, config, time) {
  if (group.name === "leifeng" || config.moon)
    skyDisc(group, Boolean(config.moon));
  if (config.rain || config.petals) particles(group, config, time);
  if (config.clouds) mist(group, time);
  if (config.tide) tide(group, time);
  if (config.birds) birds(group, time);
}
