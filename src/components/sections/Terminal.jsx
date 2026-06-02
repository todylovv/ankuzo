import { SectionLabel } from '../ui/SectionLabel.jsx';

export function Terminal() {
  return (
    <section id="terminal" className="gen-section">
      <SectionLabel>01 — Терминал</SectionLabel>
      <div className="terminal-layout">
        <div className="terminal-intro reveal">
          <span>DIRECT ACCESS / ROOT</span>
          <h2>Войди<br /><em>в систему.</em></h2>
          <p>Интерактивная точка входа. Набери <b>help</b>, чтобы открыть список доступных команд.</p>
          <div className="terminal-index"><i /> 01 / COMMAND LINE</div>
        </div>
        <div className="terminal-console reveal">
          <div className="terminal-console-meta"><span>ANKUZO_OS / V1.0</span><b>LIVE SESSION</b></div>
          <div id="termWrap">
            <div className="term-bar"><div className="term-dots"><span /><span /><span /></div><div className="term-title">ankuzo@system ~</div></div>
            <div id="termBody" aria-live="polite"><div className="term-line"><span className="term-out">Добро пожаловать в систему ANKUZO v1.0</span></div><div className="term-line"><span className="term-out dim">Введи <button className="term-cmd-hint" type="button">help</button> для списка команд.</span></div><div className="term-spacer" /></div>
            <label className="term-input-row"><span className="term-prompt">ankuzo@system:~$</span><span className="sr-only">Команда терминала</span><input id="termInput" type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" placeholder="введи команду..." /></label>
          </div>
        </div>
      </div>
    </section>
  );
}
