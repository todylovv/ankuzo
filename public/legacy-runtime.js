
// в”Ђв”Ђ TERMINAL в”Ђв”Ђ
(function(){
  const body = document.getElementById('termBody');
  const input = document.getElementById('termInput');
  if(!body || !input) return;

  const history = [];
  let histIdx = -1;

  const COMMANDS = {
    help(){
      return [
        {t:'accent', v:'Р”РѕСЃС‚СѓРїРЅС‹Рµ РєРѕРјР°РЅРґС‹:'},
        {t:'dim',    v:'whoami          вЂ” РєС‚Рѕ С‚Р°РєРѕР№ ankuzo'},
        {t:'dim',    v:'skills          вЂ” СЃС‚РµРє Рё РЅР°РїСЂР°РІР»РµРЅРёСЏ'},
        {t:'contact         вЂ” РєР°Рє СЃРІСЏР·Р°С‚СЊСЃСЏ'},
        {t:'dim',    v:'cat manifesto   вЂ” С„РёР»РѕСЃРѕС„РёСЏ'},
        {t:'dim',    v:'ls -la          вЂ” С„Р°Р№Р»РѕРІР°СЏ СЃРёСЃС‚РµРјР°'},
        {t:'dim',    v:'nmap ankuzo     вЂ” СЃРєР°РЅ СЃРёСЃС‚РµРјС‹'},
        {t:'dim',    v:'hack            вЂ” РїРѕРїСЂРѕР±СѓР№'},
        {t:'dim',    v:'sudo rm -rf /   вЂ” РЅРµ РЅР°РґРѕ'},
        {t:'dim',    v:'ping ankuzo     вЂ” РїСЂРѕРІРµСЂРєР° СЃРІСЏР·Рё'},
        {t:'dim',    v:'clear           вЂ” РѕС‡РёСЃС‚РёС‚СЊ С‚РµСЂРјРёРЅР°Р»'},
      ];
    },
    whoami(){
      return [
        {t:'accent', v:'ankuzo'},
        {t:'', v:'Р”СѓРјР°СЋ РєР°Рє Р°С‚Р°РєСѓСЋС‰РёР№ вЂ” СЃС‚СЂРѕСЋ РєР°Рє Р·Р°С‰РёС‚РЅРёРє.'},
        {t:'', v:'РљРёР±РµСЂР±РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ В· Machine Learning В· Big Data'},
        {t:'dim', v:'РЎРїРѕРєРѕР№РЅРѕ. РњРµС‚РѕРґРёС‡РЅРѕ. Р”Рѕ РєРѕРЅС†Р°.'},
      ];
    },
    skills(){
      return [
        {t:'green', v:'[SEC]  Cybersecurity'},
        {t:'dim',   v:'       Pentest В· OSINT В· Forensics В· CTF В· SIEM'},
        {t:'green', v:'[ML]   Machine Learning'},
        {t:'dim',   v:'       Python В· PyTorch В· sklearn В· NLP В· CV'},
        {t:'green', v:'[BIG]  Big Data'},
        {t:'dim',   v:'       Spark В· Kafka В· Hadoop В· SQL В· Airflow'},
        {t:'dim',   v:'       Linux В· Cloud infra В· Git'},
      ];
    },
    contact(){
      return [
        {t:'', v:'Discord: ankuz0'},
        {t:'dim', v:'Р›СѓС‡С€РёР№ СЃРїРѕСЃРѕР± СЃРІСЏР·Р°С‚СЊСЃСЏ вЂ” РЅР°РїСЂСЏРјСѓСЋ РІ DM.'},
        {t:'dim', v:'РћС‚РєСЂС‹С‚ Рє РёРЅС‚РµСЂРµСЃРЅС‹Рј РїСЂРµРґР»РѕР¶РµРЅРёСЏРј.'},
      ];
    },
    'cat manifesto'(){
      return [
        {t:'accent', v:'manifesto.txt'},
        {t:'dim', v:'в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ'},
        {t:'', v:'РЎРёСЃС‚РµРјС‹ Р»РѕРјР°СЋС‚СЃСЏ С‚Р°Рј, РіРґРµ РёС… РЅРµ Р¶РґСѓС‚.'},
        {t:'', v:'Р”Р°РЅРЅС‹Рµ РІСЂСѓС‚ С‚Р°Рј, РіРґРµ РёС… РЅРµ РїСЂРѕРІРµСЂСЏСЋС‚.'},
        {t:'', v:'РЇ СЂР°Р±РѕС‚Р°СЋ РёРјРµРЅРЅРѕ РІ СЌС‚РёС… РјРµСЃС‚Р°С… вЂ”'},
        {t:'', v:'РјРµР¶РґСѓ С‚РµРј, С‡С‚Рѕ РІРёРґРЅРѕ,'},
        {t:'', v:'Рё С‚РµРј, С‡С‚Рѕ РїСЂРѕРёСЃС…РѕРґРёС‚ РЅР° СЃР°РјРѕРј РґРµР»Рµ.'},
        {t:'dim', v:'в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ'},
      ];
    },
    'ls -la'(){
      return [
        {t:'dim', v:'total 1337'},
        {t:'', v:'drwxr-xr-x  berserk/'},
        {t:'', v:'-rwxr-xr-x  pentest.sh'},
        {t:'', v:'-rw-r--r--  models/pytorch_v2.pt'},
        {t:'', v:'-rwxr-xr-x  darkmode.sh'},
        {t:'', v:'-rw-r--r--  souls.db'},
        {t:'', v:'-rwxr-xr-x  ctf_tools/'},
        {t:'', v:'-rw-------  secrets.enc'},
        {t:'dim', v:'???????????  ???'},
      ];
    },
    nmap(){
      return null; // handled async
    },
    hack(){
      return null; // handled async
    },
    ping(){
      return null; // handled async
    },
    'sudo rm -rf /'(){
      return [{t:'err', v:'Permission denied. Nice try.'}];
    },
    clear(){
      return null; // special
    },
  };

  function addLine(text, cls=''){
    const div = document.createElement('div');
    div.className = 'term-line';
    const span = document.createElement('span');
    span.className = 'term-out' + (cls ? ' '+cls : '');
    span.textContent = text;
    div.appendChild(span);
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return span;
  }

  function addPromptLine(cmd){
    const div = document.createElement('div');
    div.className = 'term-line';
    div.innerHTML = `<span style="color:rgba(100,180,240,.5);font-size:11px;">ankuzo@system:~$</span> <span class="term-echo">${cmd}</span>`;
    body.appendChild(div);
  }

  async function typeLines(lines, delay=28){
    for(const l of lines){
      await new Promise(r=>setTimeout(r, delay));
      addLine(l.v||l, l.t||'');
    }
  }

  async function runNmap(){
    addLine('Starting Nmap scan on ankuzo...', 'dim');
    const ports = [
      {p:22,   s:'open',   svc:'ssh'},
      {p:80,   s:'open',   svc:'http'},
      {p:443,  s:'open',   svc:'https'},
      {p:1337, s:'open',   svc:'elite'},
      {p:3306, s:'closed', svc:'mysql'},
      {p:8080, s:'filtered',svc:'???'},
    ];
    for(const port of ports){
      await new Promise(r=>setTimeout(r,120));
      addLine(
        `${String(port.p).padEnd(6)} ${port.s.padEnd(10)} ${port.svc}`,
        port.s==='open'?'green':port.s==='filtered'?'':'err'
      );
    }
    await new Promise(r=>setTimeout(r,200));
    addLine('Nmap done. 6 ports scanned.', 'dim');
  }

  async function runHack(){
    const lines = [
      'Initializing breach sequence...',
      'Bypassing firewall... [в–€в–€в–€в–€в–€в–€в–€в–€в–‘в–‘] 80%',
      'Bypassing firewall... [в–€в–€в–€в–€в–€в–€в–€в–€в–€в–€] 100%',
      'Accessing mainframe...',
      'Decrypting credentials...',
      'ERROR: Target system is ankuzo.',
      'You cannot hack the hacker.',
    ];
    for(const l of lines){
      await new Promise(r=>setTimeout(r,180));
      addLine(l, l.startsWith('ERROR')?'err':l.includes('100')?'green':'dim');
    }
  }

  async function runPing(){
    addLine('PING ankuzo (127.0.0.1): 56 bytes', 'dim');
    for(let i=0;i<4;i++){
      await new Promise(r=>setTimeout(r,400));
      const ms = (Math.random()*2+0.5).toFixed(3);
      addLine(`64 bytes from ankuzo: icmp_seq=${i} ttl=64 time=${ms} ms`, 'green');
    }
    addLine('--- ankuzo ping statistics ---', 'dim');
    addLine('4 packets transmitted, 4 received, 0% packet loss', '');
  }

  async function handleCmd(raw){
    const cmd = raw.trim().toLowerCase();
    if(!cmd) return;

    history.unshift(raw);
    histIdx = -1;
    addPromptLine(raw);

    if(cmd === 'clear'){
      body.innerHTML = '';
      return;
    }
    if(cmd === 'nmap ankuzo' || cmd === 'nmap'){
      await runNmap(); return;
    }
    if(cmd === 'hack'){
      await runHack(); return;
    }
    if(cmd === 'ping ankuzo' || cmd === 'ping'){
      await runPing(); return;
    }

    const fn = COMMANDS[cmd];
    if(fn){
      const lines = fn();
      if(lines) await typeLines(lines);
    } else {
      addLine(`command not found: ${cmd}. Try 'help'`, 'err');
    }
    body.scrollTop = body.scrollHeight;
  }

  input.addEventListener('keydown', async e=>{
    if(e.key === 'Enter'){
      const val = input.value;
      input.value = '';
      await handleCmd(val);
    }
    if(e.key === 'ArrowUp'){
      e.preventDefault();
      if(histIdx < history.length-1){ histIdx++; input.value = history[histIdx]||''; }
    }
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      if(histIdx > 0){ histIdx--; input.value = history[histIdx]||''; }
      else { histIdx=-1; input.value=''; }
    }
    if(e.key==='Tab'){
      e.preventDefault();
      const val = input.value.toLowerCase();
      const match = Object.keys(COMMANDS).find(k=>k.startsWith(val));
      if(match) input.value = match;
    }
  });

  // РєР»РёРєР°Р±РµР»СЊРЅС‹Рµ РїРѕРґСЃРєР°Р·РєРё РєРѕРјР°РЅРґ
  document.querySelectorAll('.term-cmd-hint').forEach(el=>{
    el.addEventListener('click',()=>{ input.value=el.textContent; input.focus(); });
  });

  // С„РѕРєСѓСЃ РїСЂРё РєР»РёРєРµ РЅР° С‚РµСЂРјРёРЅР°Р»
  document.getElementById('termWrap').addEventListener('click',()=>input.focus());
})();

// в”Ђв”Ђ STEAM DATA в”Ђв”Ђ
(function(){
  function animNum(el,target,dur){
    let s=null;
    const run=ts=>{
      if(!s)s=ts;
      const p=Math.min((ts-s)/dur,1);
      const e=1-Math.pow(1-p,3);
      el.textContent=Math.round(e*target).toLocaleString();
      if(p<1)requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  fetch('steam-data.json?_='+Date.now())
    .then(r=>r.json())
    .then(data=>{

      // accounts
      const accEl=document.getElementById('steamAccounts');
      if(accEl&&data.accounts){
        accEl.innerHTML=data.accounts.map(a=>`
          <div class="steam-acc">
            <img class="steam-acc-avatar" src="${a.avatar}" alt="${a.name}" loading="lazy">
            <div style="flex:1;min-width:0;">
              <div class="steam-acc-name">${a.name}</div>
              ${a.gameextrainfo
                ? `<div class="steam-acc-game">в–¶ ${a.gameextrainfo}</div>`
                : `<div class="steam-acc-status ${a.online?'online':'offline'}">
                    <span class="steam-acc-dot ${a.online?'online':'offline'}"></span>
                    ${a.online?'РѕРЅР»Р°Р№РЅ':'РѕС„С„Р»Р°Р№РЅ'}
                  </div>`
              }
            </div>
          </div>`).join('');
      }

      const profilesEl=document.getElementById('gameProfiles');
      if(profilesEl){
        const value=(label,val)=>val!==null&&val!==undefined&&val!==''?`<div class="game-profile-stat"><strong>${val}</strong>${label}</div>`:'';
        const profiles=data.profiles||[];
        const statuses=data.integration_status||{};
        const unavailable=[
          ['FACEIT','b1',statuses.faceit],
          ['APEX','b2',statuses.apex]
        ].filter(([service,,status])=>status&&status!=='200'&&!profiles.some(p=>p.service===service));
        const statusLabel=status=>status==='missing'?'API KEY NOT CONFIGURED':`SYNC UNAVAILABLE В· HTTP ${status}`;
        if(profiles.length||unavailable.length){
        profilesEl.style.display='grid';
        profilesEl.innerHTML=profiles.map(p=>`
          <a class="game-profile" href="${p.url}" target="_blank" rel="noopener noreferrer">
            <div class="game-profile-head">
              <span class="game-profile-service">${p.service}</span>
              <span class="game-profile-account">${p.account} В· ${p.name}</span>
            </div>
            <div class="game-profile-stats">
              ${p.service==='FACEIT'
                ? value('LEVEL',p.level)+value('ELO',p.elo)
                : value('RANK',p.rank)+value('RP',p.rp)+value('LEVEL',p.level)+value('KILLS',p.kills)+value('DAMAGE',p.damage)}
            </div>
            ${p.service==='APEX'?'<div class="game-profile-source">Data provided by Tracker Network</div>':''}
          </a>`).join('')+unavailable.map(([service,account,status])=>`
          <div class="game-profile unavailable">
            <div class="game-profile-head">
              <span class="game-profile-service">${service}</span>
              <span class="game-profile-account">${account}</span>
            </div>
            <div class="game-profile-source">${statusLabel(status)}</div>
          </div>`).join('');
        }
      }

      // banners top 3
      const banEl=document.getElementById('steamBanners');
      if(banEl&&data.top3_banners){
        banEl.innerHTML=data.top3_banners.map((g,i)=>`
          <div class="steam-banner">
            <img src="${g.banner}" alt="${g.name}" loading="lazy" onerror="this.style.display='none'">
            <div class="steam-banner-rank">#${i+1}</div>
            <div class="steam-banner-info">
              <div class="steam-banner-name">${g.name}</div>
              <div class="steam-banner-hours">${g.hours} С‡</div>
            </div>
          </div>`).join('');
      }

      // stats
      const gEl=document.getElementById('stGames');
      const hEl=document.getElementById('stHours');
      if(gEl&&data.stats) animNum(gEl,data.stats.total_games,1200);
      if(hEl&&data.stats) animNum(hEl,data.stats.total_hours,1600);

      if(data.stats&&data.stats.hours_2weeks>0){
        const rw=document.getElementById('stRecentWrap');
        const rv=document.getElementById('stRecent');
        if(rw) rw.style.display='block';
        if(rv) animNum(rv,Math.round(data.stats.hours_2weeks),1000);
      }

      // top games
      const topEl=document.getElementById('steamTopGames');
      if(topEl&&data.top&&data.top.length>0){
        const max=data.top[0].hours||1;
        topEl.innerHTML=data.top.map((g,i)=>`
          <div class="steam-game-row">
            <div class="steam-game-rank">#${i+1}</div>
            <div class="steam-game-name">${g.name}</div>
            <div class="steam-game-bar-wrap"><div class="steam-game-bar" style="width:0%" data-w="${Math.round(g.hours/max*100)}"></div></div>
            <div class="steam-game-hours">${g.hours} С‡</div>
          </div>`).join('');
        setTimeout(()=>{topEl.querySelectorAll('.steam-game-bar').forEach(b=>{b.style.width=b.dataset.w+'%';});},200);
      }

      const upEl=document.getElementById('steamUpdated');
      if(upEl&&data.updated){
        const d=new Date(data.updated);
        upEl.textContent='РѕР±РЅРѕРІР»РµРЅРѕ: '+d.toLocaleString('ru-RU');
      }
    })
    .catch(()=>{
      const s=document.getElementById('steamSection');
      if(s)s.innerHTML='<div style="font-size:11px;letter-spacing:.1em;color:rgba(240,237,232,.2);">РґР°РЅРЅС‹Рµ Р·Р°РіСЂСѓР¶Р°СЋС‚СЃСЏ...</div>';
    });
})();

// в”Ђв”Ђ MAGNETIC BUTTONS в”Ђв”Ђ
(function(){
  if(!window.matchMedia('(hover:hover)').matches) return;
  document.querySelectorAll('.discord-hero,#scrollTop,.nav-logo').forEach(el=>{
    el.classList.add('mag');
    el.addEventListener('mousemove', e=>{
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width/2) * 0.3;
      const dy = (e.clientY - r.top - r.height/2) * 0.3;
      el.style.transform = `translate(${dx}px,${dy}px)`;
    });
    el.addEventListener('mouseleave', ()=>{ el.style.transform=''; });
  });
})();

// в”Ђв”Ђ DEVICE DETECTION в”Ђв”Ђ
const _isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

// в”Ђв”Ђ PERFORMANCE DETECTION в”Ђв”Ђ
const _perf = (function(){
  const cores = navigator.hardwareConcurrency || 4;
  const mem   = navigator.deviceMemory || 4; // GB, РµСЃР»Рё РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ
  const mobile = _isMobileDevice;

  // РћРїСЂРµРґРµР»СЏРµРј СѓСЂРѕРІРµРЅСЊ РїСЂРѕРёР·РІРѕРґРёС‚РµР»СЊРЅРѕСЃС‚Рё
  // low: СЃС‚Р°СЂС‹Р№ РџРљ / СЃР»Р°Р±С‹Р№ С‚РµР»РµС„РѕРЅ
  // mid: СЃСЂРµРґРЅРёР№ РџРљ / С…РѕСЂРѕС€РёР№ С‚РµР»РµС„РѕРЅ
  // high: РјРѕС‰РЅС‹Р№ РџРљ
  let level = 'high';
  if(mobile || cores <= 2 || mem <= 2) level = 'low';
  else if(cores <= 4 || mem <= 4) level = 'mid';

  // Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅРѕ вЂ” Р·Р°РјРµСЂСЏРµРј СЂРµР°Р»СЊРЅС‹Р№ FPS Р·Р° РїРµСЂРІС‹Рµ 60 РєР°РґСЂРѕРІ
  let _measuredFPS = null;
  let _frameCount = 0;
  let _fpsStart = null;
  function measureFPS(ts){
    if(!_fpsStart) _fpsStart = ts;
    _frameCount++;
    if(_frameCount < 60){
      requestAnimationFrame(measureFPS);
    } else {
      _measuredFPS = Math.round(_frameCount / ((ts - _fpsStart) / 1000));
      // Р•СЃР»Рё СЂРµР°Р»СЊРЅС‹Р№ FPS РЅРёР¶Рµ 40 вЂ” РїРѕРЅРёР¶Р°РµРј СѓСЂРѕРІРµРЅСЊ
      if(_measuredFPS < 40 && level === 'high') level = 'mid';
      if(_measuredFPS < 25) level = 'low';
      applyPerfLevel(level);
    }
  }
  requestAnimationFrame(measureFPS);

  return { level:()=>level, fps:()=>_measuredFPS, cores, mem, mobile };
})();

function applyPerfLevel(level){
  document.documentElement.setAttribute('data-perf', level);

  if(level === 'low'){
    // РћС‚РєР»СЋС‡Р°РµРј С‚СЏР¶С‘Р»С‹Рµ СЌС„С„РµРєС‚С‹
    const dcBanner = document.getElementById('dcBannerCanvas');
    if(dcBanner) dcBanner.style.display = 'none';
    // РЈР±РёСЂР°РµРј CSS Р°РЅРёРјР°С†РёРё
    document.body.classList.add('perf-low');
  }

  if(level === 'mid'){
    document.body.classList.add('perf-mid');
  }
}

// в”Ђв”Ђ PERFORMANCE OPTIMIZATION в”Ђв”Ђ
(function(){
  const isMobile = _isMobileDevice;

  // 1. РћСЃС‚Р°РЅР°РІР»РёРІР°РµРј DC Banner РЅР° РјРѕР±РёР»РєРµ
  if(isMobile){
    const dc = document.getElementById('dcBannerCanvas');
    if(dc) dc.style.display = 'none';
  }

})();

// в”Ђв”Ђ DISCORD CARD BANNER в”Ђв”Ђ
(function(){
  const c = document.getElementById('dcBannerCanvas');
  if(!c || _isMobileDevice || window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const ctx = c.getContext('2d');
  let W, H;
  function resize(){ W=c.offsetWidth; H=c.offsetHeight; c.width=W; c.height=H; }
  resize();

  const lines = Array.from({length:8},()=>({
    x: Math.random()*W, y: Math.random()*H,
    vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4,
    len: Math.random()*60+20, angle: Math.random()*Math.PI*2,
    alpha: Math.random()*.15+.03
  }));

  function draw(){
    if(document.hidden){ requestAnimationFrame(draw); return; }
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#0d0d14';
    ctx.fillRect(0,0,W,H);
    lines.forEach(l=>{
      l.x+=l.vx; l.y+=l.vy;
      if(l.x<0||l.x>W) l.vx*=-1;
      if(l.y<0||l.y>H) l.vy*=-1;
      ctx.strokeStyle=`rgba(240,237,232,${l.alpha})`;
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x+Math.cos(l.angle)*l.len, l.y+Math.sin(l.angle)*l.len);
      ctx.stroke();
      l.angle += .005;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

(function(){
  const DISCORD_ID = '514852654552186880';
  const STATUS_COLORS = {
    online:'#43b581', idle:'#faa61a', dnd:'#f04747', offline:'#747f8d',
  };
  const STATUS_TEXT = {
    online:'РѕРЅР»Р°Р№РЅ', idle:'РѕС‚РѕС€С‘Р»', dnd:'РЅРµ Р±РµСЃРїРѕРєРѕРёС‚СЊ', offline:'РѕС„С„Р»Р°Р№РЅ',
  };

  function hexColor(value){
    return '#'+Number(value).toString(16).padStart(6,'0');
  }

  function renderBadges(flags){
    const badges = document.getElementById('dcBadges');
    if(!badges) return;
    const icons = {
      HOUSE_BRAVERY: {
        className: 'bravery',
        label: 'HypeSquad Bravery',
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5.1-3.4 9.2-8 11-4.6-1.8-8-5.9-8-11V5l8-3Zm0 4.2-3.7 5.1 2.7-.6-1 5.1 5.7-6.5-3 .7L12 6.2Z"/></svg>',
      },
      NITRO: {
        className: 'nitro',
        label: 'Discord Nitro',
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 8.5 5v10L12 22l-8.5-5V7L12 2Zm0 4.2L7.2 9v6l4.8 2.8 4.8-2.8V9L12 6.2Zm-2.6 4.1h5.2v3.4H9.4v-3.4Z"/></svg>',
      },
    };
    badges.innerHTML = (flags||[])
      .filter(flag=>icons[flag])
      .map(flag=>`<span class="dc-badge ${icons[flag].className}" role="img" title="${icons[flag].label}" aria-label="${icons[flag].label}">${icons[flag].svg}</span>`)
      .join('');
  }

  function update(data){
    const status = data.discord_status || 'offline';
    const user   = data.discord_user || {};

    // в”Ђв”Ђ Nav widget в”Ђв”Ђ
    const dot    = document.getElementById('dsDot');
    const stat   = document.getElementById('dsStatus');
    const game   = document.getElementById('dsGame');
    const widget = document.getElementById('dsWidget');
    if(dot){ dot.style.background=STATUS_COLORS[status]; if(status==='online') dot.style.boxShadow=`0 0 6px ${STATUS_COLORS.online}`; }
    if(stat) stat.textContent = STATUS_TEXT[status]||status;
    if(widget) widget.style.display='flex';
    const act = (data.activities||[]).find(a=>a.type===0);
    if(game){
      if(act) game.textContent = 'В· '+act.name;
      else if(data.spotify) game.textContent = 'В· в™« '+data.spotify.song+' вЂ” '+data.spotify.artist;
      else game.textContent = '';
    }

    // в”Ђв”Ђ Discord Card в”Ђв”Ђ
    const avatar = document.getElementById('dcAvatar');
    const decoration = document.getElementById('dcAvatarDecoration');
    const profileBanner = document.getElementById('dcProfileBanner');
    const bannerText = document.getElementById('dcBannerText');
    const ring   = document.getElementById('dcStatusRing');
    const uname  = document.getElementById('dcUsername');
    const stText = document.getElementById('dcStatusText');
    if(avatar && user.avatar && avatar.dataset.asset !== user.avatar){
      const cdn = `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${user.avatar}.${user.avatar.startsWith('a_')?'gif':'webp'}?size=128`;
      avatar.onerror = ()=>{ avatar.onerror=null; avatar.src=cdn; };
      avatar.src = `discord-assets/avatar.webp?v=${encodeURIComponent(user.avatar)}`;
      avatar.dataset.asset = user.avatar;
    }
    if(decoration){
      const asset = user.avatar_decoration_data?.asset;
      decoration.style.display = asset ? 'block' : 'none';
      if(asset && decoration.dataset.asset !== asset){
        const cdn = `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=128&passthrough=true`;
        decoration.onerror = ()=>{ decoration.onerror=null; decoration.src=cdn; };
        decoration.src = `discord-assets/avatar-decoration.png?v=${encodeURIComponent(asset)}`;
        decoration.dataset.asset = asset;
      }
      if(!asset) delete decoration.dataset.asset;
    }
    if(profileBanner && !profileBanner.dataset.asset){
      profileBanner.onload = ()=>{
        profileBanner.style.display = 'block';
        if(bannerText) bannerText.style.display = 'none';
      };
      profileBanner.onerror = ()=>{
        profileBanner.onerror = null;
        if(user.banner){
          profileBanner.src = `https://cdn.discordapp.com/banners/${DISCORD_ID}/${user.banner}.${user.banner.startsWith('a_')?'gif':'webp'}?size=512`;
        } else {
          profileBanner.style.display = 'none';
          if(bannerText) bannerText.style.display = '';
        }
      };
      profileBanner.src = `discord-assets/banner.webp?v=${encodeURIComponent(user.banner || 'manual-2')}`;
      profileBanner.dataset.asset = user.banner || 'manual';
    }
    if(ring){ ring.className='dc-status-ring '+status; }
    if(uname){
      uname.textContent = user.display_name || user.global_name || user.username || 'anku';
      const colors = user.display_name_styles?.colors;
      uname.style.background = colors?.length ? `linear-gradient(90deg,${colors.map(hexColor).join(',')})` : '';
      uname.style.backgroundClip = colors?.length ? 'text' : '';
      uname.style.webkitBackgroundClip = colors?.length ? 'text' : '';
      uname.style.color = colors?.length ? 'transparent' : '';
    }
    if(stText) stText.textContent = STATUS_TEXT[status]||status;

    // Р°РєС‚РёРІРЅРѕСЃС‚СЊ РІ РєР°СЂС‚РѕС‡РєРµ
    const dcAct     = document.getElementById('dcCardActivity');
    const dcActName = document.getElementById('dcActivityName');
    const dcSpo     = document.getElementById('dcCardSpotify');
    const dcSpoName = document.getElementById('dcSpotifyName');
    const dcSpoArt  = document.getElementById('dcSpotifyArtist');

    if(act && dcAct && dcActName){
      dcAct.style.display='block';
      dcActName.textContent = act.name;
      if(dcSpo) dcSpo.style.display='none';
    } else if(data.spotify && dcSpo){
      if(dcAct) dcAct.style.display='none';
      dcSpo.style.display='block';
      if(dcSpoName) dcSpoName.textContent = data.spotify.song;
      if(dcSpoArt)  dcSpoArt.textContent  = data.spotify.artist;
    } else {
      if(dcAct) dcAct.style.display='none';
      if(dcSpo) dcSpo.style.display='none';
    }
  }

  fetch('discord-assets/profile.json?_='+Date.now())
    .then(r=>r.json())
    .then(profile=>{ update(profile); renderBadges(profile.public_flags_array); })
    .catch(()=>{});

  if(matchMedia('(min-width:901px) and (pointer:fine)').matches){
    fetch('https://api.lanyard.rest/v1/users/'+DISCORD_ID)
      .then(r=>r.json())
      .then(j=>{ if(j.success) update(j.data); })
      .catch(()=>{});
    try{
      const ws = new WebSocket('wss://api.lanyard.rest/socket');
      ws.onmessage = e=>{
        const msg = JSON.parse(e.data);
        if(msg.op===1) ws.send(JSON.stringify({op:2,d:{subscribe_to_id:DISCORD_ID}}));
        if(msg.op===0 && msg.d?.discord_user) update(msg.d);
      };
    }catch(e){}
  }
})();

// в”Ђв”Ђ VISITOR COUNTER в”Ђв”Ђ
document.getElementById('footerYear').textContent = new Date().getFullYear();



// в”Ђв”Ђ MOBILE MENU в”Ђв”Ђ
function toggleMenu(){
  const m=document.getElementById('mobileNav');
  const burger=document.getElementById('burger');
  const isOpen=m.classList.toggle('open');
  burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  burger.setAttribute('aria-label', isOpen ? 'Р—Р°РєСЂС‹С‚СЊ РјРµРЅСЋ' : 'РћС‚РєСЂС‹С‚СЊ РјРµРЅСЋ');
}

// в”Ђв”Ђ DISCORD LOADER вЂ” hide after 1.2s or when page ready в”Ђв”Ђ
(function(){
  const loader = document.getElementById('discordLoader');
  if(!loader) return;
  function hideLoader(){
    loader.classList.add('hidden');
    setTimeout(()=>{ loader.style.display='none'; }, 650);
  }
  // hide after max 1.8s regardless
  const maxTimer = setTimeout(hideLoader, 1800);
  window.addEventListener('load', ()=>{
    clearTimeout(maxTimer);
    setTimeout(hideLoader, 400);
  });
})();

// в”Ђв”Ђ CURSOR в”Ђв”Ђ
const cur=document.getElementById('cur'),cur2=document.getElementById('cur2');
const _hasMouse = window.matchMedia('(hover:hover)').matches;
let mx=0,my=0,cx=0,cy=0;
if(_hasMouse && cur && cur2){
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px';});
  document.querySelectorAll('a,button,.pill,.skill-card,.game-row,.nav-burger').forEach(el=>{
    el.addEventListener('mouseenter',()=>document.body.classList.add('hovering'));
    el.addEventListener('mouseleave',()=>document.body.classList.remove('hovering'));
  });
  (function loop(){cx+=(mx-cx)*.13;cy+=(my-cy)*.13;cur2.style.left=cx+'px';cur2.style.top=cy+'px';requestAnimationFrame(loop);})();
}

// в”Ђв”Ђ createLoop вЂ” Р±РµР· Р»РёРјРёС‚Р° FPS в”Ђв”Ђ
function createLoop(fn){
  function tick(ts){
    if(!document.hidden) fn(ts);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// в”Ђв”Ђ NAV SCROLL + SCROLL TO TOP в”Ђв”Ђ
const nav=document.getElementById('nav');
const scrollTopBtn=document.getElementById('scrollTop');
window.addEventListener('scroll',()=>{
  nav.classList.toggle('scrolled',scrollY>60);
  scrollTopBtn.classList.toggle('visible',scrollY>400);
});

// в”Ђв”Ђ ALL CANVAS + ANIMATIONS в”Ђв”Ђ
function _initAll(){

// в”Ђв”Ђ HERO PARTICLES (mouse + touch reactive) в”Ђв”Ђ
(function(){
  const cv=document.getElementById('bgCanvas');
  const ctx=cv.getContext('2d');
  let W,H;
  const dpr=Math.min(window.devicePixelRatio||1,_isMobileDevice?1:2);
  function resize(){
    W=document.documentElement.clientWidth||window.innerWidth;
    H=document.documentElement.clientHeight||window.innerHeight;
    cv.width=Math.floor(W*dpr);cv.height=Math.floor(H*dpr);
    cv.style.width=W+'px';cv.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  window.addEventListener('resize',resize);

  let mouseX=W/2,mouseY=H/2;
  // mouse
  cv.parentElement.addEventListener('mousemove',e=>{
    const r=cv.getBoundingClientRect();
    mouseX=e.clientX-r.left;mouseY=e.clientY-r.top;
  });
  // touch
  cv.parentElement.addEventListener('touchmove',e=>{
    const r=cv.getBoundingClientRect();
    mouseX=e.touches[0].clientX-r.left;
    mouseY=e.touches[0].clientY-r.top;
  },{passive:true});

  const isMobile = ()=> window.innerWidth < 900;
  const count = _isMobileDevice ? 12 : isMobile() ? 25 : 65;
  const pts=Array.from({length:count},()=>({
    x:Math.random()*W,y:Math.random()*H,
    vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,
    r:Math.random()*2+.6
  }));

  function frame(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      const dx=p.x-mouseX,dy=p.y-mouseY,dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<130&&dist>0){const f=(130-dist)/130*.9;p.vx+=dx/dist*f;p.vy+=dy/dist*f;}
      p.vx*=.95;p.vy*=.95;
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;
      if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.8)';ctx.fill();
    });
    const linkDist=isMobile()?80:115;
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
      if(d<linkDist){
        ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(255,255,255,${.28*(1-d/linkDist)})`;ctx.lineWidth=.9;ctx.stroke();
      }
    }
  }
  createLoop(frame);
})();

// в”Ђв”Ђ HERO GLITCH в”Ђв”Ђ
(function(){
  const el=document.getElementById('heroName');
  const orig='ANKUZO';
  const chars='г‚ўг‚¤г‚¦г‚Ё#@%!01г‚¬г‚®ж€¦жљ—е€ѓ';
  let active=false;
  function glitch(){
    if(active)return;active=true;
    let iter=0;
    const iv=setInterval(()=>{
      el.textContent=orig.split('').map((c,i)=>i<iter?c:chars[Math.floor(Math.random()*chars.length)]).join('');
      if(++iter>orig.length){clearInterval(iv);el.textContent=orig;active=false;}
    },52);
  }
  const heroInner=document.querySelector('.hero-inner');
  heroInner.addEventListener('mouseenter',glitch);
  heroInner.addEventListener('touchstart',glitch,{passive:true});
  setTimeout(glitch,1400);
  setInterval(()=>{if(Math.random()>.55)glitch();},5000);
})();

document.querySelectorAll('.pill').forEach(pill=>{
  pill.addEventListener('mousemove',e=>{
    const r=pill.getBoundingClientRect();
    const x=(e.clientX-r.left-r.width/2)*.22;
    const y=(e.clientY-r.top-r.height/2)*.22;
    pill.style.transform=`translate(${x}px,${y}px) translateY(-2px)`;
  });
  pill.addEventListener('mouseleave',()=>{pill.style.transform='';});
});

// в”Ђв”Ђ SKILL CARD 3D TILT в”Ђв”Ђ
document.querySelectorAll('.skill-card').forEach(card=>{
  card.addEventListener('mousemove',e=>{
    const r=card.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    card.style.transform=`translateY(-6px) rotateX(${-y*9}deg) rotateY(${x*9}deg)`;
  });
  card.addEventListener('mouseleave',()=>{card.style.transform='';});
});

// в”Ђв”Ђ GAME TITLE PARALLAX в”Ђв”Ђ
document.querySelectorAll('.game-row').forEach(row=>{
  const title=row.querySelector('.game-title-text');
  row.addEventListener('mousemove',e=>{
    const r=row.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    if(title)title.style.transform=`translateX(${x*7}px)`;
  });
  row.addEventListener('mouseleave',()=>{if(title)title.style.transform='';});
});

// в”Ђв”Ђ SCROLL REVEAL вЂ” matveyan style в”Ђв”Ђ
const allReveal = document.querySelectorAll(
  '.reveal,.reveal-left,.reveal-right,.reveal-scale,.section-label,.skill-card,.game-row,.fact-row'
);
if('IntersectionObserver' in window){
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;

      // stagger siblings of same type inside same parent
      const el = e.target;
      const siblings = el.parentElement
        ? [...el.parentElement.children].filter(c=>
            c.classList.contains(el.classList[0]) && !c.classList.contains('in')
          )
        : [];

      // index within already-seen siblings for cascaded delay
      const idx = siblings.indexOf(el);
      const baseDelay = parseFloat(el.style.transitionDelay||0)*1000;
      const staggerDelay = idx > 0 ? idx * 80 : 0;

      setTimeout(()=>el.classList.add('in'), baseDelay + staggerDelay);
      io.unobserve(el);
    });
  },{threshold:.07, rootMargin:'0px 0px -40px 0px'});

  allReveal.forEach(el=>io.observe(el));
} else {
  allReveal.forEach(el=>el.classList.add('in'));
}

} // end _initAll
_initAll();









