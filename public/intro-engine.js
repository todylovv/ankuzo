// 3D ASCII mask render
(function(){
  var el = document.getElementById('introAscii');
  if(!el) return;
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function(){
    var cols = 72, rows = 40;
    var cv = document.createElement('canvas');
    cv.width = cols; cv.height = rows;
    var cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0, cols, rows);
    var px = cx.getImageData(0, 0, cols, rows).data;
    // chars ordered light→dense, matching brightness 0(black)→255(white)
    var ch = ' .·:;=+-*o0#@';
    var s = '';
    for(var y = 0; y < rows; y++){
      for(var x = 0; x < cols; x++){
        var i = (y * cols + x) * 4;
        var b = px[i]*0.299 + px[i+1]*0.587 + px[i+2]*0.114;
        s += ch[Math.round(b / 255 * (ch.length - 1))];
      }
      if(y < rows - 1) s += '\n';
    }
    el.textContent = s;
  };
  img.onerror = function(){ el.style.display = 'none'; };
  var base = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/' : '/ankuzo/';
  img.src = base + 'assets/mask-intro.png';
})();

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
  const compactExperience = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
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
  if (compactExperience) {
    intro.classList.add('hide');
    return;
  }
  draw();
  setTimeout(tick, reducedMotion ? 0 : 140);
  setTimeout(enter, reducedMotion ? 0 : 3200);
})();
