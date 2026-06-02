import { SectionLabel } from '../ui/SectionLabel.jsx';

export function Steam() {
  return (
    <section id="steam" className="gen-section">
      <SectionLabel>06 — Игровой профиль</SectionLabel>
      <div className="steam-intro reveal">
        <span>LIVE LIBRARY / STEAM</span>
        <h2>Сыграно.<br /><em>Измерено.</em></h2>
        <p>Два аккаунта. Общая история. Игровая статистика собрана как персональный data-архив.</p>
      </div>
      <div className="steam-shell reveal" id="steamSection">
        <div className="steam-shell-head"><span>STEAM / AGGREGATED PROFILE</span><b>LIVE DATA</b></div>
        <div className="steam-accounts" id="steamAccounts" /><div className="game-profiles" id="gameProfiles" style={{ display: 'none' }} /><div className="steam-banners" id="steamBanners" />
        <div className="steam-stats-row steam-stats-spaced"><div className="steam-stat"><div className="steam-stat-num" id="stGames">—</div><div className="steam-stat-lbl">игр всего</div></div><div className="steam-stat"><div className="steam-stat-num" id="stHours">—</div><div className="steam-stat-lbl">часов всего</div></div><div className="steam-stat" id="stRecentWrap" style={{ display: 'none' }}><div className="steam-stat-num" id="stRecent">—</div><div className="steam-stat-lbl">часов за 2 недели</div></div></div>
        <div className="steam-top"><div className="steam-top-label">топ по часам · оба аккаунта</div><div id="steamTopGames" /></div><div id="steamUpdated" className="steam-updated" />
      </div>
    </section>
  );
}
