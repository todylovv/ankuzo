(() => {
  const root = document.getElementById('psProfile');
  if (!root) return;

  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function render(profile) {
    const trophies = profile.trophies || {};
    const recentGames = profile.recent_games || [];
    const games = profile.games || [];
    const trophy = (type, label) => `
      <div class="ps-trophy ${type}">
        <span class="ps-trophy-icon"><i></i></span>
        <strong class="ps-trophy-value">${escape(trophies[type] || 0)}</strong>
        <span class="ps-trophy-label">${label}</span>
      </div>`;
    const onlineId = profile.online_id ? `@${profile.online_id}` : 'НУЖЕН ПУБЛИЧНЫЙ PSN ID';
    const recent = profile.recent_trophies || [];
    const emptyMessage = profile.online_id
      ? 'СИНХРОНИЗАЦИЯ ТРОФЕЕВ<br>ЕЩЁ НЕ НАСТРОЕНА'
      : 'ПОДКЛЮЧИ ПУБЛИЧНЫЙ PSN ID<br>ДЛЯ ЗАГРУЗКИ ДОСТИЖЕНИЙ';
    const recentMarkup = recent.length ? `
      <div class="ps-recent">${recent.slice(0, 3).map(item => `
        <div class="ps-recent-item">
          <span class="ps-recent-icon ${escape(item.type)}"><i></i></span>
          <div class="ps-recent-copy">
            <div class="ps-recent-name">${escape(item.name)}</div>
            <div class="ps-recent-game">${escape(item.game)}</div>
          </div>
          <div class="ps-recent-type">${escape(item.type)}</div>
        </div>`).join('')}
      </div>` : `<div class="ps-empty">${emptyMessage}</div>`;

    root.innerHTML = `
      <div class="ps-depth" aria-hidden="true">
        <div class="ps-depth-tunnel">
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <div class="ps-depth-plane ps-depth-plane-a"></div>
        <div class="ps-depth-plane ps-depth-plane-b"></div>
        <b></b>
      </div>
      <div class="ps-head">
        <div class="ps-mark">PS</div>
        <div>
          <div class="ps-kicker">${escape(profile.platform || 'PLAYSTATION 5')} / ЗАЛ ТРОФЕЕВ</div>
          <div class="ps-name">${escape(profile.display_name || 'ANKUZO')}</div>
          <div class="ps-id">${escape(onlineId)}</div>
        </div>
        <div class="ps-level">
          <strong>${escape(profile.trophy_level || 0)}</strong>
          <span>УРОВЕНЬ</span>
          <i><b style="width:${Math.min(100, Number(profile.trophy_progress) || 0)}%"></b></i>
        </div>
        <div class="ps-sync">${escape(profile.sync_status || 'ЛОКАЛЬНЫЙ ПРОФИЛЬ')}</div>
      </div>
      <div class="ps-body">
        <div>
          <div class="ps-library">
            <span>КУПЛЕННАЯ БИБЛИОТЕКА PSN</span>
            <strong>${escape(profile.games_count || 0)} <i>ИГР</i></strong>
          </div>
          <div class="ps-trophies">
          ${trophy('platinum', 'ПЛАТИНА')}
          ${trophy('gold', 'ЗОЛОТО')}
          ${trophy('silver', 'СЕРЕБРО')}
          ${trophy('bronze', 'БРОНЗА')}
          </div>
        </div>
        <div class="ps-panels">
          <div class="ps-panel">
            <div class="ps-panel-title">ПОСЛЕДНИЕ ЗАПУСКИ <span>${String(recentGames.length).padStart(2, '0')}</span></div>
            ${recentGames.length ? `<div class="ps-games">${recentGames.slice(0, 3).map(game => `
              <div class="ps-game">
                ${game.icon ? `<img src="${escape(game.icon)}" alt="" loading="lazy">` : '<span class="ps-game-fallback">PS</span>'}
                <div>
                  <strong>${escape(game.name)}</strong>
                  <small>${escape(game.platform || 'PLAYSTATION')}</small>
                </div>
              </div>`).join('')}</div>` : '<div class="ps-empty">ОЖИДАЕТСЯ СИНХРОНИЗАЦИЯ PSN</div>'}
          </div>
          <div class="ps-panel">
          <div class="ps-panel-title">ПОСЛЕДНИЕ ТРОФЕИ <span>${String(recent.length).padStart(2, '0')}</span></div>
          ${recentMarkup}
          </div>
        </div>
      </div>
      <div class="ps-all">
        <button class="ps-all-toggle" type="button" aria-expanded="false">
          <span>ВСЯ БИБЛИОТЕКА</span>
          <b>${escape(profile.games_count || games.length || 0)} ИГР</b>
          <i>РАЗВЕРНУТЬ +</i>
        </button>
        <div class="ps-all-body" hidden>
          ${games.length ? `<div class="ps-all-grid">${games.map(game => `
            <div class="ps-all-game">
              ${game.icon ? `<img data-src="${escape(game.icon)}" alt="" loading="lazy">` : '<span class="ps-game-fallback">PS</span>'}
              <div>
                <strong>${escape(game.name)}</strong>
                <small>${escape(game.platform || 'PLAYSTATION')}</small>
              </div>
            </div>`).join('')}</div>` : '<div class="ps-empty">БИБЛИОТЕКА ПОЯВИТСЯ ПОСЛЕ ПЕРВОЙ СИНХРОНИЗАЦИИ PSN</div>'}
        </div>
      </div>`;

    const toggle = root.querySelector('.ps-all-toggle');
    const body = root.querySelector('.ps-all-body');
    root.addEventListener('pointermove', event => {
      if (document.body.classList.contains('perf-low')) return;
      const rect = root.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      root.style.setProperty('--ps-x', `${(x * 100).toFixed(1)}%`);
      root.style.setProperty('--ps-y', `${(y * 100).toFixed(1)}%`);
      root.style.setProperty('--ps-shift-x', `${((x - .5) * -30).toFixed(1)}px`);
    });
    root.addEventListener('pointerleave', () => {
      root.style.removeProperty('--ps-x');
      root.style.removeProperty('--ps-y');
      root.style.removeProperty('--ps-shift-x');
    });
    toggle?.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('i').textContent = open ? 'СВЕРНУТЬ −' : 'РАЗВЕРНУТЬ +';
      body.hidden = !open;
      if (open) {
        body.querySelectorAll('img[data-src]').forEach(image => {
          image.src = image.dataset.src;
          image.removeAttribute('data-src');
        });
      }
    });
  }

  fetch('ps5-profile.json?_=' + Date.now())
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(render)
    .catch(() => render({ display_name: 'ANKUZO', sync_status: 'PROFILE DATA UNAVAILABLE' }));
})();
