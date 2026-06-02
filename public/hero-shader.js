(() => {
  const canvas = document.getElementById('heroShaderCanvas');
  if (!canvas) return;

  const panel = canvas.parentElement;
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance'
  });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0., 1.); }
  `;

  const fragmentSource = `
    precision highp float;
    uniform vec2 resolution;
    uniform vec3 blobs[5];
    uniform vec3 colorA;
    uniform vec3 colorB;
    uniform vec3 colorC;
    uniform float colorBlend;
    uniform float metallic;
    uniform float roughness;
    uniform float fresnel;

    float smoothUnion(float a, float b, float radius) {
      float h = clamp(.5 + .5 * (b - a) / radius, 0., 1.);
      return mix(b, a, h) - radius * h * (1. - h);
    }

    float mapScene(vec3 p) {
      float distanceToSurface = length(p - blobs[0]) - .92;
      for (int i = 1; i < 5; i++) {
        float radius = .43 + float(i) * .035;
        distanceToSurface = smoothUnion(
          distanceToSurface,
          length(p - blobs[i]) - radius,
          .52
        );
      }
      return distanceToSurface;
    }

    vec3 normalAt(vec3 p) {
      vec2 e = vec2(.0015, 0.);
      return normalize(vec3(
        mapScene(p + e.xyy) - mapScene(p - e.xyy),
        mapScene(p + e.yxy) - mapScene(p - e.yxy),
        mapScene(p + e.yyx) - mapScene(p - e.yyx)
      ));
    }

    float boxLight(vec3 ray, vec3 direction, vec3 up, vec2 size, float blur) {
      vec3 side = normalize(cross(direction, up));
      vec3 top = normalize(cross(side, direction));
      float x = smoothstep(size.x + blur, size.x - blur, abs(dot(ray, side)));
      float y = smoothstep(size.y + blur, size.y - blur, abs(dot(ray, top)));
      return x * y * max(dot(ray, direction), 0.);
    }

    vec3 environment(vec3 reflected) {
      float blur = roughness * .45 + .025;
      vec3 env = mix(vec3(.018), vec3(.07, .075, .09), reflected.y * .5 + .5);
      env += vec3(1., .96, .9) * boxLight(reflected, normalize(vec3(.72, .84, .52)), vec3(0., 1., 0.), vec2(.16, .46), blur) * 3.2;
      env += vec3(.54, .64, .94) * boxLight(reflected, normalize(vec3(-.82, .18, .44)), vec3(0., 1., 0.), vec2(.5, .16), blur) * 1.9;
      env += vec3(1., .9, .96) * boxLight(reflected, normalize(vec3(.08, .5, -.92)), vec3(1., 0., 0.), vec2(.09, .52), blur) * 2.5;
      return env;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      vec2 screen = uv * 2. - 1.;
      screen.x *= resolution.x / resolution.y;
      vec3 origin = vec3(0., 0., 3.25);
      vec3 direction = normalize(vec3(screen, -1.85));
      float travelled = 0.;
      vec3 point = origin;
      bool hit = false;

      for (int i = 0; i < 76; i++) {
        point = origin + direction * travelled;
        float stepSize = mapScene(point);
        travelled += stepSize;
        if (abs(stepSize) < .0015) { hit = true; break; }
        if (travelled > 14.) break;
      }

      vec3 background = vec3(.948, .943, .918);
      float grid = step(.985, fract(uv.x * 18.)) + step(.985, fract(uv.y * 18.));
      background -= min(grid, 1.) * .022;
      vec3 color = background;

      if (hit) {
        vec3 normal = normalAt(point);
        vec3 viewDirection = normalize(origin - point);
        vec3 reflected = reflect(-viewDirection, normal);
        float mixA = smoothstep(-.4, .8, -normal.x + normal.y * .5);
        float mixB = smoothstep(-.4, .8, normal.x - normal.y * .5);
        vec3 albedo = mix(colorA, colorB, mixA * colorBlend);
        albedo = mix(albedo, colorC, mixB * colorBlend);
        vec3 f0 = mix(vec3(.04), albedo, metallic);
        float facing = max(dot(normal, viewDirection), 0.);
        vec3 edge = f0 + (1. - f0) * pow(1. - facing, 5.);
        vec3 key = normalize(vec3(.72, .84, .52));
        vec3 fill = normalize(vec3(-.82, .18, .44));
        float diffuse = max(dot(normal, key), 0.) * .68 + max(dot(normal, fill), 0.) * .24 + .14;
        color = albedo * (1. - metallic) * diffuse;
        color += environment(reflected) * mix(vec3(1.), albedo, metallic) * edge;
        color += mix(albedo, vec3(1.), .45) * pow(1. - facing, 3.) * fresnel;
      }

      color = pow(clamp(color, 0., 1.), vec3(1. / 2.2));
      gl_FragColor = vec4(color, 1.);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  const vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);

  const location = name => gl.getUniformLocation(program, name);
  const position = gl.getAttribLocation(program, 'position');
  const resolution = location('resolution');
  const blobUniform = location('blobs[0]');
  const colorUniforms = [location('colorA'), location('colorB'), location('colorC')];
  const colorBlend = location('colorBlend');
  const metallic = location('metallic');
  const roughness = location('roughness');
  const fresnel = location('fresnel');
  const fps = document.getElementById('heroShaderFps');
  const swatches = [...document.querySelectorAll('.shader-swatch')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const presets = [
    { colors: [[.95, .74, .03], [.34, .72, .08], [.9, .16, .56]], blend: .82, metallic: .62, roughness: .07, fresnel: 1.05 },
    { colors: [[.62, .62, .61], [.48, .49, .51], [.72, .72, .71]], blend: .3, metallic: .22, roughness: .08, fresnel: .2 },
    { colors: [[.055, .055, .06], [.1, .075, .12], [.045, .055, .075]], blend: .45, metallic: .48, roughness: .06, fresnel: .88 }
  ];
  const blobs = Array.from({ length: 5 }, (_, index) => {
    const angle = index * Math.PI * 2 / 5;
    return {
      x: Math.cos(angle) * (.25 + index * .1),
      y: Math.sin(angle) * (.25 + index * .1),
      z: 0,
      tx: 0,
      ty: 0,
      tz: 0,
      angle,
      radius: .32 + index * .14,
      speed: .22 + index * .055
    };
  });
  const packedBlobs = new Float32Array(15);
  let activePreset = presets[0];
  let activeBlob = -1;
  let dragging = false;
  let pointerInside = false;
  let pointerX = 0;
  let pointerY = 0;
  let pointerVelocityX = 0;
  let pointerVelocityY = 0;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let grabOffsetX = 0;
  let grabOffsetY = 0;
  let lastWidth = 0;
  let lastHeight = 0;
  let previousFrame = performance.now();
  let fpsAverage = 60;

  gl.useProgram(program);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  function localPointer(event) {
    const bounds = canvas.getBoundingClientRect();
    const scale = 3.25 / 1.85;
    return {
      x: ((event.clientX - bounds.left) / bounds.width * 2 - 1) * bounds.width / bounds.height * scale,
      y: (1 - (event.clientY - bounds.top) / bounds.height * 2) * scale
    };
  }

  function updatePointer(event) {
    const next = localPointer(event);
    previousPointerX = pointerX;
    previousPointerY = pointerY;
    pointerX = next.x;
    pointerY = next.y;
    pointerVelocityX = (pointerX - previousPointerX) * 7;
    pointerVelocityY = (pointerY - previousPointerY) * 7;
  }

  canvas.addEventListener('pointerenter', () => { pointerInside = true; });
  canvas.addEventListener('pointerleave', () => {
    pointerInside = false;
    dragging = false;
    activeBlob = -1;
  });
  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    updatePointer(event);
    let bestDistance = Infinity;
    blobs.forEach((blob, index) => {
      const distance = Math.hypot(blob.x - pointerX, blob.y - pointerY);
      if (distance < bestDistance) {
        bestDistance = distance;
        activeBlob = index;
      }
    });
    grabOffsetX = blobs[activeBlob].x - pointerX;
    grabOffsetY = blobs[activeBlob].y - pointerY;
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', event => {
    dragging = false;
    activeBlob = -1;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  swatches.forEach((swatch, index) => {
    swatch.addEventListener('click', event => {
      event.stopPropagation();
      activePreset = presets[index];
      swatches.forEach(item => item.classList.remove('shader-swatch-active'));
      swatch.classList.add('shader-swatch-active');
    });
  });

  function resize() {
    const density = Math.min(devicePixelRatio || 1, innerWidth < 900 ? .72 : 1.1);
    const width = Math.max(1, Math.floor(canvas.clientWidth * density));
    const height = Math.max(1, Math.floor(canvas.clientHeight * density));
    if (width === lastWidth && height === lastHeight) return;
    canvas.width = lastWidth = width;
    canvas.height = lastHeight = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolution, width, height);
  }

  function updateMaterial() {
    activePreset.colors.forEach((color, index) => gl.uniform3fv(colorUniforms[index], color));
    gl.uniform1f(colorBlend, activePreset.blend);
    gl.uniform1f(metallic, activePreset.metallic);
    gl.uniform1f(roughness, activePreset.roughness);
    gl.uniform1f(fresnel, activePreset.fresnel);
  }

  function updateBlobs(now) {
    pointerVelocityX *= .9;
    pointerVelocityY *= .9;
    blobs.forEach((blob, index) => {
      const phase = blob.angle + now * blob.speed;
      blob.tx = Math.cos(phase * (1 + index % 3 * .24)) * blob.radius;
      blob.ty = Math.sin(phase * (.78 + (index + 1) % 3 * .2)) * blob.radius * .82;
      blob.tz = Math.sin(phase * .62 + index) * .36;

      if (pointerInside && dragging && activeBlob === index) {
        blob.tx = pointerX + grabOffsetX;
        blob.ty = pointerY + grabOffsetY;
      } else if (pointerInside && !dragging) {
        const distance = Math.hypot(pointerX - blob.x, pointerY - blob.y);
        const pull = .3 / (1 + distance * 1.45);
        blob.tx += (pointerX - blob.x) * pull;
        blob.ty += (pointerY - blob.y) * pull;
        blob.tx += pointerVelocityX * .07 / (1 + index * .4);
        blob.ty += pointerVelocityY * .07 / (1 + index * .4);
      }

      const easing = activeBlob === index ? .16 : .038;
      blob.x += (blob.tx - blob.x) * easing;
      blob.y += (blob.ty - blob.y) * easing;
      blob.z += (blob.tz - blob.z) * easing;
      packedBlobs[index * 3] = blob.x;
      packedBlobs[index * 3 + 1] = blob.y;
      packedBlobs[index * 3 + 2] = blob.z;
    });
    gl.uniform3fv(blobUniform, packedBlobs);
  }

  function render(timestamp) {
    resize();
    const elapsed = Math.min(timestamp - previousFrame, 1000);
    previousFrame = timestamp;
    fpsAverage = fpsAverage * .94 + (elapsed ? 1000 / elapsed : 60) * .06;
    if (fps) fps.textContent = `${Math.round(Math.min(fpsAverage, 99))} FPS`;
    updateMaterial();
    updateBlobs(reducedMotion ? 0 : timestamp * .001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (!reducedMotion) requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
