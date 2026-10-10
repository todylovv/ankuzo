import * as THREE from 'three';

const status=document.querySelector('#status'),canvas=document.querySelector('#render');
const rotation=document.querySelector('#rotation'),thickness=document.querySelector('#thickness');
const play=document.querySelector('#play'),zoom=document.querySelector('#zoom');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});}
catch{status.textContent='Для набросков нужен WebGL. Открой эту страницу в браузере с аппаратным ускорением.';throw new Error('WebGL unavailable');}
renderer.setClearColor(0x050506,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
const loader=new THREE.TextureLoader();
const [back,image]=await Promise.all(['/art/card-back.png','/art/cs2.jpg'].map(url=>loader.loadAsync(url)));
back.colorSpace=image.colorSpace=THREE.SRGBColorSpace;
back.offset.set(.105,.092);back.repeat.set(.79,.828);back.anisotropy=image.anisotropy=renderer.capabilities.getMaxAnisotropy();

// One cross-section, actual surface normals, and arc-length UVs for all materials.
// Fine detail is shader shading; the silhouette stays smooth at ordinary scale.
const vertex=`varying vec3 vNormal,vPosition;varying vec2 vUv;
void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vPosition=p.xyz;gl_Position=projectionMatrix*p;}`;
const fragment=`precision highp float;
varying vec3 vNormal,vPosition;varying vec2 vUv;uniform float uStyle;
void main(){
 vec3 N=normalize(vNormal),V=normalize(-vPosition),L=normalize(vec3(-.45,.78,1.2));
 float angle=vUv.y*6.2831853;
 float twist=sin(vUv.x*310.-angle*3.);
 float braid=pow(.5+.5*cos(vUv.x*150.+angle*3.),2.);
 float grain=sin(vUv.x*540.-angle*9.);
 float detail=uStyle>1.5?braid:(uStyle<.5?grain*.12:0.);
 float diffuse=max(dot(N,L),0.);
 float spec=pow(max(dot(N,normalize(L+V)),0.),uStyle>.5&&uStyle<1.5?70.:24.);
 float rim=pow(1.-max(dot(N,V),0.),3.);
 vec3 base=uStyle>.5&&uStyle<1.5?vec3(.48,.003,.025):(uStyle>1.5?vec3(.32,.009,.038):vec3(.42,.018,.065));
 vec3 color=base*(.34+diffuse*.85+detail*.22);
 color+=vec3(1.,.82,.86)*spec*(uStyle>.5&&uStyle<1.5?2.2:(uStyle>1.5?.12:.36));
 color+=vec3(.42,.012,.06)*rim*(uStyle>.5&&uStyle<1.5?.60:.15);
 if(uStyle>1.5)color*=.36+braid*.85+twist*.025;
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
const V=(x,y,z=0)=>new THREE.Vector3(x,y,z);
function tube(curve,material,segments=180){
 const geometry=new THREE.TubeGeometry(curve,segments,.007,12,false);
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
 mesh.userData.segments=segments;return mesh;
}
function updateTube(mesh,curve,radius){
 const {geometry}=mesh,segments=mesh.userData.segments;
 const positions=geometry.attributes.position,normals=geometry.attributes.normal,uv=geometry.attributes.uv;
 const previous=V(0,0,0),normal=V(0,0,0),binormal=V(0,0,0),up=V(0,0,1);
 let distance=0;
 for(let i=0;i<=segments;i++){
   const t=i/segments,p=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
   if(i)distance+=p.distanceTo(previous);previous.copy(p);
   up.set(0,0,1);if(Math.abs(tangent.z)>.94)up.set(0,1,0);
   normal.crossVectors(tangent,up).normalize();binormal.crossVectors(tangent,normal).normalize();
   for(let j=0;j<=12;j++){
     const a=j/12*Math.PI*2,c=Math.cos(a),s=Math.sin(a),k=i*13+j;
     const nx=normal.x*c+binormal.x*s,ny=normal.y*c+binormal.y*s,nz=normal.z*c+binormal.z*s;
     positions.setXYZ(k,p.x+nx*radius,p.y+ny*radius,p.z+nz*radius);normals.setXYZ(k,nx,ny,nz);uv.setXY(k,distance,j/12);
   }
 }
 positions.needsUpdate=normals.needsUpdate=uv.needsUpdate=true;
}
function roundedCard(){
 const shape=new THREE.Shape(),r=.045;
 shape.moveTo(-.5+r,-.75);shape.lineTo(.5-r,-.75);shape.quadraticCurveTo(.5,-.75,.5,-.75+r);
 shape.lineTo(.5,.75-r);shape.quadraticCurveTo(.5,.75,.5-r,.75);shape.lineTo(-.5+r,.75);
 shape.quadraticCurveTo(-.5,.75,-.5,.75-r);shape.lineTo(-.5,-.75+r);shape.quadraticCurveTo(-.5,-.75,-.5+r,-.75);
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:3,curveSegments:12,steps:1});
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
 for(let i=0;i<p.count;i++)if(Math.abs(n.getZ(i))>.99)uv.setXY(i,p.getX(i)+.5,(p.getY(i)+.75)/1.5);
 return geometry;
}
const cardGeometry=roundedCard();
const studies=[...document.querySelectorAll('.view')].map((view,index)=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(28,1,.1,50);camera.position.set(0,.03,4.7);
 scene.add(new THREE.HemisphereLight(0xffe9ed,0x240913,2));
 const light=new THREE.DirectionalLight(0xffe3e7,3);light.position.set(-2,3,5);scene.add(light);
 const card=new THREE.Group();scene.add(card);
 const face=new THREE.MeshStandardMaterial({map:back,color:0xd7b7c6,roughness:.64,metalness:.1});
 const edge=new THREE.MeshStandardMaterial({color:0x936575,roughness:.8});
 card.add(new THREE.Mesh(cardGeometry,[face,edge]));
 const cover=new THREE.Mesh(new THREE.PlaneGeometry(.80,.59),new THREE.MeshBasicMaterial({map:image,color:0xc0a6b1}));cover.position.set(0,.22,.031);card.add(cover);
 const threadMaterial=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{uStyle:{value:index}},side:THREE.DoubleSide});
 // Closed wrap follows the real front, rounded edge and back. It is occluded by the card itself.
 const wrapCurve=new THREE.CatmullRomCurve3([V(-.50,-.15,.039),V(0,-.15,.039),V(.50,-.15,.039),V(.514,-.15,.025),V(.514,-.15,.001),V(.50,-.15,-.012),V(0,-.15,-.012),V(-.50,-.15,-.012),V(-.514,-.15,.001),V(-.514,-.15,.025)],true,'centripetal');
 const wrap=tube(wrapCurve,threadMaterial);card.add(wrap);
 const knotCurve=new THREE.CatmullRomCurve3(Array.from({length:33},(_,i)=>{
   const a=i/32*Math.PI*4;return V(.45+Math.cos(a)*.024,-.15+Math.sin(a)*.017,.049+Math.sin(a*.5)*.012);
 }));
 const knot=tube(knotCurve,threadMaterial,64);card.add(knot);
 const shadowMaterial=new THREE.MeshBasicMaterial({color:0x080205,transparent:true,opacity:.7});
 const shadow=tube(wrapCurve,shadowMaterial);shadow.position.y=-.006;shadow.scale.z=.76;card.add(shadow);
 const start=new THREE.CubicBezierCurve3(V(-2,0,0),V(-1,0,0),V(-.8,-.15,0),V(-.5,-.15,0));
 const tails=[tube(start,threadMaterial,100),tube(start,threadMaterial,100)];tails.forEach(t=>scene.add(t));
 return {view,scene,camera,card,wrap,wrapCurve,knot,knotCurve,shadow,tails};
});
let playing=false,magnified=false,raf=0,time=0,previous=0,dirty=true;
function request(){dirty=true;if(!raf&&!document.hidden)raf=requestAnimationFrame(draw);}
function draw(now){
 raf=0;if(document.hidden)return;
 const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
 if(playing){time+=dt;rotation.value=String(Math.sin(time*.65)*175);}
 const degrees=Number(rotation.value),radians=THREE.MathUtils.degToRad(degrees);
 document.querySelector('#angle').value=`${Math.round(degrees)}°`;
 const size=Number(thickness.value);document.querySelector('#size').value=`${size.toLocaleString('ru-RU')} px`;
 const w=innerWidth,h=innerHeight;
 if(canvas.clientWidth!==w||canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
 renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
 for(const s of studies){
   const rect=s.view.getBoundingClientRect();if(rect.bottom<=0||rect.top>=h)continue;
   const {camera,card}=s;camera.aspect=rect.width/rect.height;camera.position.z=magnified?2.35:4.7;camera.updateProjectionMatrix();
   card.rotation.set(.08*Math.sin(radians),radians,-.10);
   card.position.y=playing?Math.sin(time*.9)*.08:0;card.updateMatrixWorld(true);
   // Pixel thickness is measured at the card plane at normal viewing distance.
   const worldPerPixel=2*4.7*Math.tan(THREE.MathUtils.degToRad(14))/rect.height;
   const radius=size*worldPerPixel/2;
   if(dirty){updateTube(s.wrap,s.wrapCurve,radius);updateTube(s.knot,s.knotCurve,radius*.80);updateTube(s.shadow,s.wrapCurve,radius*1.8);}
   for(let side=0;side<2;side++){
     const sign=side?1:-1;
     // Choose the visible face, preserve the wrap's transformed position and outgoing tangent.
     const z=.0135+.0255*Math.tanh(Math.cos(radians)*12);
     const local=V(sign*.50,-.15,z),attachment=card.localToWorld(local);
     const direction=V(sign,0,0).transformDirection(card.matrixWorld);
     const screenSign=sign*(Math.cos(radians)>=0?1:-1);
     const anchor=V(screenSign*2.4,(side?.10:-.06)+Math.sin(time*.6+side)*.025,0);
     const near=attachment.clone().addScaledVector(direction,.22);
     const far=anchor.clone().add(V(-screenSign*.45,-.16,0));
     updateTube(s.tails[side],new THREE.CubicBezierCurve3(attachment,near,far,anchor),radius);
   }
   const bottom=h-rect.bottom;
   renderer.setViewport(rect.left,bottom,rect.width,rect.height);renderer.setScissor(rect.left,Math.max(0,bottom),rect.width,Math.min(h,rect.bottom)-Math.max(0,rect.top));renderer.render(s.scene,camera);
 }
 dirty=false;if(playing)raf=requestAnimationFrame(draw);
}
play.addEventListener('click',()=>{playing=!playing;play.setAttribute('aria-pressed',String(playing));play.textContent=playing?'Остановить движение':'Включить движение';previous=0;request();});
rotation.addEventListener('input',()=>{playing=false;play.setAttribute('aria-pressed','false');play.textContent='Включить движение';request();});
thickness.addEventListener('input',request);
zoom.addEventListener('click',()=>{magnified=!magnified;zoom.setAttribute('aria-pressed',String(magnified));zoom.textContent=magnified?'Вернуть масштаб 1×':'Приблизить ×2';document.querySelector('footer span:last-child').textContent=magnified?'Масштаб 2× · детали увеличены':'Масштаб 1× · без увеличения';request();});
addEventListener('resize',request);addEventListener('scroll',request,{passive:true});
document.addEventListener('visibilitychange',()=>{previous=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else request();});
reduced.addEventListener('change',()=>{if(reduced.matches&&playing)play.click();});
status.textContent='Материалы готовы. Поверни карту ползунком или включи движение.';
request();
