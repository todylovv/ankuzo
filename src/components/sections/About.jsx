import { SectionLabel } from '../ui/SectionLabel.jsx';

export function About() {
  return (
    <section id="about">
      <SectionLabel>02 — Обо мне</SectionLabel>
      <div className="about-manifesto reveal">
        <span>APPROACH / MANIFESTO</span>
        <h2>Системное<br /><em>мышление.</em></h2>
        <p>Не отдельные инструменты.<br />Один способ смотреть глубже.</p>
      </div>
      <div className="about-grid">
        <div className="about-text reveal-left"><span className="about-index">02.1 / METHOD</span>Думаю как атакующий — строю как защитник.<br /><br />Работаю в точках, где ошибки стоят дорого: нахожу векторы атак раньше, чем их найдут другие, создаю модели которые держатся за пределами тестовых наборов, извлекаю структуру из данных в любом масштабе.<br /><br /><em>Кибербезопасность, машинное обучение и большие данные</em> — не три отдельных направления. Это один способ смотреть на системы: искать слабые места, проверять гипотезы, строить то, что держится под нагрузкой.</div>
        <div className="about-right reveal-right"><DiscordCard /></div>
      </div>
    </section>
  );
}

function DiscordCard() {
  const facts = [['Специализация', 'Cybersecurity · Pentest'], ['Направления', 'ML · Big Data · Threat Intel'], ['Стек', 'Python · Linux · Cloud'], ['В Discord с', '21 ноября 2018']];
  return (
    <div className="dc-card" id="dcCard">
      <div className="dc-profile-effect" aria-hidden="true" />
      <div className="dc-banner" id="dcBanner"><canvas className="dc-banner-canvas" id="dcBannerCanvas" /><img className="dc-profile-banner" id="dcProfileBanner" src="" alt="" /><div className="dc-banner-text" id="dcBannerText">ANKUZO</div></div>
      <div className="dc-body">
        <div className="dc-top-row"><div className="dc-avatar-wrap"><img className="dc-avatar" id="dcAvatar" src="" alt="Аватар ankuz0 в Discord" /><img className="dc-avatar-decoration" id="dcAvatarDecoration" src="" alt="" aria-hidden="true" /><div className="dc-status-ring" id="dcStatusRing" /></div><div className="dc-status-text" id="dcStatusText" /></div>
        <div className="dc-username" id="dcUsername">anku</div><div className="dc-handle">@ankuz0</div><div className="dc-badges" id="dcBadges" aria-label="Значки Discord" />
        <div className="dc-divider" />
        <div className="dc-activity" id="dcCardActivity" style={{ display: 'none' }}><div className="dc-activity-label">СЕЙЧАС ИГРАЕТ</div><div className="dc-activity-name" id="dcActivityName" /></div>
        <div className="dc-spotify" id="dcCardSpotify" style={{ display: 'none' }}><div className="dc-activity-label">♫ СЛУШАЕТ В SPOTIFY</div><div className="dc-activity-name" id="dcSpotifyName" /><div className="dc-activity-detail" id="dcSpotifyArtist" /></div>
        <div className="dc-about"><div className="dc-about-label">ОБО МНЕ</div><div className="dc-about-text">root@anku:~$ cat anku.conf<br />role=BigData CyberSec<br />mode=ML<br />hobby=Beer<br />sleep=false<br />grind=while(true)</div></div>
        <div className="dc-divider" />
        <div className="dc-facts">{facts.map(([label, value]) => <div className="dc-fact-row" key={label}><span className="dc-fact-label">{label}</span><span className="dc-fact-val">{value}</span></div>)}</div>
      </div>
    </div>
  );
}
