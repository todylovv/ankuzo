(() => {
  'use strict';
  const canvas = document.getElementById('smoke-canvas');
  const stage = document.getElementById('stage');
  const isBreak = document.body.dataset.scene === 'break';
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) { stage.classList.add('smoke-fallback'); return; }
  const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragment = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform float breakMode;
    float hash(vec2 p) {
      vec3 p3=fract(vec3(p.xyx)*.1031);
      p3+=dot(p3,p3.yzx+33.33);
      return fract((p3.x+p3.y)*p3.z);
    }
    float noise(vec2 p) {
      vec2 i=floor(p),f=fract(p);
      vec2 u=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }
    float fbm(vec2 p) {
      float sum=0.,amp=.5;
      mat2 rot=mat2(.8,-.6,.6,.8);
      for(int i=0;i<5;i++) {sum+=amp*noise(p);p=rot*p*2.03+vec2(4.7,8.3);amp*=.5;}
      return sum;
    }
    void main() {
      vec2 uv=gl_FragCoord.xy/resolution;
      float aspect=resolution.x/resolution.y;
      vec2 p=(uv-.5)*vec2(aspect,1.)*3.1;
      float t=time*.115;
      // Two coupled flow fields continually fold and dissolve the smoke.
      p+=vec2(.18*sin(p.y*1.7+t*.8),.16*cos(p.x*1.4-t*.7));
      vec2 q=vec2(fbm(p+vec2(0.,-t*.55)),fbm(p+vec2(5.2-t*.17,1.3-t*.4)));
      vec2 r=vec2(fbm(p+3.8*q+vec2(1.7+t*.25,9.2-t*.7)),fbm(p+3.5*q+vec2(8.3-t*.22,2.8-t*.5)));
      float f=fbm(p+4.2*r+vec2(0.,-t*.48));
      float detail=noise(p*17.+r*13.);
      float ridge=pow(max(0.,1.-abs(2.*f-1.)),5.);
      float cloud=smoothstep(.22,.79,f);
      float curl=smoothstep(.28,.7,r.x)*(.45+.55*r.y);
      if (breakMode > .5) {
        // Wide low-lying mist, with open black space behind the break message.
        float floorBand=pow(1.-smoothstep(.04,.44,uv.y),1.2);
        float leftPlume=exp(-pow((uv.x-.17)*4.5,2.)-pow((uv.y-.24)*5.8,2.))*.46;
        float envelope=clamp(floorBand*.9+leftPlume,0.,1.);
        float density=envelope*(cloud*.48+ridge*curl*.65);
        vec3 mist=vec3(.19,.015,.065)*density;
        mist+=vec3(.30,.026,.095)*pow(density,2.)*1.2;
        gl_FragColor=vec4(mist,1.);
        return;
      }
      float edges=pow(abs(uv.y-.5)*2.,2.1)*.95;
      float right=smoothstep(.24,.91,uv.x)*.85;
      float left=pow(1.-uv.x,9.)*.6;
      float envelope=clamp(edges+right+left,0.,1.);
      // The left centre remains calm and dark for the editable text.
      envelope*=1.-.65*exp(-pow((uv.x-.22)*2.4,2.)-pow((uv.y-.51)*3.2,2.));
      float density=envelope*(cloud*.55+ridge*curl*.8);
      vec3 color=vec3(.018,.012,.019);
      color+=vec3(.33,.004,.058)*density;
      color+=vec3(.55,.018,.12)*pow(density,2.1)*1.8;
      color+=vec3(.21,.012,.055)*ridge*curl*envelope*(.4+.6*detail);
      // Fine dark fissures give the lit plumes volume rather than a flat tint.
      color*=.65+.45*noise(p*4.+q*4.);
      float vignette=1.-.32*pow(length((uv-.5)*vec2(.85,1.)),1.4);
      gl_FragColor=vec4(color*vignette,1.);
    }`;
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) { console.error('Smoke shader:', error.message); stage.classList.add('smoke-fallback'); return; }
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'resolution');
  const time = gl.getUniformLocation(program, 'time');
  gl.uniform1f(gl.getUniformLocation(program, 'breakMode'), isBreak ? 1 : 0);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, started = performance.now(), last = started, elapsed = 16, samples = 0, scale = 1, raf = 0, lost = false;
  let smokeTime = 17;
  const paused = () => stage.classList.contains('motion-off') || reduced.matches;
  function resize() {
    const rect = stage.getBoundingClientRect();
    const light = stage.classList.contains('quality-light');
    const width = Math.round(Math.min(light ? 640 : 1000, rect.width * Math.min(devicePixelRatio || 1, 1.5) * .72) * scale);
    canvas.width = Math.max(180, width);
    canvas.height = Math.round(canvas.width * stage.clientHeight / stage.clientWidth);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolution, canvas.width, canvas.height);
  }
  function draw(now) {
    raf = 0;
    if (lost) return;
    const dt = Math.min(100, Math.max(0, now - last)); last = now;
    if (!paused() && !document.hidden) smokeTime += dt / 1000 * (isBreak ? .52 : 1);
    gl.uniform1f(time, smokeTime); gl.drawArrays(gl.TRIANGLES, 0, 6);
    frame++;
    stage.dataset.smokeFrames = String(frame);
    stage.dataset.smokeEngine = 'webgl';
    // Drop internal pixel density before sacrificing motion frame rate.
    if (!document.hidden && !paused()) {
      elapsed += dt; samples++;
      if (samples >= 90) {
        const average = elapsed / samples;
        stage.dataset.smokeFrameMs = average.toFixed(1);
        if (average > 23 && scale > .4) { scale = Math.max(.4, scale * .8); resize(); }
        elapsed = 0; samples = 0;
      }
    }
    if (!paused() && !document.hidden) raf = requestAnimationFrame(draw);
  }
  function refresh() {
    if (lost) return;
    if (raf) cancelAnimationFrame(raf);
    last = performance.now(); resize();
    raf = requestAnimationFrame(draw);
  }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; if (raf) cancelAnimationFrame(raf); stage.classList.add('smoke-fallback'); });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  addEventListener('resize', refresh);
  addEventListener('ankuzo:appearance', refresh);
  document.addEventListener('visibilitychange', refresh);
  reduced.addEventListener('change', refresh);
  refresh();
})();
