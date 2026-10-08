import * as THREE from 'three';
import { energyFrame } from './energyFacts.js';

const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const auraFragment = `
precision highp float;
varying vec2 vUv;
uniform float uTime,uStrength,uMaskMode;
uniform vec2 uResolution;
uniform vec4 uRect;
uniform sampler2D uMask;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=noise(p)*a;p=p*2.03+7.1;a*=.5;}return n;}
float maskAt(vec2 p){
 vec2 q=abs(p-.5)-vec2(.465,.475);
 float card=1.-smoothstep(-.006,.006,length(max(q,0.))+min(max(q.x,q.y),0.)-.035);
 float person=texture2D(uMask,vec2(p.x,1.-p.y)).a*step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);
 return mix(person,card,uMaskMode);
}
void main(){
 vec2 pixel=vec2(vUv.x,1.-vUv.y)*uResolution;
 vec2 p=(pixel-uRect.xy)/uRect.zw;
 if(p.x<-.25||p.x>1.25||p.y<-.2||p.y>1.15)discard;
 float t=uTime;
 vec2 flow=vec2(fbm(p*3.8+vec2(0,t*.14)),fbm(p*4.3+vec2(3,t*.22)));
 vec2 warped=p+(flow-.5)*vec2(.045,.025);
 float rim=0.,halo=0.;
 for(int i=0;i<12;i++){
   float a=float(i)*.5235988;vec2 d=vec2(cos(a),sin(a));
   rim+=maskAt(warped+d*vec2(.020,.014));
   halo+=maskAt(warped+d*vec2(.085,.055));
 }
 rim/=12.;halo/=12.;
 float outside=1.-maskAt(p);
 float intensity=(rim*.28+halo*.23)*outside;
 intensity*=uStrength*(.88+.12*sin(t*.8));
 vec3 color=mix(vec3(.57,.012,.095),vec3(1.,.09,.24),clamp(intensity*.8,0.,1.));
 gl_FragColor=vec4(color,clamp(intensity,0.,.75));
}`;

const ribbonVertex = `
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec4 uRect;
uniform vec2 uA,uB,uC,uD;
uniform float uTime,uSeed,uWidth;
void main(){
 vUv=uv;float t=uv.x,q=1.-t;
 vec2 centre=q*q*q*uA+3.*q*q*t*uB+3.*q*t*t*uC+t*t*t*uD;
 vec2 tangent=3.*q*q*(uB-uA)+6.*q*t*(uC-uB)+3.*t*t*(uD-uC);
 vec2 normal=normalize(vec2(-tangent.y,tangent.x));
 float taper=pow(max(0.,sin(t*3.14159265)),.75);
 float drift=(sin(t*11.-uTime*.60+uSeed)*.012+sin(t*19.+uTime*.31+uSeed*2.)*.006)*taper;
 centre+=normal*drift;
 centre+=normal*(uv.y*2.-1.)*uWidth*taper;
 vec2 pixel=uRect.xy+centre*uRect.zw;
 gl_Position=vec4(pixel.x/uResolution.x*2.-1.,1.-pixel.y/uResolution.y*2.,0.,1.);
}`;
const ribbonFragment = `
precision highp float;
varying vec2 vUv;uniform float uTime,uSeed,uStrength;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
 float t=vUv.x,across=vUv.y*2.-1.;
 float fluid=noise(vec2(t*8.-uTime*.16,uSeed+uTime*.09));
 float strand=(fluid-.5)*.7;
 float core=exp(-pow(across-strand,2.)*90.);
 float second=exp(-pow(across+strand*.7+.28,2.)*160.)*.35;
 float veil=pow(max(0.,1.-abs(across)),2.)*.58;
 float current=.30+.70*noise(vec2(t*15.+uTime*.35,uSeed*3.));
 float ends=pow(max(0.,sin(t*3.14159265)),.65);
 float alpha=(core*.54+second+veil)*ends*current*uStrength;
 vec3 color=mix(vec3(.53,.008,.085),vec3(1.,.12,.28),core*.75);
 gl_FragColor=vec4(color,alpha);
}`;
const blurFragment = `varying vec2 vUv;uniform sampler2D uTexture;uniform vec2 uPixel;
void main(){vec4 c=texture2D(uTexture,vUv)*.2;
c+=texture2D(uTexture,vUv+uPixel*vec2(1.,0.))*.12;c+=texture2D(uTexture,vUv-uPixel*vec2(1.,0.))*.12;
c+=texture2D(uTexture,vUv+uPixel*vec2(0.,1.))*.12;c+=texture2D(uTexture,vUv-uPixel*vec2(0.,1.))*.12;
c+=texture2D(uTexture,vUv+uPixel*vec2(1.,1.))*.08;c+=texture2D(uTexture,vUv-uPixel*vec2(1.,1.))*.08;
c+=texture2D(uTexture,vUv+uPixel*vec2(1.,-1.))*.08;c+=texture2D(uTexture,vUv-uPixel*vec2(1.,-1.))*.08;gl_FragColor=c;}`;

const glowFragment = `varying vec2 vUv;uniform sampler2D uTexture;uniform vec2 uPixel;
void main(){vec4 raw=texture2D(uTexture,vUv);vec4 glow=raw*.2;
glow+=texture2D(uTexture,vUv+uPixel*vec2(1.,0.))*.12;glow+=texture2D(uTexture,vUv-uPixel*vec2(1.,0.))*.12;
glow+=texture2D(uTexture,vUv+uPixel*vec2(0.,1.))*.12;glow+=texture2D(uTexture,vUv-uPixel*vec2(0.,1.))*.12;
glow+=texture2D(uTexture,vUv+uPixel*vec2(1.,1.))*.08;glow+=texture2D(uTexture,vUv-uPixel*vec2(1.,1.))*.08;
glow+=texture2D(uTexture,vUv+uPixel*vec2(1.,-1.))*.08;glow+=texture2D(uTexture,vUv-uPixel*vec2(1.,-1.))*.08;
vec4 energy=raw*.8+glow*.85;gl_FragColor=vec4(energy.rgb,min(energy.a,.85));}`;

/** A single disposable renderer, lazy loaded only for full graphics. DOM content stays accessible. */
export async function mountFullScene(root: HTMLElement, onFailure: () => void, signal?: AbortSignal): Promise<() => void> {
  const canvas = document.createElement('canvas');
  canvas.className = 'webgl-field'; canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0); renderer.autoClear = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.debug.onShaderError = () => { queueMicrotask(onFailure); };
  const life = new AbortController();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  let disposed = false, raf = 0, w = 0, h = 0, previous = 0, elapsed = 0;
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  const auraTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const cleanup = () => {
    if (disposed) return; disposed = true; cancelAnimationFrame(raf); life.abort();
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    signal?.removeEventListener('abort', cleanup);
    target.dispose(); auraTarget.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  };
  signal?.addEventListener('abort', cleanup, { once: true });
  if (signal?.aborted) { cleanup(); throw new DOMException('Cancelled', 'AbortError'); }
  const loader = new THREE.TextureLoader();
  let cardTexture: THREE.Texture, mask: THREE.Texture;
  try { [cardTexture, mask] = await Promise.all([loader.loadAsync('/art/card-back.png'), loader.loadAsync('/art/character.png')].map(p => p.then(t => { if (disposed) t.dispose(); else textures.push(t); return t; }))); }
  catch (error) { cleanup(); throw error; }
  if (disposed) throw new DOMException('Cancelled', 'AbortError');
  try {
    // The source includes a backdrop. Sample only the actual flat card face.
    cardTexture.colorSpace = THREE.SRGBColorSpace;
    cardTexture.offset.set(.105, .092); cardTexture.repeat.set(.79, .828);
    cardTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const screenCamera = new THREE.Camera();
    const plane = new THREE.PlaneGeometry(2, 2); geometries.push(plane);
    const auraMaterial = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: auraFragment, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uStrength: { value: 1 }, uMaskMode: { value: 0 }, uResolution: { value: new THREE.Vector2() }, uRect: { value: new THREE.Vector4() }, uMask: { value: mask } } });
    materials.push(auraMaterial);
    const auraScene = new THREE.Scene(); auraScene.add(new THREE.Mesh(plane, auraMaterial));
    // Curved energy membranes are separate geometry, rather than vertical noise stripes.
    const ribbonGeometry = new THREE.PlaneGeometry(1, 1, 72, 1); geometries.push(ribbonGeometry);
    const routes = [
      [.25,.94,-.35,.72,.45,.55,.10,.25], [.43,.90,-.15,.75,.05,.35,.20,.08],
      [.32,.51,.06,.37,.57,.22,.42,-.05], [.43,.27,.18,.08,.70,.13,.64,-.06],
      [.84,.86,1.22,.54,.72,.37,.96,.18], [.75,.68,1.17,.44,.75,.30,.95,.02],
      [.86,.55,1.05,.38,.72,.28,1.02,.11], [.74,.25,1.02,.10,.74,.04,.90,-.07],
      [.75,1.12,.22,1.07,.07,.97,-.08,.83], [.18,.91,-.20,.53,.39,.43,.12,.14],
      [.88,.97,1.28,.56,.78,.36,1.12,.08], [.40,.35,.13,.12,.61,.18,.48,-.12],
    ];
    const ribbons = routes.map((route,i) => {
      const material = new THREE.ShaderMaterial({ vertexShader: ribbonVertex, fragmentShader: ribbonFragment, transparent: true, depthTest: false, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uSeed: { value: i * 1.73 }, uStrength: { value: 1 }, uWidth: { value: i < 9 ? .055 : .016 },
          uResolution: auraMaterial.uniforms.uResolution, uRect: auraMaterial.uniforms.uRect,
          uA: { value: new THREE.Vector2(route[0],route[1]) }, uB: { value: new THREE.Vector2(route[2],route[3]) },
          uC: { value: new THREE.Vector2(route[4],route[5]) }, uD: { value: new THREE.Vector2(route[6],route[7]) } } });
      materials.push(material); const mesh = new THREE.Mesh(ribbonGeometry, material); mesh.frustumCulled = false; mesh.renderOrder = i + 1; auraScene.add(mesh); return material;
    });
    const glowMaterial = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: glowFragment, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
      uniforms: { uTexture: { value: auraTarget.texture }, uPixel: { value: new THREE.Vector2() } } });
    materials.push(glowMaterial); const glowScene = new THREE.Scene(); glowScene.add(new THREE.Mesh(plane, glowMaterial));
    const compositeMaterial = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: blurFragment, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uTexture: { value: target.texture }, uPixel: { value: new THREE.Vector2() } } });
    materials.push(compositeMaterial);
    const compositeScene = new THREE.Scene(); compositeScene.add(new THREE.Mesh(plane, compositeMaterial));
    const scene = new THREE.Scene(), foreground = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
    for (const s of [scene, foreground]) {
      s.add(new THREE.AmbientLight(0xffffff, .72));
      const key = new THREE.DirectionalLight(0xffe6ef, 1.6); key.position.set(-300, 350, 500); s.add(key);
      const rim = new THREE.DirectionalLight(0xee1745, .85); rim.position.set(400, -200, 150); s.add(rim);
    }
    const shape = new THREE.Shape(); const radius = .045, x = -.5, y = -.75, width = 1, height = 1.5;
    shape.moveTo(x + radius, y); shape.lineTo(x + width - radius, y); shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius); shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .012, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .004, bevelThickness: .003, curveSegments: 8 });
    // Extrude's cap UVs are shape coordinates; normalize them to the card texture.
    const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
    for (let i = 0; i < positions.count; i++) if (Math.abs(normals.getZ(i)) > .99) uv.setXY(i, positions.getX(i) + .5, (positions.getY(i) + .75) / 1.5);
    geometries.push(geometry);
    const specs = [
      [.035,.31,.048,-.38,-240,.25,0], [.31,.16,.038,.31,-200,.28,0], [.57,.16,.038,-.28,-170,.26,0],
      [.47,.67,.030,.38,-200,.25,0], [.42,.23,.089,.19,0,.80,1], [.97,.40,.075,-.21,55,.70,1],
      [.36,.78,.111,.39,45,.75,0], [.075,1.05,.36,.48,180,.70,0], [1.055,.01,.23,-.3,150,.50,0],
      [.93,.69,.045,-.28,-200,.27,0],
    ];
    const red = new THREE.MeshBasicMaterial({ color: 0xe22851, transparent: true, opacity: .85 }); materials.push(red);
    const threadGeometry = new THREE.CylinderGeometry(.0022, .0022, 1, 6); geometries.push(threadGeometry);
    const cards = specs.map((spec, i) => {
      const [sx,sy,size,angle,z,opacity,tied] = spec;
      const face = new THREE.MeshStandardMaterial({ map: cardTexture, roughness: .56, metalness: .34, color: new THREE.Color().setScalar(opacity), emissive: 0x4d0a1b, emissiveMap: cardTexture, emissiveIntensity: .07 });
      const edge = new THREE.MeshStandardMaterial({ color: 0x7e324a, metalness: .65, roughness: .38 }); materials.push(face, edge);
      const group = new THREE.Group(); group.add(new THREE.Mesh(geometry, [face, edge]));
      const strings: THREE.Line[] = [];
      if (tied) {
        // Wrap around the upper third, with real thickness and no drilled holes.
        for (const dy of [0,.025]) {
          const band = new THREE.Mesh(threadGeometry, red); band.rotation.z = Math.PI / 2; band.position.set(0,.34 + dy,.024); group.add(band);
        }
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xc72c50, transparent: true, opacity: .68 }); materials.push(lineMaterial);
        for (let side = 0; side < 2; side++) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 18 }, () => new THREE.Vector3())); geometries.push(lineGeometry);
          const line = new THREE.Line(lineGeometry, lineMaterial); scene.add(line); strings.push(line);
        }
      }
      ([7,8].includes(i) ? foreground : scene).add(group);
      return { group, strings, sx, sy, size, angle, z, i, face, opacity };
    });
    const emberGeometry = new THREE.BufferGeometry();
    emberGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 3), 3)); geometries.push(emberGeometry);
    const emberMaterial = new THREE.PointsMaterial({ color: 0xff2452, size: 1.7, sizeAttenuation: false, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }); materials.push(emberMaterial);
    const embers = new THREE.Points(emberGeometry, emberMaterial); scene.add(embers);
    const character = root.querySelector<HTMLImageElement>('.character')!;
    const chosenCard = root.querySelector<HTMLElement>('.game-card:nth-child(2)')!;
    const traveller = root.querySelector<HTMLElement>('.traveller')!;
    let px = 0, py = 0, tx = 0, ty = 0;
    root.addEventListener('pointermove', event => { if (event.pointerType === 'mouse') { tx = event.clientX / innerWidth - .5; ty = event.clientY / innerHeight - .5; } }, { passive: true, signal: life.signal });
    root.addEventListener('pointerleave', () => { tx = 0; ty = 0; }, { signal: life.signal });
    function resize() {
      w = innerWidth; h = innerHeight;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w <= 760 ? 1.25 : 1.5)); renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.position.z = h / (2 * Math.tan(THREE.MathUtils.degToRad(17.5))); camera.updateProjectionMatrix();
      target.setSize(Math.ceil(w / 3), Math.ceil(h / 3));
      auraTarget.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
      glowMaterial.uniforms.uPixel.value.set(9 / w, 9 / h);
      compositeMaterial.uniforms.uPixel.value.set(9 / w, 9 / h);
      auraMaterial.uniforms.uResolution.value.set(w, h);
    }
    const start = () => { cancelAnimationFrame(raf); previous = 0; if (!disposed && !document.hidden) raf = requestAnimationFrame(draw); };
    function draw(now: number) {
      raf = 0; if (disposed || document.hidden) return;
      const delta = previous ? Math.min((now - previous) / 1000, .05) : 0; previous = now; elapsed += delta;
      if (w !== innerWidth || h !== innerHeight) resize();
      const phase = Number(root.dataset.phase) || 0, mobile = w <= 760;
      // The energy is handed from the character to the same card that travels through the chapters.
      // Bounds are read from the rendered DOM, so resize, reverse scroll and mobile share one route.
      const energy = energyFrame(phase, character.getBoundingClientRect(), chosenCard.getBoundingClientRect(), traveller.getBoundingClientRect());
      const { rect, strength: fade } = energy;
      auraMaterial.uniforms.uMaskMode.value = energy.mask;
      auraMaterial.uniforms.uTime.value = elapsed;
      auraMaterial.uniforms.uStrength.value = fade * (mobile ? .80 : 1.15);
      ribbons.forEach(material => { material.uniforms.uTime.value = elapsed; material.uniforms.uStrength.value = fade * (mobile ? 1.0 : 1.8); });
      auraMaterial.uniforms.uRect.value.set(rect.x, rect.y, rect.width, rect.height);
      const response = 1 - Math.exp(-delta * 2.6); px += (tx - px) * response; py += (ty - py) * response;
      cards.forEach(card => {
        const { group, sx, sy, size, angle, z, i, strings } = card;
        const quiet = THREE.MathUtils.lerp(1,.28,THREE.MathUtils.smoothstep(phase,.45,1.6));
        card.face.color.setScalar(card.opacity * quiet * quiet);
        group.visible = !mobile || [1,4,5,7].includes(i);
        const projection = (camera.position.z - z) / camera.position.z;
        const width = w * size * projection * (mobile ? 1.55 : 1);
        group.scale.setScalar(width);
        group.position.set(((sx - .5) * w + Math.sin(elapsed * .23 + i * 1.7) * w * .009 + px * (10 + i * 3)) * projection,
          ((.5 - sy) * h + Math.cos(elapsed * .21 + i) * h * .008 + py * 9 - phase * h * .018) * projection, z);
        group.rotation.set(Math.sin(elapsed * .17 + i) * .08, Math.sin(elapsed * .15 + i * 1.3) * .23, angle + Math.sin(elapsed * .21 + i) * .045);
        group.updateMatrixWorld();
        strings.forEach((line, side) => {
          line.visible = group.visible;
          const attachment = group.localToWorld(new THREE.Vector3(side ? .50 : -.50,.36,.025));
          const anchor = new THREE.Vector3(attachment.x - Math.sin(elapsed * .23 + i) * width * .11, h * .8 * projection, z - 1);
          const points = line.geometry.getAttribute('position');
          for (let j = 0; j < points.count; j++) {
            const f = j / (points.count - 1); points.setXYZ(j, THREE.MathUtils.lerp(anchor.x, attachment.x, f) + Math.sin(Math.PI * f) * Math.sin(elapsed * .4 + i) * width * .025, THREE.MathUtils.lerp(anchor.y, attachment.y, f), z + .03);
          }
          points.needsUpdate = true; line.geometry.computeBoundingSphere();
        });
      });
      const emberPositions = emberGeometry.getAttribute('position');
      for (let i = 0; i < emberPositions.count; i++) {
        const x = .54 + ((i * .618034) % 1) * .49;
        const y = (i * .137 + elapsed * .024) % 1;
        emberPositions.setXYZ(i, (x - .5) * w + Math.sin(elapsed * .6 + i) * 12, (y - .5) * h, 90);
      }
      emberPositions.needsUpdate = true; emberMaterial.opacity = fade * .55;
      try {
        if (fade > .001) { renderer.setRenderTarget(auraTarget); renderer.clear(); renderer.render(auraScene, screenCamera); }
        renderer.setRenderTarget(null); renderer.clear();
        if (fade > .001) renderer.render(glowScene, screenCamera);
        renderer.clearDepth(); renderer.render(scene, camera);
        renderer.setRenderTarget(target); renderer.clear(); renderer.render(foreground, camera);
        renderer.setRenderTarget(null); renderer.render(compositeScene, screenCamera);
      } catch { onFailure(); return; }
      root.dataset.graphicsTime = elapsed.toFixed(2);
      root.dataset.auraTarget = energy.target;
      raf = requestAnimationFrame(draw);
    }
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); onFailure(); }, { signal: life.signal });
    document.addEventListener('visibilitychange', start, { signal: life.signal });
    root.querySelector('.stage')!.prepend(canvas); resize(); start();
    return cleanup;
  } catch (error) { cleanup(); throw error; }
}
