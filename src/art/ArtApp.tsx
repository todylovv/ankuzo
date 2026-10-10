import { useEffect, useRef, useState } from 'react';
import { LiveDataProvider, useLiveData } from '../data/useLiveData';
import { filterArchive, formatMetric, safeExternalUrl, selectDeck } from '../data/artFacts';
import { mountArtMotion } from './motion.js';
import { mountSilk } from './silk.js';
import { mountAtmosphere } from './atmosphere.js';
import { mountQuality } from './quality.js';
import './art.css';
import { DiscordCard } from './DiscordCard';
import { PlayStationScene, PlayStationCatalog } from './PlayStation';

const isPsnRoute = () => /\/playstation\/?$/.test(location.pathname) || new URLSearchParams(location.search).has('playstation');

const ranks = ['A', 'K', 'Q', 'J', '10'];
const suits = ['♥', '♠', '♦', '♣', '♥'];
const steamUrl = 'https://steamcommunity.com/profiles/76561199770575251/';
const sourceLabels = { fresh: 'Снимок обновлён', stale: 'Сохранённый снимок', unavailable: 'Обновление недоступно', unknown: 'Нет даты обновления' };

function ArtArchive() {
  const live = useLiveData();
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState<'archive' | 'stats' | 'playstation' | null>(() => isPsnRoute() ? 'playstation' : location.hash === '#games/archive' ? 'archive' : null);
  const [psGame, setPsGame] = useState('');
  const psReturnUrl = useRef('');
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('all');
  const [copyStatus, setCopyStatus] = useState('');
  const deck = selectDeck(live.recentlyPlayed, live.mostPlayed);
  const selected = deck[1] ?? deck[0];
  const stats = live.playerStats;
  const faceit = stats.faceit;
  const available = (id: string) => !live.loading && Boolean(live.sources.find(source => source.id === id)?.hasData);
  const metric = (value: number, id: string) => formatMetric(value, available(id));
  const steam = live.profileCards.find(card => card.id === 'steam');
  const discord = live.discordProfile;
  const library = filterArchive(live.archiveGames, query, platform);
  const recent = live.recentlyPlayed.length > 0;

  const faceitCard = <article className="faceit faceit-on-card" aria-label="Профиль FACEIT">
          <p className="faceit-edition">FACEIT <span>·</span> PLAYER CARD</p>
          <a className="faceit-player" href={safeExternalUrl(faceit.profileUrl)} target="_blank" rel="noopener noreferrer">
            <span className="faceit-avatar"><span aria-hidden="true">{faceit.nickname.slice(0,1)}</span>{faceit.avatarUrl ? <img src={safeExternalUrl(faceit.avatarUrl)} alt={`Аватар ${faceit.nickname} в FACEIT`} width="64" height="64" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /> : null}</span>
            <span><strong>{faceit.nickname}</strong><small>FACEIT · {faceit.gameLabel} ↗</small></span>
          </a>
          <div className="faceit-rank">{available('faceit') && faceit.level === 10 ? <img src="/art/faceit-level-10.png" alt="FACEIT, уровень 10" width="38" height="38" /> : <span className="rank-number">{metric(faceit.level,'faceit')}</span>}<span><strong>{metric(faceit.elo,'faceit')} <small>ELO</small></strong><small>Уровень {metric(faceit.level,'faceit')}</small></span></div>
          <div className="faceit-seal" aria-hidden="true"><i /><span>♠</span><b>{available('faceit') ? faceit.level : '—'}</b><i /></div>
          <dl><div><dt>winrate</dt><dd>{metric(faceit.winRate,'faceit')}{available('faceit') ? '%' : ''}</dd></div><div><dt>K/D</dt><dd>{available('faceit') ? faceit.kd.toFixed(2) : '—'}</dd></div><div><dt>матчей</dt><dd>{metric(faceit.matches,'faceit')}</dd></div></dl>
          <p className="faceit-imprint" aria-hidden="true">COMPETITIVE RECORD <span>◆</span> 22</p>
        </article>;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const stopQuality = mountQuality(el);
    const silk = mountSilk(el);
    const stopAtmosphere = mountAtmosphere(el);
    const stop = mountArtMotion(el, silk.draw);
    document.dispatchEvent(new Event('ankuzo:app-ready'));
    return () => { stop(); silk.dispose(); stopAtmosphere(); stopQuality(); };
  }, []);

  useEffect(() => {
    if (!panel) return;
    const open = () => {
      if (!dialog.current?.open) { dialog.current?.showModal(); if (dialog.current) dialog.current.scrollTop = 0; }
    };
    // Modal dialogs live above fixed overlays; defer direct archive links until entry.
    if (document.body.classList.contains('intro-pending')) {
      document.addEventListener('ankuzo:intro-complete', open, { once: true });
      return () => document.removeEventListener('ankuzo:intro-complete', open);
    }
    open();
  }, [panel]);

  useEffect(() => {
    if (!live.loading) document.dispatchEvent(new Event('ankuzo:data-ready'));
  }, [live.loading]);

  useEffect(() => {
    const onPop = () => {
      if (isPsnRoute()) { setPsGame(''); setPanel('playstation'); }
      else if (panel === 'playstation') { psReturnUrl.current = location.pathname + location.search + location.hash; dialog.current?.close(); }
    };
    window.addEventListener('popstate', onPop);
    const originalTitle = document.title;
    if (panel === 'playstation') document.title = 'PlayStation — Ankuzo';
    return () => { window.removeEventListener('popstate', onPop); document.title = originalTitle; };
  }, [panel]);

  function openPsn(id = '') {
    setPsGame(id);
    if (!isPsnRoute()) {
      psReturnUrl.current = location.pathname + location.search + location.hash;
      const base = import.meta.env.BASE_URL;
      history.pushState(null, '', base === '/' ? '/playstation' : `${base}index.html?playstation=1`);
    }
    setPanel('playstation');
  }
  function closePanel() {
    if (panel === 'playstation') {
      const direct = !psReturnUrl.current;
      history.replaceState(null, '', psReturnUrl.current || `${import.meta.env.BASE_URL}#playstation`);
      if (direct) requestAnimationFrame(() => root.current?.querySelector(root.current.classList.contains('motion-off') ? '#view-playstation' : '#playstation')?.scrollIntoView({ behavior: 'instant' }));
      psReturnUrl.current = '';
    }
    setPanel(null);
  }

  function openArchive(search = '') { setQuery(search); setPlatform('all'); setPanel('archive'); }
  async function copyName(name: string, service: string) {
    try { await navigator.clipboard.writeText(name); setCopyStatus(`${service}: ${name} — скопировано`); }
    catch { setCopyStatus(`${service}: ${name} — выдели и скопируй имя.`); }
  }

  return <div className="art-root" ref={root}>
    <a className="skip" href="#view-games">К игровому архиву</a>
    <header className="header">
      <a className="brand" href="#home" aria-label="Ankuzo, начало">22<span /></a>
      <button className="menu-button" aria-controls="chapter-nav" aria-expanded="false">Меню <span>☰</span></button>
      <nav id="chapter-nav" aria-label="Главы"><a href="#home" aria-current="page">Начало</a><a href="#games">Игры</a><a href="#stats">Статы</a><a href="#playstation">PlayStation</a><a href="#about">Обо мне</a></nav>
      <details className="quality-control">
        <summary>Графика: <span className="quality-label">Авто</span><span className="quality-dot" aria-hidden="true"> ◉</span></summary>
        <div className="quality-popover">
          <fieldset><legend>Качество графики</legend>
            <label><input type="radio" name="graphics" value="off" aria-label="Без анимаций" /><span>Без анимаций<small>Обычная прокрутка, без движения</small></span></label>
            <label><input type="radio" name="graphics" value="motion" aria-label="Анимации" /><span>Анимации<small>Переходы, нить и движение карт</small></span></label>
            <label><input type="radio" name="graphics" value="full" aria-label="Полные эффекты" /><span>Полные эффекты<small>Все карты, глубина и аура — и на телефоне</small></span></label>
          </fieldset>
          <button type="button" data-quality-auto aria-pressed="true">Автовыбор <span aria-hidden="true">↗</span></button>
          <p role="status" />
        </div>
      </details>
    </header>
    <main className="stage" aria-label="Ankuzo">
      <canvas className="velvet-field" aria-hidden="true" /><div className="ambient" aria-hidden="true" /><div className="ghost" aria-hidden="true">22</div>
      <section className="scene entrance" id="view-home" aria-labelledby="home-title">
        <div className="hero-copy"><h1 id="home-title">Ankuzo<span>.</span></h1><p className="subtle">цифровой архив / игры / я</p><a className="outline" href="#games" data-jump="1">Смотреть архив <span>↗</span></a></div>
        <img className="character" src="/art/character.png" alt="Ankuzo в белой маске: левый рог целый, правый сломан" width="1024" height="1536" fetchPriority="high" />
      </section>
      <section className="scene archive" id="view-games" tabIndex={-1} aria-labelledby="games-title">
        <div className="archive-copy"><h2 id="games-title">Моя<br />колода<span>.</span></h2><p className="subtle">{live.loading ? 'Загружаю библиотеку…' : recent ? 'Играл недавно · за 2 недели' : 'Из моей библиотеки'}</p><button className="outline" onClick={() => openArchive()}>Весь архив <span>↗</span></button></div>
        <div className="deck" aria-label="Игры из библиотеки">
          {deck.map((game, i) => <button className="game-card" key={i} onClick={() => openArchive(game?.title)} aria-label={game ? `${game.title} — открыть в архиве` : 'Открыть архив'}>
            <span className="corner" aria-hidden="true">{ranks[i]}<br /><b>{suits[i]}</b></span>
            {game?.image && <img src={safeExternalUrl(game.image)} alt="" width="460" height="215" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}
            <span className="game-copy"><strong>{game?.title ?? (live.loading ? 'Загрузка…' : 'Из моей колоды')}</strong><small>{game ? `${Math.round(recent ? game.hours2w ?? 0 : game.hours)} ч` : '♠'}</small></span><span className="card-foot" aria-hidden="true">{suits[i]}</span>
          </button>)}
        </div>
      </section>
      <section className="scene statistics" id="view-stats" aria-labelledby="stats-title">
        <div className="stats-copy"><h2 id="stats-title">Всё осталось<br />в часах<span>.</span></h2><div className="hours">{metric(stats.totalHours, 'steam')}</div><p className="subtle hours-label">часов в Steam</p>
          <dl className="numbers"><div><dt>игр PC / PS5</dt><dd>{metric(stats.libraryGames, 'steam')}</dd></div><div><dt>трофеев PlayStation</dt><dd>{metric(stats.achievements, 'psn')}</dd></div><div><dt>ELO FACEIT</dt><dd>{metric(faceit.elo, 'faceit')}</dd></div></dl>
          <button className="data-details" onClick={() => setPanel('stats')}>Статистика и обновления <span>↗</span></button>
        </div>
        <div className="static-faceit">{faceitCard}</div>
      </section>
      <PlayStationScene open={openPsn} />
      <section className="scene identity" id="view-about" aria-labelledby="about-title">
        <div className="about-copy"><h2 id="about-title">Обо мне<span>.</span></h2><p className="bio">25. Кибербезопасность, анализ больших данных и ИИ. Всегда становлюсь лучше.</p>
          <DiscordCard profile={discord} copy={() => void copyName(discord.username,'Discord')} />
          <div className="platforms">
            <a href={safeExternalUrl(steam?.href ?? '', steamUrl)} target="_blank" rel="noopener noreferrer"><strong>Steam</strong><span>{steam?.subtitle} ↗</span></a>
            <a href={safeExternalUrl(faceit.profileUrl, 'https://www.faceit.com/ru/players/nuBac')} target="_blank" rel="noopener noreferrer"><strong>FACEIT</strong><span>{available('faceit') ? `${faceit.level} уровень` : faceit.nickname} ↗</span></a>

            <button onClick={() => openPsn()}><strong>PlayStation</strong><span>{stats.psnId} ↗</span></button>
            <a href="https://tmspk.gg/3Vi7A7Y9" target="_blank" rel="noopener noreferrer"><strong>TeamSpeak</strong><span>Ankuzo ↗</span></a>
          </div>
          <div className="more-links"><a href="https://github.com/todylovv" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://www.twitch.tv/ankuzo" target="_blank" rel="noopener noreferrer">Twitch ↗</a><a href="https://story.ankuzo.online/" target="_blank" rel="noopener noreferrer">Вне роли ↗</a></div>
          {live.nowPlaying.title !== 'Ничего не играет' && <p className="music-note">{live.nowPlaying.playing ? 'Слушаю' : 'Последний трек'}: {live.nowPlaying.artist} — {live.nowPlaying.title}</p>}
          <p className="copy-status" aria-live="polite">{copyStatus}</p>
        </div>
      </section>
      <div className="traveller" inert aria-hidden="true"><div className="flipper"><i className="traveller-edge edge-left" /><i className="traveller-edge edge-right" /><div className="traveller-front"><span>22<br />♠</span><b aria-hidden="true">♠</b><span>22<br />♠</span>{faceitCard}<div className="traveller-game" aria-hidden="true">{selected?.image && <img src={safeExternalUrl(selected.image)} alt="" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}<span className="corner">{ranks[1]}<br /><b>{suits[1]}</b></span><span className="game-copy"><strong>{selected?.title}</strong><small>{selected ? `${Math.round(recent ? selected.hours2w ?? 0 : selected.hours)} ч` : suits[1]}</small></span><span className="card-foot">{suits[1]}</span></div></div><div className="traveller-back"><img src="/art/card-back.png" alt="" width="1024" height="1536" /></div></div></div>
      <svg className="thread" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="glow"><feGaussianBlur stdDeviation="3" /></filter></defs><path className="thread-glow" /><path className="thread-main" /><path className="thread-light" /></svg><div className="thread-bead" aria-hidden="true" /><canvas className="silk" aria-hidden="true" />
    </main>
    <div className="scroll-track" aria-hidden="true"><div id="home" /><div id="games" /><div id="stats" /><div id="playstation" /><div id="about" /></div>
    <footer className="chapter-footer"><a className="next" href="#games">Листай дальше <span>↓</span></a><div className="chapter-count"><span>01</span><i />05</div></footer><div className="progress" aria-hidden="true"><i /></div>
    <dialog className={`archive-dialog${panel === 'playstation' ? ' ps-dialog' : ''}`} ref={dialog} onClose={closePanel} aria-labelledby="panel-title">
      <div className="panel-heading"><h2 id="panel-title">{panel === 'playstation' ? 'PlayStation' : panel === 'archive' ? 'Весь архив' : 'За цифрами'}<span>.</span></h2><button className="close-panel" aria-label="Закрыть" onClick={() => dialog.current?.close()}>×</button></div>
      {panel === 'playstation' ? <PlayStationCatalog initialGame={psGame} key={psGame} /> : panel === 'archive' ? <>
        <div className="archive-controls"><label>Найти игру<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Название" type="search" /></label><label>Платформа<select value={platform} onChange={event => setPlatform(event.target.value)}><option value="all">Все платформы</option><option value="PC">PC · Steam</option><option value="PS5">PlayStation 5</option></select></label></div>
        <p className="archive-summary" aria-live="polite">{live.loading ? 'Загружаю библиотеку…' : `Найдено: ${library.length} · PC ${live.archiveStats.pcCount} / PS5 ${live.archiveStats.ps5Count}`}</p>
        <div className="library-grid">{library.map(game => <article className="library-game" key={`${game.platform}-${game.id}`}>
          <div className="library-art">{game.image && <img src={safeExternalUrl(game.image)} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}</div><h3>{game.title}</h3><p>{game.platform} · {game.platform === 'PC' ? `${game.hours.toLocaleString('ru-RU')} ч` : 'В коллекции'}</p>
          {game.platform === 'PC' && /^\d+$/.test(game.id) && <a href={`https://store.steampowered.com/app/${game.id}/`} target="_blank" rel="noopener noreferrer">В Steam ↗</a>}
        </article>)}</div>
        {!live.loading && library.length === 0 && <p className="empty-state">{live.archiveGames.length ? 'По этому запросу игр нет. Попробуй другое название или платформу.' : 'Библиотека пока недоступна. Попробуй обновить страницу позже.'}</p>}
      </> : <>
        <dl className="detail-numbers"><div><dt>PC / Steam</dt><dd>{metric(live.archiveStats.pcCount, 'steam')} игр</dd></div><div><dt>PlayStation 5</dt><dd>{metric(stats.psGames, 'psn')} игр</dd></div><div><dt>Матчей FACEIT</dt><dd>{metric(faceit.matches, 'faceit')}</dd></div><div><dt>ADR / HS</dt><dd>{available('faceit') ? `${faceit.adr} / ${faceit.hs}%` : '—'}</dd></div></dl>
        <h3>Пики ELO по сезонам</h3>{faceit.seasonPeaks.length ? <ul className="season-list">{faceit.seasonPeaks.map(season => <li key={season.label}><span>{season.label}</span><strong>{season.elo}</strong></li>)}</ul> : <p className="archive-summary">История ELO пока недоступна.</p>}
        <h3>Обновления</h3><ul className="source-list">{live.sources.map(source => <li key={source.id}><strong>{source.label}</strong><span>{sourceLabels[source.state]}{source.updatedAt && Number.isFinite(Date.parse(source.updatedAt)) ? ` · ${new Date(source.updatedAt).toLocaleString('ru-RU')}` : ''}{source.hasData && source.state === 'unavailable' ? ' · показаны сохранённые данные' : ''}</span></li>)}</ul>
      </>}
    </dialog>
  </div>;
}

export default function ArtApp() { return <LiveDataProvider><ArtArchive /></LiveDataProvider>; }
