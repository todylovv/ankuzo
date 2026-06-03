export function Chrome() {
  return (
    <>
      <a className="skip-link" href="#main">Перейти к содержимому</a>
      <div id="asciiIntro" aria-label="Загрузка ANKUZO">
        <div className="intro-grid" />
        <div className="intro-meta intro-meta-top"><span>ANKUZO® DIGITAL SYSTEM</span><span>MOSCOW / UTC+03</span></div>
        <pre id="introAscii" aria-hidden="true" />
        <div className="intro-stage">
          <div className="intro-status"><span id="introStatus">INITIALIZING EXPERIENCE</span><b id="introPercent">000%</b></div>
          <div className="intro-progress"><i id="introProgress" /></div>
          <div className="intro-word"><span>AN</span><span>KU</span><span>ZO</span></div>
        </div>
        <div className="intro-meta intro-meta-bottom"><span>CLICK ANYWHERE TO ENTER</span><span>PERSONAL SYSTEM / 2026</span></div>
      </div>
      <div className="intro-wipe" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div>
      <div id="cur" /><div id="cur2" />
      <div className="studio-frame" aria-hidden="true"><span className="studio-frame-a">SYS://ANKUZO</span><span className="studio-frame-b">ONLINE / ROOT</span><span className="studio-frame-c">001—007</span></div>
      <div id="discordLoader" aria-live="polite"><div className="ds-spinner"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" /></svg></div><div className="ds-label">загрузка</div></div>
    </>
  );
}
