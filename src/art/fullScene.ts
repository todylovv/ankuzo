import * as THREE from 'three';
import { energyFrame } from './energyFacts.js';
import { frameDue, renderBudget, nextRenderScale, smokeBudget, decorativeCardAppearance } from './renderPolicy.js';
import { smokeFragment, smokeNoise } from './smokeField';

const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const compositeFragment = `varying vec2 vUv;uniform sampler2D uTexture;
void main(){gl_FragColor=texture2D(uTexture,vUv);}`;

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
  const auraTarget = new THREE.WebGLRenderTarget(1,1,{depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  let renderScale=1,paintAt=0,auraAt=0,warmAt=0,personPhase=-1;
  let personRect:DOMRect | null=null;
  const pressure:number[]=[];
  const cleanup = () => {
    if (disposed) return; disposed = true; cancelAnimationFrame(raf); life.abort();
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    signal?.removeEventListener('abort', cleanup);
    auraTarget.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  };
  signal?.addEventListener('abort', cleanup, { once: true });
  if (signal?.aborted) { cleanup(); throw new DOMException('Cancelled', 'AbortError'); }
  const loader = new THREE.TextureLoader();
  let cardTexture: THREE.Texture;
  try { cardTexture = await loader.loadAsync('/art/card-back-display-v1.webp'); if (disposed) cardTexture.dispose(); else textures.push(cardTexture); }
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
    const noiseData = smokeNoise();
    const noiseTexture = new THREE.DataTexture(noiseData,256,256,THREE.RGBAFormat);
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
    noiseTexture.minFilter = noiseTexture.magFilter = THREE.LinearFilter; noiseTexture.needsUpdate = true; textures.push(noiseTexture);
    const auraMaterial = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: smokeFragment, transparent: false, premultipliedAlpha: true, depthTest: false, depthWrite: false,
      uniforms: { uNoise: { value: noiseTexture }, uTime: { value: 0 }, uResolution: { value: new THREE.Vector2() } } });
    materials.push(auraMaterial);
    const auraScene = new THREE.Scene(); auraScene.add(new THREE.Mesh(plane, auraMaterial));
    const compositeMaterial = new THREE.ShaderMaterial({ vertexShader:vertex,fragmentShader:compositeFragment,transparent:true,premultipliedAlpha:true,depthTest:false,depthWrite:false,
      uniforms:{uTexture:{value:auraTarget.texture}} });
    materials.push(compositeMaterial);
    const compositeScene=new THREE.Scene();compositeScene.add(new THREE.Mesh(plane,compositeMaterial));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
    for (const s of [scene]) {
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
      const face = new THREE.MeshBasicMaterial({ map: cardTexture, color: new THREE.Color().setScalar(.95), transparent: true, opacity, depthWrite: false, toneMapped: false });
      const edge = new THREE.MeshStandardMaterial({ color: 0x7e324a, metalness: .65, roughness: .38, transparent: true, opacity, depthWrite: false }); materials.push(face, edge);
      const group = new THREE.Group(); group.add(new THREE.Mesh(geometry, [face, edge]));
      const strings: THREE.Line[] = [];
      if (tied) {
        // Wrap around the upper third, with real thickness and no drilled holes.
        for (const depth of [-.008,.024]) {
          const band = new THREE.Mesh(threadGeometry, red); band.rotation.z = Math.PI / 2; band.position.set(0,.34,depth); group.add(band);
        }
        for (const side of [-.5,.5]) {
          const turn=new THREE.Mesh(threadGeometry,red);turn.rotation.x=Math.PI/2;turn.scale.y=.032;turn.position.set(side,.34,.008);group.add(turn);
        }
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xc72c50, transparent: true, opacity: .68 }); materials.push(lineMaterial);
        for (let side = 0; side < 2; side++) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 18 }, () => new THREE.Vector3())); geometries.push(lineGeometry);
          const line = new THREE.Line(lineGeometry, lineMaterial); scene.add(line); strings.push(line);
        }
      }
      scene.add(group);
      return { group, strings, sx, sy, size, angle, z, i, face, edge, opacity };
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
      const budget=renderBudget(w,h,devicePixelRatio || 1,renderScale);
      renderer.setPixelRatio(budget.ratio); renderer.setSize(w,h,false);
      const smoke=smokeBudget(w,h,renderScale);
      auraTarget.setSize(smoke.width,smoke.height);auraAt=0;personPhase=-1;
      root.dataset.smokeBuffer=`${smoke.width}x${smoke.height}`;
      root.dataset.auraBuffer=`${smoke.width}x${smoke.height}`;
      root.dataset.graphicsScale=renderScale.toFixed(2);
      camera.aspect = w / h; camera.position.z = h / (2 * Math.tan(THREE.MathUtils.degToRad(17.5))); camera.updateProjectionMatrix();

      auraMaterial.uniforms.uResolution.value.set(w, h);
      root.dataset.auraResolution = `${canvas.width}x${canvas.height}`;
    }
    const attachment=new THREE.Vector3(),anchor=new THREE.Vector3(),tangent=new THREE.Vector3(),near=new THREE.Vector3(),far=new THREE.Vector3();
    const start = () => { cancelAnimationFrame(raf); previous = 0;paintAt=0;auraAt=0;pressure.length=0;warmAt=0; if (!disposed && !document.hidden) raf = requestAnimationFrame(draw); };
    let smokeFrames=0;
    let measureAt=0, measureFrames=0, measureCpu=0, measureMax=0; const intervals:number[]=[];
    function draw(now: number) {
      raf=0;if(disposed || document.hidden)return;
      if(!frameDue(now,paintAt,60)){raf=requestAnimationFrame(draw);return;}
      paintAt=paintAt ? Math.max(paintAt+1000/60,now-1000/60) : now;
      const measureStart=performance.now();
      if(previous && now-previous<1000)intervals.push(now-previous);
      if(!warmAt)warmAt=now;
      if(previous && now-warmAt>3000)pressure.push(now-previous);
      if(pressure.length>=12&&pressure.reduce((sum,n)=>sum+n,0)>=1500){const next=nextRenderScale(renderScale,pressure);pressure.length=0;if(next!==renderScale){renderScale=next;resize();}}

      const delta = previous ? Math.min((now - previous) / 1000, .05) : 0; previous = now; elapsed += delta;
      if (w !== innerWidth || h !== innerHeight) resize();
      const phase = Number(root.dataset.phase) || 0, mobile = w <= 760;
      // Screen-space expansion continues as the character fades, including reverse scroll and resize.
      // The silhouette is static while idle: do not force a DOM geometry read every rendered frame.
      if(!personRect || personPhase!==phase){personRect=character.getBoundingClientRect();personPhase=phase;}
      const energy=energyFrame(phase,personRect,{width:w,height:h});
      auraMaterial.uniforms.uTime.value = elapsed;
      const response = 1 - Math.exp(-delta * 2.6); px += (tx - px) * response; py += (ty - py) * response;
      cards.forEach(card => {
        const { group, sx, sy, size, angle, z, i, strings } = card;
        const appearance=decorativeCardAppearance(phase,card.opacity*([7,8].includes(i)?.28:1));
        card.face.color.setScalar(appearance.brightness);card.face.opacity=card.edge.opacity=appearance.opacity;
        const projection = (camera.position.z - z) / camera.position.z;
        const width = w * size * projection * (mobile ? 1.55 : 1);
        group.scale.setScalar(width);
        group.position.set(((sx - .5) * w + Math.sin(elapsed * .23 + i * 1.7) * w * .009 + px * (10 + i * 3)) * projection,
          ((.5 - sy) * h + Math.cos(elapsed * .21 + i) * h * .008 + py * 9 - phase * h * .018) * projection, z);
        group.rotation.set(Math.sin(elapsed * .17 + i) * .08, Math.sin(elapsed * .15 + i * 1.3) * .23, angle + Math.sin(elapsed * .21 + i) * .045);
        group.updateMatrixWorld();
        strings.forEach((line, side) => {
          line.visible = group.visible;
          group.localToWorld(attachment.set(side ? .50 : -.50,.34,.024));
          // The wrap and tail endpoints must share all three transformed coordinates.
          tangent.set(side?1:-1,0,0).transformDirection(group.matrixWorld);
          anchor.copy(attachment).addScaledVector(tangent,width*.25);
          anchor.y=h*.8*projection;
          const points = line.geometry.getAttribute('position');
          near.copy(attachment).addScaledVector(tangent,width*.22);
          far.copy(anchor);far.y-=width*.4;
          for (let j = 0; j < points.count; j++) {
            const f=j/(points.count-1),u=1-f;
            points.setXYZ(j,...[0,1,2].map(k=>u*u*u*anchor.getComponent(k)+3*u*u*f*far.getComponent(k)+3*u*f*f*near.getComponent(k)+f*f*f*attachment.getComponent(k)) as [number,number,number]);
          }
          points.needsUpdate = true; line.frustumCulled=false;
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
        // The broad background shares the 60 Hz scene clock and a small independent raster budget.
        if(frameDue(now,auraAt,60)){
          auraAt=now;renderer.setRenderTarget(auraTarget);renderer.clear();
          renderer.render(auraScene,screenCamera);
          root.dataset.smokeFrames=String(++smokeFrames);root.dataset.backgroundEngine='red-smoke';root.dataset.backgroundTargetFps='60';
        }
        renderer.setRenderTarget(null);renderer.clear();
        compositeMaterial.uniforms.uTexture.value=auraTarget.texture;renderer.render(compositeScene,screenCamera);
        renderer.clearDepth();renderer.render(scene,camera);
      } catch { onFailure(); return; }
      const cost=performance.now()-measureStart;measureCpu+=cost;measureMax=Math.max(measureMax,cost);measureFrames++;
      if(now-measureAt>=1500 && intervals.length>20){
        const ordered=intervals.sort((a,b)=>a-b);
        root.dataset.graphicsFps=(1000/ordered[Math.floor(ordered.length*.5)]).toFixed(1);
        root.dataset.graphicsP95=ordered[Math.floor(ordered.length*.95)].toFixed(1);
        root.dataset.graphicsCpu=(measureCpu/measureFrames).toFixed(2);
        root.dataset.graphicsCpuMax=measureMax.toFixed(2);
        root.dataset.graphicsDrawCalls=String(renderer.info.render.calls);
        intervals.length=0;measureCpu=0;measureFrames=0;measureMax=0;measureAt=now;
      }
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
