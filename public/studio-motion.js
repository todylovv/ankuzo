(() => {
  const intro = document.getElementById('asciiIntro');
  const wipe = document.querySelector('.intro-wipe');
  const hero = document.querySelector('.hero');
  const logo = document.querySelector('.hero-name');
  const sections = [...document.querySelectorAll('#terminal,#about,#skills,#playstation,#games,#steam,#contact')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (intro && wipe) {
    const observer = new MutationObserver(() => {
      if (!intro.classList.contains('intro-complete')) return;
      wipe.classList.add('intro-wipe-active');
      observer.disconnect();
      setTimeout(() => wipe.remove(), 1400);
    });
    observer.observe(intro, { attributes: true, attributeFilter: ['class'] });
  }

  if (hero && logo && !reducedMotion) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    hero.addEventListener('pointermove', event => {
      const bounds = hero.getBoundingClientRect();
      targetX = (event.clientX / bounds.width - .5) * 2;
      targetY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
    });
    hero.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
    });
    const animateLogo = () => {
      currentX += (targetX - currentX) * .065;
      currentY += (targetY - currentY) * .065;
      logo.style.setProperty('--logo-x', currentX.toFixed(4));
      logo.style.setProperty('--logo-y', currentY.toFixed(4));
      requestAnimationFrame(animateLogo);
    };
    requestAnimationFrame(animateLogo);
  }

  sections.forEach((section, index) => {
    section.dataset.studioIndex = String(index + 1).padStart(2, '0');
  });

  const revealTargets = document.querySelectorAll(
    '.about-text,.about-right,.skill-card,.terminal-intro,.terminal-console,.platform-intro,.platform-frame,.ps-profile,.game-row,.steam-intro,.steam-shell,.steam-accounts,.steam-banners,.steam-stats-row,#steamTopGames,.contact-copy,.contact-action,footer'
  );
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('studio-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '-8% 0px -7%', threshold: .08 });
  revealTargets.forEach(target => {
    target.classList.add('studio-reveal');
    revealObserver.observe(target);
  });

  const updateScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    document.documentElement.style.setProperty('--studio-progress', (scrollY / max).toFixed(4));
    document.documentElement.style.setProperty('--studio-scroll', `${scrollY.toFixed(1)}px`);
  };
  addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();
})();

(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const stage = document.querySelector('.game-stage');
  const gameRows = [...document.querySelectorAll('.game-row[data-game-index]')];

  function setActiveGame(row) {
    if (!row || !stage) return;
    gameRows.forEach(item => item.classList.toggle('game-row-active', item === row));
    stage.querySelector('.game-stage-mark').textContent = row.dataset.gameIndex;
    stage.querySelector('.game-stage-copy strong').textContent = row.dataset.gameTitle;
    stage.querySelector('.game-stage-copy small').textContent = row.dataset.gameMeta;
    stage.querySelector('.game-stage-meter i').style.width = `${Number(row.dataset.gameIndex) * 25}%`;
    stage.dataset.active = row.dataset.gameIndex;
  }

  gameRows.forEach(row => {
    row.addEventListener('pointerenter', () => setActiveGame(row));
    row.addEventListener('focus', () => setActiveGame(row));
  });

  document.querySelectorAll('.skill-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--skill-x', `${((event.clientX - bounds.left) / bounds.width * 100).toFixed(1)}%`);
    });
  });

  if (reducedMotion || !hasGsap) return;
  gsap.registerPlugin(ScrollTrigger);

  if (!window.studioLenis && typeof Lenis !== 'undefined' && matchMedia('(min-width: 901px) and (pointer: fine)').matches) {
    const lenis = new Lenis({
      duration: 1.08,
      smoothWheel: true,
      anchors: true
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.studioLenis = lenis;
  }

  if (typeof SplitType !== 'undefined' && matchMedia('(min-width: 901px) and (pointer: fine)').matches) {
    document.querySelectorAll('.terminal-intro h2,.about-manifesto h2,.skills-heading h2,.platform-intro h2,.games-intro h2,.steam-intro h2,.contact-copy h2').forEach(title => {
      const split = new SplitType(title, {
        types: 'lines,chars',
        lineClass: 'split-line',
        charClass: 'split-char'
      });
      gsap.from(split.chars, {
        scrollTrigger: {
          trigger: title,
          start: 'top 86%',
          once: true
        },
        yPercent: 115,
        opacity: 0,
        duration: .88,
        ease: 'power4.out',
        stagger: .026
      });
    });
  }

  gsap.utils.toArray('.section-label').forEach(label => {
    gsap.fromTo(label, { x: -20, opacity: 0 }, {
      x: 0,
      opacity: 1,
      duration: .75,
      ease: 'power3.out',
      scrollTrigger: { trigger: label, start: 'top 92%', once: true }
    });
  });

  if (stage && matchMedia('(min-width: 901px)').matches) {
    gsap.to('.game-stage-grid', {
      yPercent: -14,
      rotation: -4,
      ease: 'none',
      scrollTrigger: { trigger: '#games', start: 'top bottom', end: 'bottom top', scrub: 1.1 }
    });
    gsap.to('.game-stage-orbit', {
      rotation: 84,
      scale: 1.12,
      ease: 'none',
      scrollTrigger: { trigger: '#games', start: 'top bottom', end: 'bottom top', scrub: 1.1 }
    });
    gameRows.forEach(row => {
      ScrollTrigger.create({
        trigger: row,
        start: 'top 57%',
        end: 'bottom 43%',
        onEnter: () => setActiveGame(row),
        onEnterBack: () => setActiveGame(row)
      });
    });
  }

  gsap.fromTo('.contact-action a', { clipPath: 'inset(0 100% 0 0)' }, {
    clipPath: 'inset(0 0% 0 0)',
    duration: 1.15,
    ease: 'power4.inOut',
    scrollTrigger: { trigger: '.contact-action', start: 'top 78%', once: true }
  });

  ScrollTrigger.refresh();
})();
