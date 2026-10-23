(() => {
  'use strict';
  const { formatTime } = window.AnkuzoTimer;
  const $ = id => document.getElementById(id);
  const form = $('settings-form');
  let state = null;
  let sourceMetrics = null;
  let dirty = false;
  let filled = false;
  let offset = 0;
  let inFlight = false;
  const apiBase = new URL('.', location.href);
  apiBase.username = ''; apiBase.password = '';
  const sceneParam = new URLSearchParams(location.search).get('scene');
  if(sceneParam==='follow'){location.replace(new URL('follow-control.html',apiBase));return;}
  let selectedScene = ['break', 'overlay','mapcover'].includes(sceneParam) ? sceneParam : 'starting';
  const busyControls = '.transport button, #show-timer, #scene-selector, #settings-form button, #settings-form input, #settings-form select';
  const apiUrl = (route, scene = selectedScene) => {
    const url = new URL(route, apiBase);
    if (scene !== 'starting') url.searchParams.set('scene', scene);
    return url;
  };
  function updateSceneView() {
    $('scene-selector').value = selectedScene;
    const overlay = selectedScene === 'overlay';
    const mapcover=selectedScene==='mapcover',widget=overlay||mapcover;
    const page = ({starting:'scene.html',break:'break.html',overlay:'overlay.html',mapcover:'mapcover.html'})[selectedScene];
    $('source-mode').value='widget';sourceMetrics=null;
    document.querySelector('.scene-link').href = page;
    document.querySelector('.section-intro p').textContent = mapcover?'Миникарта закрыта, чат — на обороте карты.':overlay ? 'Текст, размещение и появление поверх игры.' : 'Надписи и таймер — под твоим контролем.';
    $('scene-scope').textContent = widget?'Отдельный виджет: размещай мышью в OBS.':'Отдельные надписи и таймер для каждой сцены.';
    $('subtitle-field').hidden = selectedScene === 'starting'||mapcover;
    $('title-field').hidden=mapcover;
    $('timer-panel').hidden = widget;$('countdown-fields').hidden = widget;$('overlay-fields').hidden = !overlay;$('mapcover-fields').hidden=!mapcover;$('layout-link').hidden = !widget;
    $('title-label').textContent = widget ? 'Ник на виджете' : 'Текст заставки';$('title').maxLength = widget ? 24 : 80;
    $('subtitle-label').textContent = overlay ? 'Подпись под ником' : 'Текст под заголовком';$('subtitle').maxLength = overlay ? 60 : 80;
    $('preview-kind').textContent = mapcover?'Непрозрачная заглушка · холст 1920 × 1080':overlay ? 'Прозрачный фон · 1920 × 1080' : 'Предпросмотр · 16:9';
    document.querySelector('.preview-frame').classList.toggle('overlay-preview',widget);
    document.querySelector('.controls').classList.toggle('overlay-controls',widget);
    document.querySelector('.local-note').textContent = mapcover?'Подгони заглушку по радару в OBS с небольшим запасом. Ссылка виджета сохраняется, изменения приходят автоматически.':overlay ? 'Настройки оверлея сохраняются на сервере и обновляют источник OBS автоматически.' : 'Настройки сохраняются на сервере. Таймер запускается только по твоей команде.';
    configureSource();
    $('connection').textContent = 'Загружаем сцену…';
    document.querySelectorAll(busyControls).forEach(el => { if (el.id !== 'scene-selector') el.disabled = true; });
  }
  function smallScene(){return selectedScene==='overlay'||selectedScene==='mapcover';}
  function compactSource(){return smallScene()&&$('source-mode').value==='widget';}
  function sourceDimensions(){
    if(!compactSource())return {width:1920,height:1080};
    if(sourceMetrics)return sourceMetrics;
    if(selectedScene==='mapcover'&&state)return {width:state.settings.width,height:state.settings.height};
    return null;
  }
  function syncSourceDimensions(){
    const compact=compactSource(),size=sourceDimensions();
    const dimensions=size?`${size.width} × ${size.height}`:'Определяем размер…';
    $('source-dimensions').textContent=dimensions;$('obs-source-configuration').textContent=dimensions+' · 60 FPS';
    $('preview-kind').textContent=compact?'Отдельный виджет · '+dimensions+' px':smallScene()?'Холст 1920 × 1080':'Предпросмотр · 16:9';
    const preview=document.querySelector('.preview-frame'),caption=document.querySelector('.preview-caption');
    preview.style.aspectRatio=compact&&size?`${size.width}/${size.height}`:'16/9';
    const maxWidth=compact&&size?Math.min(640,360*size.width/size.height):640;
    preview.style.maxWidth=caption.style.maxWidth=maxWidth+'px';
  }
  function syncSourceLink(){
    if(!$('scene-url').value)return;
    const url=new URL($('scene-url').value);
    if(compactSource())url.searchParams.set('widget','1');else url.searchParams.delete('widget');
    $('scene-url').value=url.href;
  }
  function syncPlacementControls(){
    document.querySelectorAll('[data-source-placement] input,[data-source-placement] select').forEach(el=>{
      const active=selectedScene==='overlay'?el.closest('#overlay-fields'):selectedScene==='mapcover'?el.closest('#mapcover-fields'):false;
      el.disabled=compactSource()||inFlight||!state||!active;
    });
  }
  function configureSource(){
    const compact=compactSource(),page=({starting:'scene.html',break:'break.html',overlay:'overlay.html',mapcover:'mapcover.html'})[selectedScene]+(compact?'?widget=1':'');
    $('source-format').hidden=!smallScene();$('source-guidance').hidden=!compact;
    document.querySelectorAll('[data-source-placement]').forEach(el=>{el.hidden=compact;});
    if($('preview').getAttribute('src')!==page)$('preview').src=page;
    document.querySelector('.scene-link').href=page;
    if(smallScene())document.querySelector('.local-note').textContent=compact?'Положение и масштаб задаются в OBS. Текст, внешний вид и появление обновляются из пульта по той же ссылке.':'Старый формат: положение и отступы на холсте задаются в пульте.';
    syncPlacementControls();syncSourceDimensions();syncSourceLink();
  }
  $('source-mode').addEventListener('change',()=>{configureSource();linkFeedback('Формат выбран. Скопируй ссылку и укажи размеры источника выше.');});
  addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==$('preview').contentWindow||event.data?.type!=='ankuzo-widget-size'||event.data.scene!==selectedScene)return;
    const {width,height}=event.data;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>2000||height>2000)return;
    sourceMetrics={width,height};syncSourceDimensions();
  });
  let linkBusy = false;
  let linkNoticeTimer;
  let linkRetryTimer;
  function enableControls() {
    document.querySelectorAll(busyControls).forEach(el=>{el.disabled=false;});
    for(const id of ['countdown-fields','timer-panel','overlay-fields','mapcover-fields'])if($(id).hidden)$(id).querySelectorAll('input,select,button').forEach(el=>{el.disabled=true;});
    updateAppearanceFields();
    updateCoverFields();
    if(selectedScene==='mapcover')$('title').disabled=true;
    syncPlacementControls();
  }
  function updateCoverFields(){
    const active=selectedScene==='mapcover'&&!inFlight,chat=active&&$('cover-chat').checked;
    const rectangle=$('cover-shape').value==='rectangle';$('cover-height-field').hidden=!rectangle;$('cover-height').disabled=!active||!rectangle;
    $('cover-width-label').textContent=rectangle?'Ширина, px':'Сторона, px';if(!rectangle)$('cover-height').value=$('cover-width').value;
    $('cover-chat-fields').hidden=!$('cover-chat').checked;
    $('cover-chat-fields').querySelectorAll('input,select,button').forEach(el=>{el.disabled=!chat;});
    $('cover-x').max=String(1920-Number($('cover-width').value));$('cover-y').max=String(1080-Number($('cover-height').value));
  }
  for(const id of ['cover-width','cover-height','cover-chat','cover-shape'])$(id).addEventListener('input',updateCoverFields);
  $('cover-shape').addEventListener('change',updateCoverFields);
  $('cover-chat-preview').addEventListener('click',()=>{$('preview').contentWindow.postMessage({type:'ankuzo-chat-preview'},location.origin);});
  function updateAppearanceFields() {
    const periodic=selectedScene==='overlay'&&$('overlay-appearance').value==='periodic';
    $('overlay-schedule-fields').hidden=!periodic;
    $('overlay-interval').disabled=!periodic||inFlight;$('overlay-duration').disabled=!periodic||inFlight;
    $('overlay-duration').max=String(Math.min(120,Math.max(3,Number($('overlay-interval').value)*60-1)));
  }
  $('overlay-appearance').addEventListener('change',updateAppearanceFields);
  $('overlay-interval').addEventListener('input',updateAppearanceFields);
  function feedback(text, error = false) {
    $('feedback').textContent = text;
    $('feedback').classList.toggle('error', error);
  }
  function fill(settings) {
    $('title').value = settings.title;
    $('subtitle').value = settings.subtitle || '';
    $('timer-label').value = settings.timerLabel;
    $('minutes').value = settings.minutes;
    $('finish-text').value = settings.finishedText;
    $('motion').value = !settings.motion ? 'off' : settings.quality === 'light' ? 'light' : 'full';
    if(selectedScene==='overlay'){
      $('overlay-visible').checked=settings.overlayVisible;$('overlay-show-cards').checked=settings.showCards;$('overlay-show-subtitle').checked=settings.showSubtitle;
      $('overlay-position').value=settings.position;$('overlay-size').value=settings.size;$('overlay-opacity').value=settings.opacity;
      $('overlay-x').value=settings.marginX;$('overlay-y').value=settings.marginY;
      $('overlay-background').checked=settings.showBackground;$('overlay-appearance').value=settings.appearanceMode;
      $('overlay-interval').value=settings.intervalSeconds/60;$('overlay-duration').value=settings.visibleSeconds;
      updateAppearanceFields();
    }
    if(selectedScene==='mapcover'){
      $('cover-shape').value=settings.shape;
      for(const [id,key]of [['cover-width','width'],['cover-height','height'],['cover-x','x'],['cover-y','y'],['cover-chat-duration','chatDuration']])$(id).value=settings[key];
      $('cover-lines').value=String(settings.chatLines);$('cover-chat').checked=settings.chatEnabled;$('cover-visible').checked=settings.coverVisible;updateCoverFields();
    }
    filled = true;
  }
  function apply(next, syncForm = false) {
    const changed = next.revision !== state?.revision;
    state = next;
    offset = next.serverNow - Date.now();
    if (!filled || syncForm || (changed && !dirty)) { fill(next.settings); dirty = false; }
    $('show-timer').checked = next.settings.showTimer;
    $('connection').textContent = 'Пульт подключён';
    $('connection').classList.remove('error');
    if (!inFlight) enableControls();
    syncSourceDimensions();
    tick();
  }
  function tick() {
    if (!state) return;
    if(selectedScene==='mapcover')return;
    if (selectedScene === 'overlay') {
      const a=state.appearance,remaining=a?.nextChangeAt?Math.max(0,Math.ceil((a.nextChangeAt-Date.now()-offset)/1000)):0;
      $('overlay-cycle-status').textContent=!state.settings.overlayVisible?'Оверлей скрыт. Включи «Оверлей в кадре», чтобы возобновить показ.':state.settings.appearanceMode==='always'?'Оверлей показывается постоянно.':a?.visible?`В кадре · скроется через ${remaining} сек.`:`Следующее появление через ${formatTime(remaining)}.`;
      return;
    }
    const time = state.timer.running ? Math.max(0, state.timer.endAt - Date.now() - offset) : state.timer.remainingMs;
    $('control-time').textContent = formatTime(time / 1000);
    $('toggle-timer').textContent = time <= 0 ? 'Заново' : state.timer.running ? 'Пауза' : 'Запустить';
    $('timer-status').textContent = time <= 0 ? 'Время вышло' : state.timer.running ? 'Идёт отсчёт' : 'Ожидает запуска';
    $('timer-hint').textContent = state.settings.showTimer ? 'Таймер виден зрителям.' : state.timer.running ? 'Отсчёт идёт, таймер скрыт от зрителей.' : 'Запуск автоматически покажет таймер в кадре.';
  }
  async function command(action, extra = {}) {
    if (inFlight) return null;
    inFlight = true;
    document.querySelectorAll(busyControls).forEach(control => { control.disabled = true; });
    try {
      const response = await fetch(new URL('api/control', apiBase), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Ankuzo-Control': '1' }, body: JSON.stringify({ action, scene: selectedScene, ...extra }), signal: AbortSignal.timeout(4000) });
      if (response.status === 401) throw new Error('Нужна авторизация. Обнови пульт и войди заново.');
      if (!response.ok) throw new Error('Не удалось сохранить настройки на сервере. Повтори действие.');
      const next = await response.json();
      apply(next, action === 'settings');
      return next;
    } catch (error) {
      feedback(error.name === 'TypeError' || error.name === 'TimeoutError' ? 'Сервер временно недоступен. Проверь соединение и повтори действие.' : error.message, true);
      return null;
    } finally {
      inFlight = false;
      enableControls();
    }
  }
  async function save() {
    if (!form.reportValidity()) return false;
    const mode = $('motion').value;
    const next = await command('settings', { settings: {
      title: $('title').value, timerLabel: $('timer-label').value,
      subtitle: $('subtitle').value,
      minutes: Number($('minutes').value), finishedText: $('finish-text').value,
      motion: mode !== 'off', quality: mode === 'light' ? 'light' : 'full',
      ...(selectedScene==='overlay'?{overlayVisible:$('overlay-visible').checked,showCards:$('overlay-show-cards').checked,showSubtitle:$('overlay-show-subtitle').checked,position:$('overlay-position').value,size:$('overlay-size').value,opacity:Number($('overlay-opacity').value),marginX:Number($('overlay-x').value),marginY:Number($('overlay-y').value)}:{}),
      ...(selectedScene==='overlay'?{showBackground:$('overlay-background').checked,appearanceMode:$('overlay-appearance').value,intervalSeconds:Number($('overlay-interval').value)*60,visibleSeconds:Number($('overlay-duration').value)}:{}),
      ...(selectedScene==='mapcover'?{shape:$('cover-shape').value,width:Number($('cover-width').value),height:Number($('cover-height').value),x:Number($('cover-x').value),y:Number($('cover-y').value),coverVisible:$('cover-visible').checked,chatEnabled:$('cover-chat').checked,chatLines:Number($('cover-lines').value),chatDuration:Number($('cover-chat-duration').value)}:{}),
    } });
    if (next) feedback('Изменения уже в сцене. Настройки сохранены.');
    return Boolean(next);
  }
  form.addEventListener('input', () => { dirty = true; feedback('Есть изменения — примени их к сцене.'); });
  form.addEventListener('submit', async event => { event.preventDefault(); await save(); });
  $('scene-selector').addEventListener('change', async event => {
    const nextScene = event.target.value;
    if (dirty && !(await save())) { $('scene-selector').value = selectedScene; return; }
    if(nextScene==='follow'){location.href=new URL('follow-control.html',apiBase);return;}
    selectedScene = nextScene;
    state = null; filled = false; dirty = false;
    feedback('');
    const pageUrl = new URL(location.href);
    if (selectedScene !== 'starting') pageUrl.searchParams.set('scene', selectedScene); else pageUrl.searchParams.delete('scene');
    history.replaceState(null, '', pageUrl);
    updateSceneView();
    $('scene-url').value = '';
    showUrl(false);closeReplace();
    await loadLink();
  });
  $('toggle-timer').addEventListener('click', async () => {
    if (!state) return;
    if (dirty && !(await save())) return;
    await command(state.timer.running && state.timer.endAt > Date.now() + offset ? 'pause' : 'start');
  });
  $('reset-timer').addEventListener('click', async () => {
    if (dirty && !(await save())) return;
    if (await command('reset')) feedback('Отсчёт сброшен и ждёт запуска.');
  });
  $('add-time').addEventListener('click', () => command('add'));
  $('show-timer').addEventListener('change', async event => {
    const next = await command('visibility', { visible: event.target.checked });
    if (!next && state) event.target.checked = state.settings.showTimer;
  });
  function linkFeedback(text, error = false) {
    $('link-feedback').textContent = text;
    $('link-feedback').classList.toggle('error', error);
  }
  function showUrl(visible) {
    $('url-details').hidden = !visible;
    $('show-url').setAttribute('aria-expanded', String(visible));
    $('show-url').textContent = visible ? 'Скрыть ссылку' : 'Показать ссылку';
    if (!visible) linkFeedback('Ссылка готова. Скопируй её один раз — она сохранится для следующих эфиров.');
  }
  function closeReplace() {
    $('replace-confirm').hidden = true;
    $('replace-link').setAttribute('aria-expanded', 'false');
  }
  async function loadLink(replace = false, retries = 1) {
    if (linkBusy) return;
    const requestedScene = selectedScene;
    clearTimeout(linkNoticeTimer);
    clearTimeout(linkRetryTimer);
    let retryRead = false;
    linkBusy = true;
    $('copy-url').textContent = 'Скопировать ссылку';
    const controls = ['copy-url', 'show-url', 'replace-link', 'confirm-replace', 'cancel-replace', 'retry-link'];
    controls.forEach(id => { $(id).disabled = true; });
    $('retry-link').hidden = true;
    linkFeedback(replace ? 'Меняем ссылку…' : 'Загружаем ссылку…');
    try {
      const response = await fetch(apiUrl('api/obs-link', requestedScene), {
        method: replace ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(5000),
        ...(replace ? { headers: { 'Content-Type': 'application/json', 'X-Ankuzo-Control': '1' }, body: '{}' } : {}),
      });
      if (response.status === 401) throw new Error('Обнови пульт и войди заново, чтобы получить ссылку.');
      if (!response.ok) throw new Error(replace ? 'Не удалось заменить ссылку. Текущая ссылка продолжает работать.' : 'Не удалось загрузить ссылку. Проверь соединение и повтори.');
      const next = await response.json();
      if (requestedScene !== selectedScene) return;
      const url = new URL(next.url);
      if (url.origin !== location.origin || !url.pathname.startsWith(apiBase.pathname + 'view/')) throw new Error('Не удалось получить ссылку. Повтори загрузку.');
      $('scene-url').value = url.href;syncSourceLink();
      closeReplace();
      linkFeedback(replace ? 'Ссылка заменена. Скопируй новую и вставь в OBS.' : 'Ссылка готова. Скопируй её один раз — она сохранится для следующих эфиров.');
      if (replace) $('copy-url').focus();
    } catch (error) {
      // A timed-out replacement may have committed; disable stale copies until refreshed.
      if (requestedScene !== selectedScene) return;
      if (replace) $('scene-url').value = '';
      const networkError = ['TypeError', 'TimeoutError', 'AbortError'].includes(error.name);
      retryRead = networkError && !replace && retries > 0;
      linkFeedback(networkError ? retryRead ? 'Нет ответа от сервера. Повторяем загрузку ссылки…' : 'Нет ответа от сервера. Повтори загрузку, чтобы получить действующую ссылку.' : error.message, true);
      $('retry-link').hidden = false;
    } finally {
      linkBusy = false;
      controls.forEach(id => { $(id).disabled = !['retry-link', 'cancel-replace'].includes(id) && !$('scene-url').value; });
      if (replace && $('replace-confirm').hidden && $('scene-url').value) $('copy-url').focus();
      if (requestedScene !== selectedScene) loadLink();
      else if (retryRead) linkRetryTimer = setTimeout(() => loadLink(false, retries - 1), 1000);
    }
  }
  $('show-url').addEventListener('click', () => showUrl($('url-details').hidden));
  $('replace-link').addEventListener('click', () => {
    $('replace-confirm').hidden = false;
    $('replace-link').setAttribute('aria-expanded', 'true');
    $('cancel-replace').focus();
  });
  $('cancel-replace').addEventListener('click', () => { closeReplace(); $('replace-link').focus(); });
  $('confirm-replace').addEventListener('click', () => loadLink(true));
  $('retry-link').addEventListener('click', () => loadLink());
  $('copy-url').addEventListener('click', async () => {
    clearTimeout(linkNoticeTimer);
    try {
      await navigator.clipboard.writeText($('scene-url').value);
      $('copy-url').textContent = 'Скопировано';
      const size=sourceDimensions();linkFeedback('Готово. Вставь URL в «Браузер»'+(size?` и задай ${size.width} × ${size.height} px`:'')+'.');
      linkNoticeTimer = setTimeout(() => { $('copy-url').textContent = 'Скопировать ссылку'; }, 2500);
    } catch {
      showUrl(true);
      $('scene-url').focus(); $('scene-url').select();
      linkFeedback('Ссылка выделена. Скопируй её вручную: Ctrl+C или удержание на телефоне.');
    }
  });
  async function poll() {
    const requestedScene = selectedScene;
    try {
      const response = await fetch(apiUrl('api/state', requestedScene), { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw new Error('Connection failed');
      const next = await response.json();
      if (!inFlight && requestedScene === selectedScene) apply(next);
    } catch {
      if (requestedScene === selectedScene) {
        $('connection').textContent = 'Нет связи с сервером · переподключаемся…';
        $('connection').classList.add('error');
      }
    }
    setTimeout(poll, 500);
  }
  setInterval(tick, 100);
  async function chatStatusPoll(){
    if(selectedScene==='mapcover'&&$('cover-chat').checked){try{const r=await fetch(new URL('api/chat',apiBase),{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!r.ok)throw new Error();const s=await r.json();$('cover-chat-status').textContent=s.status==='connected'?'Чат ankuzo подключён. Ждём сообщения зрителей.':'Чат переподключается; миникарта остаётся закрытой.';}catch{$('cover-chat-status').textContent='Чат временно недоступен; миникарта остаётся закрытой.';}}
    setTimeout(chatStatusPoll,3000);
  }
  updateSceneView();
  loadLink();
  poll();
  chatStatusPoll();
})();

// Keep optional tools folded while preserving visible controls for a live microphone.
(() => {
  const details=document.getElementById('speech-disclosure'),count=document.getElementById('speech-count'),stop=document.getElementById('speech-stop');
  if(!details||!count||!stop)return;
  const value=document.getElementById('speech-compact-count'),status=document.getElementById('speech-compact-status');
  function sync(){
    if(value.textContent!==count.textContent)value.textContent=count.textContent;
    const active=!stop.disabled,next=active?'Микрофон включён':'Микрофон выключен';
    if(status.textContent!==next)status.textContent=next;
    details.classList.toggle('mic-active',active);
    if(active)details.open=true;
  }
  new MutationObserver(sync).observe(count,{childList:true,characterData:true,subtree:true});
  new MutationObserver(sync).observe(stop,{attributes:true,attributeFilter:['disabled']});
  details.addEventListener('toggle',()=>{if(!details.open&&!stop.disabled)details.open=true;});
  details.querySelector('summary').addEventListener('click',event=>{if(details.open&&!stop.disabled)event.preventDefault();});
  sync();
})();
