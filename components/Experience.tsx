"use client";

import { useEffect, useRef, useState } from "react";
import { SectionLabel } from "./SectionLabel";

const games = [
  ["CURRENT / PC", "Arena Breakout Infinite", "TACTICAL / 01"],
  ["CURRENT / PS5", "Kingdom Come II", "SLOW WORLD / 02"],
  ["CURRENT / PS5", "Black Flag", "OPEN SEA / 03"],
  ["RETURN / PC", "Valorant", "RHYTHM / 04"],
  ["RETURN / PC + PS5", "Apex Legends", "MOVEMENT / 05"],
  ["ARCHIVE / PC", "Counter-Strike 2", "MOST PLAYED / 06"],
];

const signals = [
  ["25", "лет в физическом мире"],
  ["02", "способа войти в игру"],
  ["∞", "причин остаться онлайн"],
  ["22", "знак, который остаётся"],
];

export function Experience() {
  const [loaded, setLoaded] = useState(false);
  const libraryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(pointer: fine)").matches;
    let raf = 0;
    let targetX = innerWidth / 2;
    let targetY = innerHeight / 2;
    let x = targetX;
    let y = targetY;

    const move = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      root.style.setProperty("--mx", `${(event.clientX / innerWidth - .5).toFixed(3)}`);
      root.style.setProperty("--my", `${(event.clientY / innerHeight - .5).toFixed(3)}`);
    };
    const render = () => {
      x += (targetX - x) * .13;
      y += (targetY - y) * .13;
      root.style.setProperty("--cx", `${x}px`);
      root.style.setProperty("--cy", `${y}px`);
      raf = requestAnimationFrame(render);
    };
    const scroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty("--progress", `${max > 0 ? scrollY / max : 0}`);
    };
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("seen");
    }), { threshold: .14 });
    document.querySelectorAll("[data-reveal]").forEach(el => reveal.observe(el));

    addEventListener("pointermove", move, { passive: true });
    addEventListener("scroll", scroll, { passive: true });
    if (fine && !reduced) render();
    scroll();
    const ready = requestAnimationFrame(() => setLoaded(true));
    return () => {
      cancelAnimationFrame(ready);
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      removeEventListener("scroll", scroll);
      reveal.disconnect();
    };
  }, []);

  const shiftLibrary = (direction: number) => libraryRef.current?.scrollBy({ left: direction * innerWidth * .72, behavior: "smooth" });

  return (
    <main>
      <div className={`loader ${loaded ? "loader-out" : ""}`} role="status" aria-label="Загрузка">
        <span>2</span><span>2</span><i />
      </div>
      <div className="cursor" aria-hidden="true" />
      <div className="page-progress" aria-hidden="true"><i /></div>

      <section className="entry" id="entry" aria-labelledby="entry-title">
        <nav className="entry-nav" aria-label="Навигация">
          <a className="mark" href="#entry" aria-label="ANKUZO, в начало">A</a>
          <span>SESSION 22</span>
          <span className="live"><i /> SIGNAL FOUND</span>
        </nav>
        <div className="entry-meta" aria-hidden="true"><span>55.75° N</span><span>37.62° E</span><span>2026 / ONLINE</span></div>
        <div className="hero-object-wrap" aria-hidden="true"><img className="hero-object" src="/assets/hero-22.webp" alt="" fetchPriority="high" /></div>
        <div className="hero-reflection" aria-hidden="true" />
        <h1 id="entry-title" className="entry-title" aria-label="ANKUZO"><span>ANK</span><span>UZO</span></h1>
        <p className="entry-note">Игры остаются<br />после выключения экрана.</p>
        <a className="entry-continue" href="#signal"><span>держи и листай</span><i /></a>
      </section>

      <section className="signal" id="signal" aria-labelledby="signal-title">
        <SectionLabel index="01">PERSONAL SIGNAL</SectionLabel>
        <h2 id="signal-title" data-reveal><span>Не биография.</span><em>Следы присутствия.</em></h2>
        <div className="signal-orbit" data-reveal>
          <p>PLAY / WATCH / BUILD / REPEAT</p>
          {signals.map(([value, label]) => <div className="signal-fragment" key={value}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
      </section>

      <section className="library" id="library" aria-labelledby="library-title">
        <div className="library-head">
          <SectionLabel index="02">LIBRARY / PERSONAL CUT</SectionLabel>
          <h2 id="library-title" data-reveal>Шесть состояний.<br /><em>Не рейтинг.</em></h2>
          <div className="library-controls"><button onClick={() => shiftLibrary(-1)} aria-label="Прокрутить библиотеку влево">←</button><button onClick={() => shiftLibrary(1)} aria-label="Прокрутить библиотеку вправо">→</button></div>
        </div>
        <div className="library-window" ref={libraryRef} tabIndex={0} aria-label="Горизонтальная игровая библиотека">
          <div className="library-reel">
            <img src="/assets/library-atlas.webp" alt="Шесть авторских футляров из личной игровой библиотеки" loading="lazy" />
            <div className="game-captions">
              {games.map(([state, title, note], index) => <article key={title}><span>{state}</span><h3>{title}</h3><small>{note}</small><b>0{index + 1}</b></article>)}
            </div>
          </div>
        </div>
        <p className="drag-copy">DRAG / SCROLL HORIZONTALLY</p>
      </section>

      <section className="worlds" id="worlds" aria-labelledby="worlds-title">
        <SectionLabel index="03">TWO INPUTS / ONE HABIT</SectionLabel>
        <h2 id="worlds-title" data-reveal><span>PC / STEAM</span><em>встречает</em><span>PLAYSTATION</span></h2>
        <div className="world-object" data-reveal><img src="/assets/gaming-totem.webp" alt="Абстрактный игровой объект из прозрачного металла и белого пластика" loading="lazy" /></div>
        <div className="world-notes"><span>Быстрый вход.<br />Соревновательный ритм.</span><span>Большие истории.<br />Медленное прохождение.</span></div>
      </section>

      <section className="online" id="online" aria-labelledby="online-title">
        <SectionLabel index="04">AFTER HOURS</SectionLabel>
        <h2 id="online-title" data-reveal>02:22<br /><em>ещё здесь.</em></h2>
        <div className="broadcast" data-reveal>
          <div className="broadcast-frame"><span>LIVE MEMORY / BUFFERING</span><div className="ghost-22">22</div></div>
          <div className="wave" aria-hidden="true">{Array.from({length:42},(_,i)=><i key={i} style={{"--h":`${18 + ((i*37)%78)}%`} as React.CSSProperties}/>)}</div>
          <div className="chat-fragments"><p><time>02:18</time> ты ещё в сети?</p><p><time>02:19</time> последняя и спать</p><p><time>02:22</time> <b>ankuz0</b> is still here</p></div>
        </div>
      </section>

      <section className="build" id="build" aria-labelledby="build-title">
        <SectionLabel index="05">BUILD TRACE</SectionLabel>
        <h2 id="build-title" data-reveal>Иногда экран<br /><em>смотрит обратно.</em></h2>
        <div className="code-sheets" data-reveal aria-label="Фрагменты процесса сборки">
          <div><span>src / experience / signal.ts</span><code>pointer → inertia → memory</code><b>19 AUG 2026</b></div>
          <div><span>commit 2f220a</span><code>material: glass → chrome → black</code><b>BUILD / PASS</b></div>
          <div><span>render / after-hours</span><code>if (online) leave_a_trace()</code><b>55.75 / 37.62</b></div>
        </div>
      </section>

      <section className="material" id="material" aria-labelledby="material-title">
        <SectionLabel index="06">MATERIAL STUDY / 22</SectionLabel>
        <h2 id="material-title" className="sr-only">Символ 22</h2>
        <div className="material-word" aria-hidden="true">TWENTY TWO</div>
        <img className="material-object" src="/assets/hero-22.webp" alt="Хромированный символ 22" loading="lazy" />
        <p>GLASS → CHROME → BLACK</p>
      </section>

      <footer className="exit" id="exit">
        <SectionLabel index="07">END OF SESSION</SectionLabel>
        <p data-reveal>Экран гаснет.<br /><em>Сигнал остаётся.</em></p>
        <div className="exit-links">
          <a href="https://steamcommunity.com/profiles/76561199770575251/" target="_blank" rel="noreferrer"><span>Steam / b1</span><b>↗</b></a>
          <a href="https://steamcommunity.com/profiles/76561198165374024/" target="_blank" rel="noreferrer"><span>Steam / b2</span><b>↗</b></a>
          <a href="https://github.com/todylovv" target="_blank" rel="noreferrer"><span>GitHub</span><b>↗</b></a>
          <a href="https://discord.com/" target="_blank" rel="noreferrer"><span>Discord / @ankuz0</span><b>↗</b></a>
        </div>
        <div className="exit-mark">ANKUZO</div>
        <small>© 2026 / MOSCOW / SESSION 22</small>
      </footer>
    </main>
  );
}
