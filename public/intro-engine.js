(() => {
  const intro = document.getElementById('asciiIntro');
  const progress = document.getElementById('introProgress');
  const percent = document.getElementById('introPercent');
  const status = document.getElementById('introStatus');
  if (!intro || !progress || !percent || !status) return;

  const phases = [
    [16, 'CHECKING LOCAL NODE'],
    [38, 'MOUNTING DATA LAYERS'],
    [62, 'LOADING PROFILE MODULES'],
    [84, 'CALIBRATING INTERFACE'],
    [100, 'ACCESS GRANTED']
  ];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let value = 0;
  let finished = false;

  function draw() {
    const phase = phases.find(([target]) => value <= target) || phases.at(-1);
    progress.style.width = `${value}%`;
    percent.textContent = `${String(value).padStart(3, '0')}%`;
    status.textContent = phase[1];
  }

  function enter() {
    if (finished) return;
    finished = true;
    value = 100;
    draw();
    intro.classList.add('intro-complete');
    setTimeout(() => intro.classList.add('hide'), reducedMotion ? 0 : 540);
  }

  function tick() {
    if (finished) return;
    value = Math.min(100, value + Math.ceil(Math.random() * 6));
    draw();
    if (value >= 100) {
      setTimeout(enter, reducedMotion ? 0 : 420);
      return;
    }
    setTimeout(tick, reducedMotion ? 0 : 38 + Math.random() * 72);
  }

  intro.addEventListener('pointerdown', enter);
  addEventListener('keydown', enter, { once: true });
  draw();
  setTimeout(tick, reducedMotion ? 0 : 140);
  setTimeout(enter, reducedMotion ? 0 : 3200);
})();
