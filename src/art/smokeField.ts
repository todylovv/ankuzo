import { smokeBudget, frameDue, nextRenderScale } from './renderPolicy.js';

// The starting-screen flow, sampled from a small repeatable noise atlas.
// Both quality modes use this field; full graphics reuse their existing WebGL context.
export const smokeFragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uNoise;
float noise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return texture2D(uNoise,(i+f+.5)/256.).r;
}
// Four octaves are baked once into the green channel, rather than recomputed per pixel.
float fbm(vec2 p){return texture2D(uNoise,p/32.).g;}
void main(){
 vec2 uv=vUv;
 vec2 p=(uv-.5)*vec2(uResolution.x/uResolution.y,1.)*3.1;
 float t=(uTime+17.)*.115;
 p+=vec2(.18*sin(p.y*1.7+t*.8),.16*cos(p.x*1.4-t*.7));
 vec2 q=vec2(fbm(p+vec2(0.,-t*.55)),fbm(p+vec2(5.2-t*.17,1.3-t*.4)));
 vec2 r=vec2(fbm(p+3.8*q+vec2(1.7+t*.25,9.2-t*.7)),fbm(p+3.5*q+vec2(8.3-t*.22,2.8-t*.5)));
 float f=fbm(p+4.2*r+vec2(0.,-t*.48));
 float ridge=pow(max(0.,1.-abs(2.*f-1.)),5.);
 float cloud=smoothstep(.19,.72,f);
 float curl=smoothstep(.24,.66,r.x)*(.45+.55*r.y);
 float edges=pow(abs(uv.y-.5)*2.,1.8)*.95;
 float right=smoothstep(.28,.91,uv.x)*.86;
 float left=pow(1.-uv.x,7.)*.62;
 float envelope=clamp(edges+right+left,0.,1.);
 envelope*=1.-.72*exp(-pow((uv.x-.23)*2.6,2.)-pow((uv.y-.51)*3.2,2.));
 float density=envelope*(cloud*.58+ridge*curl*.84);
 vec3 color=vec3(.019,.012,.021);
 color+=vec3(.39,.005,.064)*density;
 color+=vec3(.62,.022,.13)*pow(density,2.1)*1.8;
 color+=vec3(.23,.012,.055)*ridge*curl*envelope*(.4+.6*noise(p*17.+r*13.));
 color*=.68+.42*noise(p*4.+q*4.);
 color*=1.-.32*pow(length((uv-.5)*vec2(.85,1.)),1.4);
 gl_FragColor=vec4(color,1.);
}`;

let noiseCache: Uint8Array|null=null;
export function smokeNoise(): Uint8Array {
 if(noiseCache)return noiseCache;
 const size=256,data=new Uint8Array(size*size*4),lattice=new Float32Array(size*size);let seed=220708;
 for(let i=0;i<lattice.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;lattice[i]=(seed>>>8)/16777216;}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let sum=0,amplitude=.5;
  for(let octave=0;octave<4;octave++){
   const cells=32<<octave,px=x*cells/size,py=y*cells/size,ix=Math.floor(px),iy=Math.floor(py);
   const fx=px-ix,fy=py-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
   const a=lattice[iy*size+ix],b=lattice[iy*size+(ix+1)%cells],c=lattice[((iy+1)%cells)*size+ix],d=lattice[((iy+1)%cells)*size+(ix+1)%cells];
   sum+=((a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v)*amplitude;amplitude*=.5;
  }
  const index=(y*size+x)*4;data[index]=Math.round(lattice[y*size+x]*255);data[index+1]=Math.round(sum*255);data[index+2]=0;data[index+3]=255;
 }
 noiseCache=data;return data;
}

/** Lightweight mode owns one small WebGL surface, destroyed before full graphics start. */
export function mountSmokeBackground(root: HTMLElement): () => void {
 const life=new AbortController(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let stop: (()=>void)|null=null;
 root.classList.add('smoke-background');
 function mountLight(): ()=>void {
  const canvas=document.createElement('canvas');canvas.className='smoke-field';canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  if(!gl){root.dataset.backgroundEngine='static-smoke';return ()=>{};}
  const shaders: WebGLShader[]=[];let program: WebGLProgram|null=null,buffer: WebGLBuffer|null=null,texture: WebGLTexture|null=null;
  let raf=0,previous=0,elapsed=0,paintAt=0,frames=0,scale=1,disposed=false;
  const samples: number[]=[];
  const cleanup=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);gl.deleteBuffer(buffer);gl.deleteTexture(texture);gl.deleteProgram(program);shaders.forEach(shader=>gl.deleteShader(shader));gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.remove();};
  try {
   const compile=(type:number,source:string)=>{const shader=gl.createShader(type);if(!shader)throw new Error('Shader unavailable');shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Smoke shader unavailable');return shader;};
   program=gl.createProgram();if(!program)throw new Error('WebGL unavailable');
   gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 position;varying vec2 vUv;void main(){vUv=(position+1.)*.5;gl_Position=vec4(position,0.,1.);}'));
   gl.attachShader(program,compile(gl.FRAGMENT_SHADER,smokeFragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Smoke program unavailable');gl.useProgram(program);
   buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
   texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,smokeNoise());
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   const time=gl.getUniformLocation(program,'uTime'),resolution=gl.getUniformLocation(program,'uResolution');
   function resize(){const size=smokeBudget(innerWidth,innerHeight,scale,true);canvas.width=size.width;canvas.height=size.height;gl!.viewport(0,0,size.width,size.height);gl!.uniform2f(resolution,innerWidth,innerHeight);root.dataset.smokeBuffer=`${size.width}x${size.height}`;}
   function draw(now:number){
    raf=0;if(disposed||document.hidden)return;
    if(!frameDue(now,paintAt,60)){raf=requestAnimationFrame(draw);return;}paintAt=now;
    const delta=previous?Math.min(now-previous,100):0;if(previous)samples.push(now-previous);previous=now;elapsed+=delta/1000;
    if(samples.length>=12){const next=nextRenderScale(scale,samples);if(next!==scale){scale=next;samples.length=0;resize();}else if(samples.length>=90)samples.length=0;}
    gl!.uniform1f(time,elapsed);gl!.drawArrays(gl!.TRIANGLES,0,6);root.dataset.smokeFrames=String(++frames);root.dataset.backgroundEngine='red-smoke-light';root.dataset.backgroundTargetFps='60';raf=requestAnimationFrame(draw);
   }
   const resume=()=>{cancelAnimationFrame(raf);previous=0;paintAt=0;samples.length=0;if(!disposed&&!document.hidden)raf=requestAnimationFrame(draw);};
   const events=new AbortController();window.addEventListener('resize',resize,{signal:events.signal});document.addEventListener('visibilitychange',resume,{signal:events.signal});
   canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();events.abort();cleanup();root.dataset.backgroundEngine='static-smoke';},{signal:events.signal});
   root.querySelector('.stage')?.prepend(canvas);resize();resume();
   return ()=>{events.abort();cleanup();};
  } catch {cleanup();root.dataset.backgroundEngine='static-smoke';return ()=>{};}
 }
 function sync(){
  const light=root.dataset.quality==='motion'&&!reduced.matches;
  if(light&&!stop)stop=mountLight();
  if(!light&&stop){stop();stop=null;}
  if(root.dataset.quality==='off'||reduced.matches)root.dataset.backgroundEngine='static-smoke';
 }
 root.addEventListener('ankuzo:quality-change',sync,{signal:life.signal});reduced.addEventListener('change',sync,{signal:life.signal});sync();
 return ()=>{life.abort();stop?.();root.classList.remove('smoke-background');};
}
