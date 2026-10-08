import * as THREE from 'three';
import { energyFrame } from './energyFacts.js';

const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
// A continuous, soft density field has no ribbon edges or low-resolution silhouette sampling.
const auraFragment = `
precision highp float;
varying vec2 vUv;
uniform float uTime,uAttached,uSpread,uDiffuse;
uniform vec2 uResolution;
uniform vec4 uRect;
uniform sampler2D uNoise;
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return texture2D(uNoise,(i+f+.5)/128.).r;}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<3;i++){n+=noise(p)*a;p=p*2.01+7.1;a*=.5;}return n;}
float gaussian(float x,float width){return exp(-x*x/(width*width));}
void main(){
 vec2 pixel=vec2(vUv.x,1.-vUv.y)*uResolution;
 vec2 p=(pixel-uRect.xy)/uRect.zw;
 if(p.x<-.45||p.x>1.45||p.y<-.40||p.y>1.40)discard;
 float t=uTime;
 // Broad domain warping, followed by finer drifting folds, creates connected translucent plumes.
 vec2 warp=vec2(fbm(p*vec2(3.4,4.6)+vec2(t*.055,t*.09)),fbm(p*vec2(4.1,3.8)+vec2(8.,t*.075)));
 vec2 flow=p+(warp-.5)*mix(.22,.36,uSpread);
 float folds=fbm(flow*vec2(6.2,4.1)+vec2(t*.035,t*.12));
 float distanceToFold=abs(folds-.50);
 float aa=max(fwidth(distanceToFold)*1.4,.0015);
 float plume=1.-smoothstep(.012-aa,.095+aa,distanceToFold);
 float detail=noise(flow*vec2(13.,8.)+vec2(t*.05,t*.16));
 float wisps=(1.-smoothstep(.018,.13,abs(detail-.52)))*.36;
 float veil=smoothstep(.20,.72,folds);
 // Strongest along the shoulders and hair; the DOM portrait naturally occludes the interior.
 float sides=gaussian(flow.x-.25,.16)+gaussian(flow.x-.83,.18);
 float height=gaussian((p.y-.51)*.85,.50);
 float hero=(plume*.78+wisps*.32+veil*.16)*sides*height;
 vec2 cloud=(p-.5)/vec2(.85,.78);
 float envelope=exp(-dot(cloud,cloud)*1.35);
 float haze=fbm(flow*vec2(4.0,2.8)+vec2(24.,t*.075));
 float mist=(smoothstep(.24,.70,haze)*.48+smoothstep(.37,.70,folds)*.18)*envelope;
 float density=hero*uAttached*.82+mist*uDiffuse*.58;
 float alpha=clamp(density,0.,.76);
 vec3 color=mix(vec3(.47,.006,.060),vec3(.97,.07,.18),clamp(plume*.55+wisps*.4,0.,1.));
 // Premultiplied output avoids dark, jagged fringes when blending into the near-black background.
 gl_FragColor=vec4(color*alpha,alpha);
}`;

const blurFragment = `varying vec2 vUv;uniform sampler2D uTexture;uniform vec2 uPixel;
void main(){vec4 c=texture2D(uTexture,vUv)*.2;
c+=texture2D(uTexture,vUv+uPixel*vec2(1.,0.))*.12;c+=texture2D(uTexture,vUv-uPixel*vec2(1.,0.))*.12;
c+=texture2D(uTexture,vUv+uPixel*vec2(0.,1.))*.12;c+=texture2D(uTexture,vUv-uPixel*vec2(0.,1.))*.12;
c+=texture2D(uTexture,vUv+uPixel*vec2(1.,1.))*.08;c+=texture2D(uTexture,vUv-uPixel*vec2(1.,1.))*.08;
c+=texture2D(uTexture,vUv+uPixel*vec2(1.,-1.))*.08;c+=texture2D(uTexture,vUv-uPixel*vec2(1.,-1.))*.08;gl_FragColor=c;}`;

/** A single disposable renderer, lazy loaded only for full graphics. DOM content stays accessible. */
export async function mountFullScene(root: HTMLElement, onFailure: () => void, signal?: AbortSignal): Promise<() => void> {
  const canvas = document.createElement('canvas');
  canvas.className = 'webgl-field'; canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0); renderer.autoClear = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.debug.onShaderError = () => { queueMicrotask(onFailure); };
  const life = new AbortController();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  let disposed = false, raf = 0, w = 0, h = 0, previous = 0, elapsed = 0;
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  const cleanup = () => {
    if (disposed) return; disposed = true; cancelAnimationFrame(raf); life.abort();
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    signal?.removeEventListener('abort', cleanup);
    target.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  };
  signal?.addEventListener('abort', cleanup, { once: true });
  if (signal?.aborted) { cleanup(); throw new DOMException('Cancelled', 'AbortError'); }
  const loader = new THREE.TextureLoader();
  let cardTexture: THREE.Texture;
  try { cardTexture = await loader.loadAsync('/art/card-back.png'); if (disposed) cardTexture.dispose(); else textures.push(cardTexture); }
  catch (error) { cleanup(); throw error; }
  if (disposed) throw new DOMException('Cancelled', 'AbortError');
  try {
    // The source includes a backdrop. Sample only the actual flat card face.
    cardTexture.colorSpace = THREE.SRGBColorSpace;
    cardTexture.offset.set(.105, .092); cardTexture.repeat.set(.79, .828);
    cardTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const screenCamera = new THREE.Camera();
    const plane = new THREE.PlaneGeometry(2, 2); geometries.push(plane);
    // A tiny repeatable scalar noise atlas replaces dozens of transcendental hash operations per pixel.
    const noiseData = new Uint8Array(128 * 128 * 4); let noiseSeed = 220708;
    for (let i = 0; i < noiseData.length; i += 4) {
      noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0;
      const value = noiseSeed >>> 24; noiseData.set([value,value,value,255],i);
    }
    const noiseTexture = new THREE.DataTexture(noiseData,128,128,THREE.RGBAFormat);
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
    noiseTexture.minFilter = noiseTexture.magFilter = THREE.LinearFilter; noiseTexture.needsUpdate = true; textures.push(noiseTexture);
    const auraMaterial = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: auraFragment, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
      uniforms: { uNoise: { value: noiseTexture }, uTime: { value: 0 }, uAttached: { value: 1 }, uSpread: { value: 0 }, uDiffuse: { value: 0 },
        uResolution: { value: new THREE.Vector2() }, uRect: { value: new THREE.Vector4() } } });
    materials.push(auraMaterial);
    const auraScene = new THREE.Scene(); auraScene.add(new THREE.Mesh(plane, auraMaterial));
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
    const emberData = new Uint8Array(32 * 32 * 4);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const radius = Math.hypot((x-15.5)/15.5,(y-15.5)/15.5), offset=(y*32+x)*4;
      emberData.set([255,255,255,Math.round(Math.max(0,1-radius)**2*255)],offset);
    }
    const emberTexture = new THREE.DataTexture(emberData,32,32,THREE.RGBAFormat);
    emberTexture.minFilter = emberTexture.magFilter = THREE.LinearFilter; emberTexture.needsUpdate=true; textures.push(emberTexture);
    const emberMaterial = new THREE.PointsMaterial({ map: emberTexture, color: 0xff2452, size: 3.2, sizeAttenuation: false, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }); materials.push(emberMaterial);
    const embers = new THREE.Points(emberGeometry, emberMaterial); scene.add(embers);
    const character = root.querySelector<HTMLImageElement>('.character')!;
    let px = 0, py = 0, tx = 0, ty = 0;
    root.addEventListener('pointermove', event => { if (event.pointerType === 'mouse') { tx = event.clientX / innerWidth - .5; ty = event.clientY / innerHeight - .5; } }, { passive: true, signal: life.signal });
    root.addEventListener('pointerleave', () => { tx = 0; ty = 0; }, { signal: life.signal });
    function resize() {
      w = innerWidth; h = innerHeight;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w <= 760 ? 1.25 : 1.5)); renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.position.z = h / (2 * Math.tan(THREE.MathUtils.degToRad(17.5))); camera.updateProjectionMatrix();
      target.setSize(Math.ceil(w / 3), Math.ceil(h / 3));
      compositeMaterial.uniforms.uPixel.value.set(9 / w, 9 / h);
      auraMaterial.uniforms.uResolution.value.set(w, h);
      root.dataset.auraResolution = `${canvas.width}x${canvas.height}`;
    }
    const start = () => { cancelAnimationFrame(raf); previous = 0; if (!disposed && !document.hidden) raf = requestAnimationFrame(draw); };
    function draw(now: number) {
      raf = 0; if (disposed || document.hidden) return;
      const delta = previous ? Math.min((now - previous) / 1000, .05) : 0; previous = now; elapsed += delta;
      if (w !== innerWidth || h !== innerHeight) resize();
      const phase = Number(root.dataset.phase) || 0, mobile = w <= 760;
      // Screen-space expansion continues as the character fades, including reverse scroll and resize.
      const energy = energyFrame(phase, character.getBoundingClientRect(), {width:w,height:h});
      const { rect, strength: fade } = energy;
      auraMaterial.uniforms.uTime.value = elapsed;
      auraMaterial.uniforms.uAttached.value = energy.attached * (mobile ? .85 : 1);
      auraMaterial.uniforms.uSpread.value = energy.spread;
      auraMaterial.uniforms.uDiffuse.value = energy.diffuse * (mobile ? .88 : 1);
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
        const seed = (i * .618034) % 1;
        const x = THREE.MathUtils.lerp(.54+seed*.49,.025+seed*.95,energy.spread);
        const y = (i * .137 + elapsed * .024) % 1;
        emberPositions.setXYZ(i, (x - .5) * w + Math.sin(elapsed * .6 + i) * 12, (y - .5) * h, 90);
      }
      emberPositions.needsUpdate = true; emberMaterial.opacity = energy.attached * .46 + energy.diffuse * .28;
      try {
        renderer.setRenderTarget(null); renderer.clear();
        if (fade > .001) renderer.render(auraScene, screenCamera);
        renderer.clearDepth(); renderer.render(scene, camera);
        renderer.setRenderTarget(target); renderer.clear(); renderer.render(foreground, camera);
        renderer.setRenderTarget(null); renderer.render(compositeScene, screenCamera);
      } catch { onFailure(); return; }
      root.dataset.graphicsTime = elapsed.toFixed(2);
      root.dataset.auraTarget = energy.target;
      root.dataset.auraSpread = energy.spread.toFixed(3);
      root.dataset.auraDiffuse = energy.diffuse.toFixed(3);
      raf = requestAnimationFrame(draw);
    }
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); onFailure(); }, { signal: life.signal });
    document.addEventListener('visibilitychange', start, { signal: life.signal });
    root.querySelector('.stage')!.prepend(canvas); resize(); start();
    return cleanup;
  } catch (error) { cleanup(); throw error; }
}
