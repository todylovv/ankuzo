import { games, marquee } from '../../data/content.js';
import { SectionLabel } from '../ui/SectionLabel.jsx';

export function Games() {
  return (
    <>
      <section id="games">
        <SectionLabel>05 — Игровой путь</SectionLabel>
        <div className="games-intro"><p>PERSONAL ARCHIVE / 2007—NOW</p><h2>Игры как<br /><em>система координат.</em></h2><span>Четыре периода. Разные механики. Один и тот же интерес к системам, точности и командной игре.</span></div>
        <div className="games-showcase">
          <div className="game-stage" aria-hidden="true"><div className="game-stage-grid" /><div className="game-stage-orbit" /><div className="game-stage-mark">01</div><div className="game-stage-copy"><span>SELECTED ERA</span><strong>LINEAGE II</strong><small>MMORPG / 2007—2010</small></div><div className="game-stage-meter"><i /></div></div>
          <div className="games-timeline">{games.map(([index, era, title, badge, description, meta], gameIndex) => <article className={`game-row${gameIndex === 0 ? ' game-row-active' : ''}`} tabIndex="0" data-game-index={index} data-game-title={title.toUpperCase()} data-game-meta={meta} style={{ transitionDelay: `${gameIndex * .07}s` }} key={index}><div className="game-era">{era}</div><div className="game-info"><h3 className="game-title-text">{title}</h3><p className="game-desc">{description}</p></div><div className={`game-badge${gameIndex === 2 ? ' highlight' : ''}`}>{badge}</div></article>)}</div>
        </div>
      </section>
      <div className="marquee-wrap" aria-hidden="true"><div className="marquee-inner">{[...marquee, ...marquee].flatMap((item, index) => [<span key={`${item}-${index}`}>{item}</span>, <span className="mdot" key={`dot-${index}`}>·</span>])}</div></div>
    </>
  );
}
