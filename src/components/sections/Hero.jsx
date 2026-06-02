import { DiscordIcon } from '../ui/DiscordIcon.jsx';

export function Hero() {
  return (
    <header className="hero" id="top">
      <canvas id="bgCanvas" aria-hidden="true" />
      <div className="hero-scene-meta" aria-hidden="true"><span>ANKUZO® / PERSONAL SYSTEM</span><span>CYBERSECURITY · MACHINE LEARNING · DATA</span></div>
      <div className="hero-observatory" role="group" aria-label="Интерактивная fluid blob сцена. Перетаскивай мышью и меняй материал кнопками.">
        <canvas className="shader-canvas" id="heroShaderCanvas" />
        <div className="shader-chip"><i /> INTERACTIVE / DRAG</div>
        <div className="shader-bottom"><span>FLUID BLOB / WEBGL / GLSL</span><b id="heroShaderFps">-- FPS</b></div>
        <div className="shader-swatches">
          <button className="shader-swatch shader-swatch-active" type="button" aria-label="Цветной материал" />
          <button className="shader-swatch" type="button" aria-label="Серый материал" />
          <button className="shader-swatch" type="button" aria-label="Чёрный материал" />
        </div>
      </div>
      <div className="hero-inner">
        <div className="hero-introline"><p className="hero-eyebrow">PERSONAL SYSTEM / 2026</p><span>BASED IN MOSCOW / UTC+03</span></div>
        <h1 className="hero-name" data-text="ANKUZO">
          <span className="solid" id="heroName">ANKUZO</span>
          <span className="outline" aria-hidden="true">ANKUZO</span>
          {['a', 'b', 'c'].map(value => <span className={`hero-fragment hero-fragment-${value}`} aria-hidden="true" key={value}>ANKUZO</span>)}
        </h1>
        <div className="hero-editorial">
          <p className="hero-tagline">Нахожу уязвимости в системах.<br />Строю модели, которые решают задачи.<br />Работаю с данными в любом масштабе.</p>
          <div className="hero-sidecopy"><span>DISCIPLINE / 01</span><strong>Системы.<br /><em>Данные. Защита.</em></strong></div>
        </div>
        <div className="hero-actions">
          <div className="hero-pills">{['Cybersecurity', 'Machine Learning', 'Big Data', 'CS2 · 2500 ELO', 'PC + PS5'].map(value => <div className="pill" key={value}><div className="pill-dot" />{value}</div>)}</div>
          <a href="https://discord.com/users/ankuz0" target="_blank" rel="noopener noreferrer" className="discord-hero"><div className="discord-hero-dot" /><DiscordIcon />ankuz0</a>
        </div>
      </div>
      <div className="hero-statusline" aria-hidden="true"><span>ANKUZO / INDEX</span><span className="hero-statusline-grow" /><span>SCROLL TO EXPLORE</span><span>001</span></div>
      <div className="scroll-hint" aria-hidden="true"><div className="scroll-line" />scroll</div>
    </header>
  );
}
