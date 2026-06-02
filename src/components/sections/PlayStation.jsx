import { SectionLabel } from '../ui/SectionLabel.jsx';

export function PlayStation() {
  return (
    <section id="playstation" className="gen-section">
      <SectionLabel>04 — PlayStation</SectionLabel>
      <div className="platform-intro reveal">
        <div><span>PROFILE ARCHIVE / PSN</span><h2>PLAY<br /><em>STATION.</em></h2></div>
        <p>Трофеи, библиотека и последние достижения. Живой снимок игрового профиля, обновляемый автоматически.</p>
      </div>
      <div className="platform-frame"><div className="platform-frame-meta"><span>SONY INTERACTIVE / PROFILE DATA</span><b>04</b></div><div id="psProfile" className="ps-profile reveal-scale" aria-live="polite" /></div>
    </section>
  );
}
