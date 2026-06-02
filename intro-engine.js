(() => {
  const intro = document.getElementById('asciiIntro');
  const canvas = document.getElementById('asciiCanvas');
  const enterText = document.getElementById('enterText');
  if (!intro || !canvas) return;

  const ctx = canvas.getContext('2d');
  const NAME = 'ANKUZO';
  const WELCOME = '\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c!';
  const CHARS = '\u30a2\u30a1\u30ab\u30b5\u30bf\u30ca\u30cf\u30de\u30e4\u30e3\u30e9\u30ef0123456789@#$%&*+=-:.\u2593\u2592\u2591';
  const particles = [];
  const dpr = innerWidth < 700 ? 1 : Math.min(devicePixelRatio || 1, 1.5);

  let width = 0;
  let height = 0;
  let mouseX = -9999;
  let mouseY = -9999;
  let phase = 'name';
  let finished = false;

  function randomChar() {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Rasterize only the text bounding box. The previous intro scanned the full viewport.
  function rasterize({ text, font, size, spacing = 0, gap = 10 }) {
    const buffer = document.createElement('canvas');
    const bufferCtx = buffer.getContext('2d');
    const glyphs = [...text];
    const fontValue = font.replace('{size}', size);
    bufferCtx.font = fontValue;
    const glyphWidths = glyphs.map(glyph => bufferCtx.measureText(glyph).width);
    const textWidth = glyphWidths.reduce((sum, glyphWidth) => sum + glyphWidth, 0)
      + spacing * (glyphs.length - 1);
    const pad = gap * 2;

    buffer.width = Math.ceil(textWidth + pad * 2);
    buffer.height = Math.ceil(size * 1.5 + pad * 2);
    bufferCtx.font = fontValue;
    bufferCtx.textBaseline = 'middle';
    bufferCtx.fillStyle = '#fff';

    let cursor = pad;
    glyphs.forEach((glyph, index) => {
      bufferCtx.fillText(glyph, cursor, buffer.height / 2);
      cursor += glyphWidths[index] + spacing;
    });

    const image = bufferCtx.getImageData(0, 0, buffer.width, buffer.height).data;
    const offsetX = (width - buffer.width) / 2;
    const offsetY = (height - buffer.height) / 2;
    const targets = [];

    for (let y = 0; y < buffer.height; y += gap) {
      for (let x = 0; x < buffer.width; x += gap) {
        if (image[(y * buffer.width + x) * 4 + 3] > 100) {
          targets.push({ x: offsetX + x, y: offsetY + y });
        }
      }
    }
    return targets;
  }

  function getNameTargets() {
    const mobile = width < 700;
    let size = mobile ? 74 : 170;
    const spacing = mobile ? 8 : 20;
    const maxWidth = width * .84;
    const estimatedWidth = size * 3.45 + spacing * (NAME.length - 1);
    if (estimatedWidth > maxWidth) size *= maxWidth / estimatedWidth;

    return rasterize({
      text: NAME,
      font: '900 {size}px Bebas Neue, sans-serif',
      size,
      spacing,
      gap: mobile ? 9 : 12
    });
  }

  function getWelcomeTargets() {
    const mobile = width < 700;
    let size = mobile ? 29 : 68;
    const maxWidth = width * .88;
    const measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = `700 ${size}px JetBrains Mono, monospace`;
    const measuredWidth = measureCtx.measureText(WELCOME).width;
    if (measuredWidth > maxWidth) size *= maxWidth / measuredWidth;

    return rasterize({
      text: WELCOME,
      font: '700 {size}px JetBrains Mono, monospace',
      size,
      gap: mobile ? 6 : 8
    });
  }

  function setTargets(targets, scatter = false) {
    while (particles.length < targets.length) {
      particles.push({
        x: scatter ? Math.random() * width : width / 2,
        y: scatter ? Math.random() * height : height / 2,
        tx: width / 2,
        ty: height / 2,
        vx: 0,
        vy: 0,
        alpha: .35 + Math.random() * .65,
        char: randomChar()
      });
    }
    if (particles.length > targets.length) particles.length = targets.length;

    targets.sort(() => Math.random() - .5);
    particles.forEach((particle, index) => {
      particle.tx = targets[index].x;
      particle.ty = targets[index].y;
      particle.alpha = Math.max(.4, particle.alpha);
      if (phase === 'welcome') {
        particle.char = Math.random() > .22
          ? CHARS[Math.floor(Math.random() * 12)]
          : String(Math.floor(Math.random() * 10));
      }
    });
  }

  function buildName() {
    particles.length = 0;
    setTargets(getNameTargets(), true);
  }

  function assembleWelcome() {
    if (phase !== 'name') return;
    phase = 'welcome';
    mouseX = -9999;
    mouseY = -9999;
    enterText.style.opacity = '0';
    setTargets(getWelcomeTargets());
    setTimeout(startSandfall, 3000);
  }

  function startSandfall() {
    phase = 'fall';
    particles.forEach(particle => {
      particle.vx = (Math.random() - .5) * .55;
      particle.vy = .3 + Math.random() * 1.1;
      particle.alpha = .72 + Math.random() * .28;
    });
    setTimeout(() => {
      intro.classList.add('hide');
      setTimeout(() => {
        finished = true;
        particles.length = 0;
      }, 1250);
    }, 1800);
  }

  function animate() {
    if (finished) return;
    if (document.hidden) {
      requestAnimationFrame(animate);
      return;
    }

    ctx.fillStyle = 'rgba(5,5,5,.2)';
    ctx.fillRect(0, 0, width, height);
    ctx.font = phase === 'name'
      ? `${width < 700 ? 9 : 13}px JetBrains Mono`
      : `${width < 700 ? 7 : 10}px JetBrains Mono`;

    particles.forEach(particle => {
      if (phase !== 'fall') {
        const pull = phase === 'welcome' ? .028 : .02;
        particle.vx += (particle.tx - particle.x) * pull;
        particle.vy += (particle.ty - particle.y) * pull;

        if (phase === 'name') {
          const dx = particle.x - mouseX;
          const dy = particle.y - mouseY;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq < 14400 && distanceSq > 0) {
            const distance = Math.sqrt(distanceSq);
            const force = (120 - distance) / 120;
            particle.vx += (dx / distance) * force * 2;
            particle.vy += (dy / distance) * force * 2;
          }
        }

        particle.vx *= .86;
        particle.vy *= .86;
      } else {
        particle.vx *= .995;
        particle.vy += .095;
        particle.alpha *= .996;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;
      if (phase === 'name' && Math.random() > .965) particle.char = randomChar();
      if (phase === 'welcome' && Math.random() > .992) particle.char = randomChar();
      ctx.fillStyle = `rgba(255,255,255,${.2 + particle.alpha * .8})`;
      ctx.fillText(particle.char, particle.x, particle.y);
    });

    requestAnimationFrame(animate);
  }

  addEventListener('mousemove', event => {
    if (phase !== 'name') return;
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  addEventListener('resize', () => {
    resize();
    if (phase === 'name') buildName();
    if (phase === 'welcome') setTargets(getWelcomeTargets());
  });

  addEventListener('click', assembleWelcome);
  intro.addEventListener('touchend', event => {
    event.preventDefault();
    assembleWelcome();
  }, { passive: false });

  setInterval(() => {
    if (phase !== 'name') return;
    particles.forEach(particle => {
      if (Math.random() > .975) {
        particle.x += (Math.random() - .5) * 30;
        particle.y += (Math.random() - .5) * 30;
      }
    });
  }, 160);

  resize();
  buildName();
  animate();

  Promise.all([
    document.fonts.load('900 80px Bebas Neue'),
    document.fonts.load('700 32px JetBrains Mono')
  ]).finally(() => {
    if (phase === 'name') buildName();
  });
})();
