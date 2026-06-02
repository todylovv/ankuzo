(() => {
  const chapters = [
    ['terminal', '01', 'TERMINAL'],
    ['about', '02', 'PROFILE'],
    ['skills', '03', 'SYSTEMS'],
    ['playstation', '04', 'PS5'],
    ['games', '05', 'TIMELINE'],
    ['steam', '06', 'STEAM'],
    ['contact', '07', 'CONTACT']
  ];
  const sections = chapters
    .map(([id, number, label]) => ({ id, number, label, el: document.getElementById(id) }))
    .filter(chapter => chapter.el);
  if (!sections.length) return;

  const rail = document.createElement('aside');
  rail.className = 'scroll-rail';
  rail.setAttribute('aria-label', 'Навигация по странице');
  rail.innerHTML = `
    <div class="scroll-rail-head"><span>INDEX</span><b>00</b></div>
    <div class="scroll-rail-track"><i></i></div>
    <nav class="scroll-rail-nav">
      ${sections.map(({ id, number, label }) => `
        <a href="#${id}" data-chapter="${id}" aria-label="${number} ${label}">
          <span>${number}</span><b>${label}</b>
        </a>`).join('')}
    </nav>
    <div class="scroll-rail-depth">DEPTH <b>000</b></div>`;
  document.body.appendChild(rail);

  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.innerHTML = '<i></i>';
  document.body.appendChild(progress);

  const atmosphere = document.createElement('div');
  atmosphere.className = 'scroll-atmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  atmosphere.innerHTML = `
    <canvas class="scroll-code-tunnel"></canvas>
    <div class="scroll-atmosphere-grid"></div>
    <div class="scroll-atmosphere-glow"></div>
    <div class="scroll-atmosphere-ring scroll-atmosphere-ring-a"></div>
    <div class="scroll-atmosphere-ring scroll-atmosphere-ring-b"></div>
    <div class="scroll-atmosphere-beam"></div>
    <div class="scroll-atmosphere-cross"></div>
    <div class="scroll-atmosphere-code">OBSERVATORY / <b>01</b></div>
    <div class="scroll-atmosphere-number">01</div>`;
  document.body.prepend(atmosphere);

  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const railNumber = rail.querySelector('.scroll-rail-head b');
  const depth = rail.querySelector('.scroll-rail-depth b');
  const links = [...rail.querySelectorAll('[data-chapter]')];
  const atmosphereNumber = atmosphere.querySelector('.scroll-atmosphere-number');
  const atmosphereCode = atmosphere.querySelector('.scroll-atmosphere-code b');
  const tunnel = atmosphere.querySelector('.scroll-code-tunnel');
  const tunnelContext = tunnel.getContext('2d');
  const tunnelEnabled = getComputedStyle(tunnel).display !== 'none';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const route = [0, -.12, .14, -.1, .11, -.06, .04];
  const fragments = [
    'const', 'root', '0xAF', '{ }', 'NULL', 'sudo', 'while', '=>',
    '/sys', 'chmod', 'trace', '1011', 'grep', 'node', '[ ]', '::'
  ];
  let tunnelWidth = 0;
  let tunnelHeight = 0;
  let tunnelParticles = [];
  let cameraX = 0;
  let cameraTarget = 0;
  let lastFrame = 0;
  let ticking = false;
  let activeId = '';

  function makeParticle(index) {
    const angle = (index * 2.399) % (Math.PI * 2);
    const radius = .23 + ((index * 37) % 100) / 112;
    return {
      angle,
      radius,
      z: ((index * 67) % 100) / 100,
      speed: .75 + (index % 7) * .13,
      text: fragments[index % fragments.length],
      size: 7 + (index % 4) * 2
    };
  }

  function resizeTunnel() {
    if (!tunnelEnabled) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    tunnelWidth = innerWidth;
    tunnelHeight = innerHeight;
    tunnel.width = Math.round(tunnelWidth * ratio);
    tunnel.height = Math.round(tunnelHeight * ratio);
    tunnel.style.width = `${tunnelWidth}px`;
    tunnel.style.height = `${tunnelHeight}px`;
    tunnelContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    const amount = tunnelAmount();
    tunnelParticles = Array.from({ length: amount }, (_, index) => makeParticle(index));
  }

  function tunnelAmount() {
    const level = root.dataset.perf || (innerWidth < 700 ? 'mid' : 'high');
    if (level === 'low') return 18;
    if (level === 'mid') return innerWidth < 700 ? 24 : 38;
    return innerWidth < 700 ? 34 : 64;
  }

  function drawTunnel(time = 0, forced = false) {
    if (!tunnelEnabled) return;
    const level = root.dataset.perf || (innerWidth < 700 ? 'mid' : 'high');
    const frameGap = level === 'mid' ? 50 : 33;
    if (!forced && !reducedMotion && time - lastFrame < frameGap) {
      requestAnimationFrame(drawTunnel);
      return;
    }
    lastFrame = time;
    if (!tunnelWidth || !tunnelHeight) resizeTunnel();
    const desiredAmount = tunnelAmount();
    if (tunnelParticles.length !== desiredAmount) {
      tunnelParticles = Array.from({ length: desiredAmount }, (_, index) => makeParticle(index));
    }
    cameraX += (cameraTarget - cameraX) * .06;
    const scrollTravel = scrollY * .00072;
    const idleTravel = reducedMotion ? 0 : time * .000018;
    const centerX = tunnelWidth * .5 + cameraX;
    const centerY = tunnelHeight * .47;
    tunnelContext.clearRect(0, 0, tunnelWidth, tunnelHeight);

    tunnelParticles.forEach((particle, index) => {
      const z = (particle.z + scrollTravel * particle.speed + idleTravel) % 1;
      const depth = .11 + z * z * 1.2;
      const reach = Math.max(tunnelWidth, tunnelHeight) * depth;
      const x = centerX + Math.cos(particle.angle) * particle.radius * reach;
      const y = centerY + Math.sin(particle.angle) * particle.radius * reach * .68;
      const previousDepth = Math.max(.08, depth - .045);
      const previousReach = Math.max(tunnelWidth, tunnelHeight) * previousDepth;
      const previousX = centerX + Math.cos(particle.angle) * particle.radius * previousReach;
      const previousY = centerY + Math.sin(particle.angle) * particle.radius * previousReach * .68;
      const alpha = Math.min(.34, .025 + z * .29);

      tunnelContext.beginPath();
      tunnelContext.moveTo(previousX, previousY);
      tunnelContext.lineTo(x, y);
      tunnelContext.strokeStyle = `rgba(240,237,232,${alpha * .42})`;
      tunnelContext.lineWidth = Math.max(.35, z * 1.1);
      tunnelContext.stroke();
      if (index % 3 || z > .46) {
        tunnelContext.fillStyle = `rgba(240,237,232,${alpha})`;
        tunnelContext.font = `${Math.max(6, particle.size * (.46 + z * .68))}px "JetBrains Mono", monospace`;
        tunnelContext.fillText(particle.text, x, y);
      }
    });
    if (!reducedMotion && level !== 'low') requestAnimationFrame(drawTunnel);
  }

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    const chapter = sections.find(item => item.id === id);
    links.forEach(link => link.classList.toggle('active', link.dataset.chapter === id));
    if (chapter) {
      const index = sections.indexOf(chapter);
      railNumber.textContent = chapter.number;
      atmosphereNumber.textContent = chapter.number;
      atmosphereCode.textContent = chapter.number;
      root.style.setProperty('--chapter-index', index);
      root.style.setProperty('--glow-left', `${-25 + index * 10}vw`);
      root.style.setProperty('--glow-top', `${4 + index * 7}vh`);
      root.style.setProperty('--ring-a-right', `${-18 + index * 3}vw`);
      root.style.setProperty('--ring-a-top', `${13 - index * 5}vh`);
      root.style.setProperty('--ring-b-left', `${-9 + index * 6}vw`);
      root.style.setProperty('--ring-b-bottom', `${-12 + index * 4}vh`);
      root.style.setProperty('--cross-top', `${24 + index * 8}vh`);
      document.body.dataset.chapter = chapter.id;
    }
  }

  function update() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const value = Math.min(1, Math.max(0, scrollY / max));
    const heroDepth = Math.min(1, scrollY / Math.max(1, innerHeight));
    const marker = scrollY + innerHeight * .42;
    let current = sections[0];
    let routePosition = route[0];
    for (let index = 0; index < sections.length; index++) {
      const chapter = sections[index];
      if (chapter.el.offsetTop <= marker) current = chapter;
      const next = sections[index + 1];
      if (next && marker >= chapter.el.offsetTop && marker < next.el.offsetTop) {
        const distance = next.el.offsetTop - chapter.el.offsetTop;
        const blend = Math.min(1, Math.max(0, (marker - chapter.el.offsetTop) / distance));
        const eased = blend * blend * (3 - 2 * blend);
        routePosition = route[index] + (route[index + 1] - route[index]) * eased;
        break;
      }
      if (!next && marker >= chapter.el.offsetTop) routePosition = route[index];
    }
    cameraTarget = routePosition * innerWidth;
    root.style.setProperty('--page-progress', value.toFixed(4));
    root.style.setProperty('--hero-depth', heroDepth.toFixed(4));
    root.style.setProperty('--scroll-px', `${scrollY.toFixed(1)}px`);
    root.style.setProperty('--grid-shift', `${(scrollY * .075).toFixed(1)}px`);
    root.style.setProperty('--ring-a-rotate', `${(scrollY * .018).toFixed(1)}deg`);
    root.style.setProperty('--ring-b-rotate', `${(scrollY * -.025).toFixed(1)}deg`);
    root.style.setProperty('--camera-x', `${cameraTarget.toFixed(1)}px`);
    depth.textContent = String(Math.round(value * 100)).padStart(3, '0');
    hero?.classList.toggle('hero-passed', heroDepth > .7);

    setActive(current.id);
    if (tunnelEnabled && (reducedMotion || root.dataset.perf === 'low')) drawTunnel(performance.now(), true);
    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('chapter-visible', entry.isIntersecting));
  }, { rootMargin: '-12% 0px -10%', threshold: .08 });

  sections.forEach(({ el }, index) => {
    el.classList.add('scroll-chapter');
    el.style.setProperty('--chapter-shift', `${route[index] * 390}px`);
    observer.observe(el);
  });
  addEventListener('scroll', requestUpdate, { passive: true });
  addEventListener('resize', () => {
    resizeTunnel();
    requestUpdate();
  }, { passive: true });
  if (tunnelEnabled) {
    resizeTunnel();
    if (reducedMotion) drawTunnel();
    else requestAnimationFrame(drawTunnel);
  }
  update();
})();
