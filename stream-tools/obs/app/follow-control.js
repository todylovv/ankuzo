(() => {
  'use strict';
  const $ = id => document.getElementById(id), base = new URL('.', location.href);
  base.username = ''; base.password = '';
  const requestedKind=new URLSearchParams(location.search).get('kind');
  let kind=['subscription','donation'].includes(requestedKind)?requestedKind:'follow',uploadBusy=false;
  const activeProfile=()=>kind==='donation'?state.donation:kind==='subscription'?state.subscription:state;
  let state = null, dirty = false, ready = false, initialExample = false, busy = false, link = '';
  const text = (id, message, error = false) => { $(id).textContent = message; $(id).classList.toggle('error', error); };
  async function api(route, body) {
    const response = await fetch(new URL('api/follow/' + route, base), { cache: 'no-store', signal: AbortSignal.timeout(route==='audio'?30000:15000), ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Ankuzo-Control': '1' }, body: JSON.stringify(body) }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос.'); return data;
  }
  function values() { return {kind, enabled: $('enabled').checked, message: $('message').value.trim(), duration: Number($('duration').value), motion: $('motion').checked, volume: Number($('volume').value) / 100 }; }
  function render(next, fill = false) {
    state = next;const selected=activeProfile();
    if (fill) { for (const id of ['enabled', 'motion']) $(id).checked = selected.settings[id]; for (const id of ['message', 'duration']) $(id).value = selected.settings[id]; $('volume').value = Math.round(selected.settings.volume * 100); $('volume-value').textContent = $('volume').value + '%'; }
    renderDonation(next.donationalerts);
    $('audio-name').textContent = selected.audio.available ? selected.audio.name : 'Свой MP3, WAV или OGG · до 5 МБ'; $('remove-audio').hidden = !selected.audio.available;
    $('client-id').value = next.clientId; $('callback-url').value = next.callbackUrl;
    const labels = { connected: 'Twitch подключён · ' + next.account, connecting: 'Подключаемся к событиям Twitch…', reconnecting: 'Восстанавливаем связь с Twitch…', reauthorize: 'Нужно заново разрешить доступ Twitch' };
    $('twitch-status').textContent = labels[next.connection] || (next.account ? 'Аккаунт ' + next.account + ' подключён' : 'Twitch ещё не подключён');
    $('twitch-help').textContent = next.error || (next.configured ? 'Подключи аккаунт ankuzo с разрешением на просмотр фоллоу.' : 'Сначала сохрани своё приложение Twitch в настройке ниже. Это нужно один раз.');
    if (next.connection === 'connected') $('twitch-help').textContent = 'Фоллоу и подписки появятся в OBS автоматически. Пропущенные при отключении события Twitch не повторяет.';
    $('connection-dot').className = 'connection-dot ' + next.connection;
    if(next.account&&!next.subscriptionAuthorized)$('twitch-help').textContent='Для платных подписок нужно дополнительное разрешение. Нажми «Переподключить Twitch».';
    else if(next.subscriptionConnection==='unavailable')$('twitch-help').textContent='Фоллоу подключены, платные события пока недоступны. Проверь доступ к подпискам канала в Twitch.';
    $('connect').hidden = !next.configured || (next.connection === 'connected'&&next.subscriptionAuthorized&&next.subscriptionConnection!=='unavailable'); $('connect').textContent = next.account ? 'Переподключить Twitch ↗' : 'Подключить Twitch ↗'; $('disconnect').hidden = !next.account;
    if (!next.configured && !$('app-details').open) $('app-details').open = true;
    $('broadcast-test').disabled = !selected.settings.enabled;
    for (const id of ['enabled','message','duration','motion','volume','audio-file','save-settings','preview-play']) $(id).disabled = false;
    if (!initialExample && ready) { initialExample = true; preview(false); }
  }
  async function load() { try { render(await api('status'), !state); if (!dirty) text('settings-feedback', 'Настройки сохранены на сервере.'); } catch { text('settings-feedback', 'Не удалось загрузить настройки. Обнови страницу.', true); } }
  function preview(withSound = true) {
    if (!ready || !state) return;
    const settings = values(),metadata=example(); if (!withSound) settings.volume = 0;
    $('preview').contentWindow.postMessage({ type: 'follow-preview', name: $('test-name').value.trim() || 'Новый_зритель',kind,...metadata, settings, audio: activeProfile().audio }, location.origin);
    text('preview-note', withSound && activeProfile().audio.available ? 'Пример со звуком. Зрители не увидят.' : 'Только здесь — зрители не увидят.');
  }
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== $('preview').contentWindow) return;
    if (event.data?.type === 'follow-preview-ready') { ready = true; if (state && !initialExample) { initialExample = true; preview(false); } }
    if (event.data?.type === 'follow-audio' && !event.data.ok) text('preview-note', 'Браузер не воспроизвёл звук. Проверь файл и нажми пример ещё раз.', true);
  });
  function example(){if(kind==='donation')return {amount:$('example-amount').value,currency:$('example-currency').value,donationText:$('example-message').value};const eventType=$('example-type').value,tier=$('example-tier').value,count=Math.min(1200,Math.max(1,Number($('example-count').value)||1));return {eventType,tier,months:eventType==='resub'?count:1,total:eventType==='gift'?count:1,detail:eventType==='gift'?`Подарено: ${count} · Tier ${Number(tier)/1000}`:eventType==='resub'?`Месяцев вместе: ${count} · Tier ${Number(tier)/1000}`:`Новая подписка · Tier ${Number(tier)/1000}`};}
  function mode(){
    $('donation-example').hidden=kind!=='donation';$('da-panel').hidden=kind!=='donation';$('twitch-panel').hidden=kind==='donation';
    $('alert-kind').value=kind;document.body.classList.toggle('subscription-mode',kind==='subscription');$('example-fields').hidden=kind!=='subscription';$('profile-title').textContent=kind==='donation'?'Донат':kind==='subscription'?'Платная подписка':'Фоллоу';$('kind-note').textContent=kind==='donation'?'Рубиновый туз, раскрытие колоды и появление суммы. Свой звук. OBS-ссылка общая.':kind==='subscription'?'Три карты, золотая нить, уровень и месяцы. Свои настройки и звук. OBS-ссылка общая.':'Одна карта и красная нить. Свои настройки и звук. OBS-ссылка общая.';
  }
  $('alert-kind').addEventListener('change',async event=>{
    const next=event.target.value;if(busy||uploadBusy){event.target.value=kind;return;}
    if(dirty&&!await save()){event.target.value=kind;return;}
    kind=next;mode();render(state,true);const url=new URL(location.href);url.searchParams.set('kind',kind);history.replaceState(null,'',url);text('settings-feedback','Настройки сохранены на сервере.');preview(false);
  });
  $('example-type').addEventListener('change',()=>{const value=$('example-type').value;$('example-count-field').hidden=value==='new';$('example-count-label').textContent=value==='gift'?'Подписок в подарок':'Месяцев вместе';$('example-count').value=value==='gift'?'5':'12';});
  mode();
  $('preview-play').addEventListener('click', () => preview());
  $('settings-form').addEventListener('input', event => {if(!['enabled','message','duration','motion','volume'].includes(event.target.id))return; dirty = true; $('volume-value').textContent = $('volume').value + '%'; text('settings-feedback', 'Есть изменения — примени их к OBS.'); });
  async function save() {
    if (!$('settings-form').reportValidity() || busy) return false;
    busy = true;$('alert-kind').disabled=true; $('save-settings').disabled = true;
    try { render(await api('settings', values()), true); dirty = false; text('settings-feedback', 'Применено. Ссылка OBS остаётся прежней.'); return true; }
    catch (error) { text('settings-feedback', error.message, true); return false; }
    finally { busy = false;$('alert-kind').disabled=false; $('save-settings').disabled = false; }
  }
  $('settings-form').addEventListener('submit', event => { event.preventDefault(); void save(); });
  $('scene-selector').addEventListener('change', async event => { const next = event.target.value; if (dirty && !await save()) { event.target.value = 'follow'; return; } location.href = new URL('./?scene=' + encodeURIComponent(next), base); });
  $('app-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = $('save-app'); button.disabled = true;
    try { render(await api('twitch/app', { clientId: $('client-id').value.trim(), clientSecret: $('client-secret').value.trim() })); $('client-secret').value = ''; text('app-feedback', 'Сохранено. Нажми «Подключить Twitch» выше.'); $('app-details').open = false; $('connect').focus(); }
    catch (error) { text('app-feedback', error.message, true); }
    finally { button.disabled = false; }
  });
  $('disconnect').addEventListener('click', async () => { $('disconnect').disabled = true; try { render(await api('twitch/disconnect', {})); } catch (error) { text('twitch-status', error.message, true); } finally { $('disconnect').disabled = false; } });
  $('audio-file').addEventListener('change', async () => {
    const file = $('audio-file').files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { text('audio-feedback', 'Файл слишком большой. Максимум 5 МБ.', true); $('audio-file').value = ''; return; }
    uploadBusy=true;$('alert-kind').disabled=true;
    $('audio-file').disabled = true; text('audio-feedback', 'Загружаем звук…');
    try {
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Не удалось прочитать файл.')); reader.readAsDataURL(file); });
      render(await api('audio', {kind, name: file.name, data })); text('audio-feedback', 'Звук сохранён. Нажми «Показать пример».');
    } catch (error) { text('audio-feedback', error.message, true); }
    finally { uploadBusy=false;$('alert-kind').disabled=false;$('audio-file').disabled = false; $('audio-file').value = ''; }
  });
  $('remove-audio').addEventListener('click', async () => { $('remove-audio').disabled = true; try { render(await api('audio', {kind, remove: true })); text('audio-feedback', 'Звук убран.'); } catch (error) { text('audio-feedback', error.message, true); } finally { $('remove-audio').disabled = false; } });
  $('broadcast-test').addEventListener('click', async () => {
    if (dirty && !await save()) return;
    $('broadcast-test').disabled = true;
    try { await api('test', {kind,...example(), name: $('test-name').value.trim() || 'Новый_зритель' }); text('test-feedback', 'Тест в очереди OBS. Он появится после текущего оповещения.'); }
    catch (error) { text('test-feedback', error.message, true); }
    finally { $('broadcast-test').disabled = !activeProfile()?.settings.enabled; }
  });
  async function loadLink() {
    try { const response = await fetch(new URL('api/obs-link?scene=follow', base), { cache: 'no-store' }); if (!response.ok) throw new Error(); const data = await response.json(); link = data.url; $('scene-url').value = link; $('copy-url').disabled = $('show-url').disabled = false; $('retry-link').hidden = true; text('link-feedback', 'Прозрачный источник. Вход в OBS не нужен.'); }
    catch { $('retry-link').hidden = false; text('link-feedback', 'Не удалось загрузить ссылку.', true); }
  }
  $('retry-link').addEventListener('click', loadLink);
  $('show-url').addEventListener('click', () => { $('url-details').hidden = !$('url-details').hidden; $('show-url').setAttribute('aria-expanded', String(!$('url-details').hidden)); });
  $('copy-url').addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); text('link-feedback', 'Скопировано. Размер: 560 × 440, 60 FPS.'); } catch { $('url-details').hidden = false; $('show-url').setAttribute('aria-expanded', 'true'); $('scene-url').select(); text('link-feedback', 'Скопируй выделенную ссылку вручную.'); } });
  $('copy-callback').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('callback-url').value); $('copy-callback').textContent = 'Адрес скопирован'; } catch { $('callback-url').select(); $('copy-callback').textContent = 'Скопируй выделенный адрес'; } });
  function renderDonation(next){
    if(!next)return;
    $('da-client').value=next.clientId;$('da-callback').value=next.callbackUrl;
    const labels={connected:'DonationAlerts подключён · '+next.account,connecting:'Подключаемся к донатам…',reconnecting:'Восстанавливаем связь…',reauthorize:'Нужно заново разрешить доступ'};
    $('da-status').textContent=labels[next.connection]||(next.account?'Аккаунт '+next.account+' подключён':'DonationAlerts ещё не подключён');
    $('da-help').textContent=next.error||(next.connection==='connected'?'Новые донаты появятся в OBS автоматически.':next.configured?'Нажми «Подключить DonationAlerts» и разреши просмотр новых донатов.':'Сначала сохрани приложение в настройке ниже. Это нужно один раз.');
    $('da-dot').className='connection-dot '+next.connection;$('da-connect').hidden=!next.configured||next.connection==='connected';$('da-disconnect').hidden=!next.account;
    if(!next.configured)$('da-details').open=true;
  }
  $('da-form').addEventListener('submit',async event=>{
    event.preventDefault();$('da-save').disabled=true;
    try{renderDonation(await api('donationalerts/app',{clientId:$('da-client').value.trim(),clientSecret:$('da-secret').value.trim()}));$('da-secret').value='';$('da-details').open=false;text('da-feedback','Сохранено. Подключи аккаунт выше.');$('da-connect').focus();}
    catch(error){text('da-feedback',error.message,true);}finally{$('da-save').disabled=false;}
  });
  $('da-disconnect').addEventListener('click',async()=>{ $('da-disconnect').disabled=true;try{renderDonation(await api('donationalerts/disconnect',{}));}catch(error){text('da-status',error.message,true);}finally{$('da-disconnect').disabled=false;} });
  $('da-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('da-callback').value);$('da-copy').textContent='Адрес скопирован';}catch{$('da-callback').select();$('da-copy').textContent='Скопируй выделенный адрес';}});
  void load(); void loadLink();
  setInterval(() => { if (!document.hidden && !busy && !uploadBusy && !dirty && !(kind==='donation'?$('da-details'):$('app-details')).open) void load(); }, 10000);
})();
