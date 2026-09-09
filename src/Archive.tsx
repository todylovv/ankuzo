import type { Ref } from "react";
import { css } from "./css";

type ArchiveProps = {
  rootRef: Ref<HTMLDivElement>;
  tsLabel: string;
  copyTs: () => void;
};

export function Archive({ rootRef, tsLabel, copyTs }: ArchiveProps) {
  return (
    <div ref={rootRef} style={css(`position:relative;background:#090909;overflow-x:clip;font-family:'Archivo',system-ui,sans-serif`)}>

  <div aria-hidden="true" style={css(`position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;filter:blur(calc(var(--v,0)*16px)) contrast(calc(1 + var(--v,0)*.3));animation:bgdrift 38s ease-in-out infinite alternate`)}>
    <div data-plate="hero" style={css(`position:absolute;inset:-18%;opacity:1;transition:opacity 1100ms cubic-bezier(.4,0,.2,1);filter:blur(72px) grayscale(1);transform:scale(1.16) translate3d(calc(var(--mx,0)*-16px),calc(var(--my,0)*-12px),0);background:radial-gradient(56% 52% at 36% 42%,#333 0%,rgba(51,51,51,0) 72%),radial-gradient(44% 52% at 76% 68%,rgba(120,120,120,.28) 0%,rgba(120,120,120,0) 70%),#0b0b0b`)}></div>
    <div data-plate="now" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 1100ms cubic-bezier(.4,0,.2,1);filter:blur(84px) grayscale(1);transform:scale(1.2) translate3d(calc(var(--mx,0)*-24px),calc(var(--my,0)*-16px),0);background:radial-gradient(54% 56% at 64% 38%,#6e6e6e 0%,rgba(110,110,110,0) 70%),radial-gradient(38% 38% at 22% 76%,rgba(30,30,30,.9) 0%,rgba(30,30,30,0) 72%),#0d0d0d`)}></div>
    <div data-plate="recent0" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 800ms cubic-bezier(.4,0,.2,1);filter:blur(86px) grayscale(1);transform:scale(1.2) translate3d(calc(var(--mx,0)*-20px),calc(var(--my,0)*-14px),0);background:radial-gradient(50% 50% at 32% 44%,#5a5a5a 0%,rgba(90,90,90,0) 72%),#0c0c0c`)}></div>
    <div data-plate="recent1" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 800ms cubic-bezier(.4,0,.2,1);filter:blur(90px) grayscale(1);transform:scale(1.22) translate3d(calc(var(--mx,0)*-20px),calc(var(--my,0)*-14px),0);background:radial-gradient(60% 46% at 62% 66%,#2b2b2b 0%,rgba(43,43,43,0) 74%),#070707`)}></div>
    <div data-plate="recent2" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 800ms cubic-bezier(.4,0,.2,1);filter:blur(78px) grayscale(1);transform:scale(1.18) translate3d(calc(var(--mx,0)*-20px),calc(var(--my,0)*-14px),0);background:radial-gradient(46% 46% at 48% 40%,#8e8e8e 0%,rgba(142,142,142,0) 70%),#101010`)}></div>
    <div data-plate="recent3" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 800ms cubic-bezier(.4,0,.2,1);filter:blur(92px) grayscale(1);transform:scale(1.24) translate3d(calc(var(--mx,0)*-20px),calc(var(--my,0)*-14px),0);background:radial-gradient(70% 40% at 50% 18%,#3d3d3d 0%,rgba(61,61,61,0) 76%),#060606`)}></div>
    <div data-plate="recent4" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 800ms cubic-bezier(.4,0,.2,1);filter:blur(84px) grayscale(1);transform:scale(1.2) translate3d(calc(var(--mx,0)*-20px),calc(var(--my,0)*-14px),0);background:radial-gradient(48% 54% at 26% 56%,#6a6a6a 0%,rgba(106,106,106,0) 72%),radial-gradient(34% 34% at 78% 30%,rgba(160,160,160,.22) 0%,rgba(160,160,160,0) 72%),#0b0b0b`)}></div>
    <div data-plate="steam" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 1200ms cubic-bezier(.4,0,.2,1);filter:blur(96px) grayscale(1);transform:scale(1.12) translate3d(calc(var(--mx,0)*-12px),calc(var(--my,0)*-10px),0);background:linear-gradient(96deg,rgba(120,120,120,.32) 0%,rgba(0,0,0,0) 52%),#0a0a0a`)}></div>
    <div data-plate="psn" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 1200ms cubic-bezier(.4,0,.2,1);filter:blur(96px) grayscale(1);transform:scale(1.14) translate3d(calc(var(--mx,0)*-14px),calc(var(--my,0)*-10px),0);background:radial-gradient(58% 54% at 70% 46%,#4c4c4c 0%,rgba(76,76,76,0) 74%),#080808`)}></div>
    <div data-plate="discord" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 1200ms cubic-bezier(.4,0,.2,1);filter:blur(90px) grayscale(1);transform:scale(1.08) translate3d(calc(var(--mx,0)*-10px),calc(var(--my,0)*-8px),0);background:radial-gradient(52% 50% at 44% 52%,#9a9a98 0%,rgba(154,154,152,0) 74%),#101010`)}></div>
    <div data-plate="ts" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 1400ms cubic-bezier(.4,0,.2,1);filter:blur(88px) grayscale(1);transform:scale(1.08) translate3d(calc(var(--mx,0)*-8px),calc(var(--my,0)*-6px),0);background:radial-gradient(18% 64% at 50% 50%,rgba(255,255,255,.34) 0%,rgba(255,255,255,0) 72%),#050505`)}></div>
    <div data-plate="final" style={css(`position:absolute;inset:-18%;opacity:0;transition:opacity 1400ms cubic-bezier(.4,0,.2,1);filter:blur(90px) grayscale(1);transform:scale(1.06);background:radial-gradient(72% 56% at 50% 94%,#242424 0%,rgba(36,36,36,0) 76%),#080808`)}></div>
    <div style={css(`position:absolute;inset:-30%;mix-blend-mode:soft-light;background:linear-gradient(104deg,rgba(255,255,255,0) 32%,rgba(255,255,255,.55) 50%,rgba(255,255,255,0) 68%);animation:haze 27s ease-in-out infinite alternate`)}></div>
    <div style={css(`position:absolute;inset:-20%;mix-blend-mode:soft-light;background:radial-gradient(38% 44% at 68% 34%,rgba(255,255,255,.4) 0%,rgba(255,255,255,0) 72%);animation:breathe 19s ease-in-out infinite alternate`)}></div>
    <div style={css(`position:absolute;inset:0;background:radial-gradient(122% 92% at 50% 50%,rgba(9,9,9,0) 32%,rgba(9,9,9,.78) 100%)`)}></div>
    <div data-grain="" style={css(`position:absolute;inset:-50%;opacity:.12;mix-blend-mode:overlay`)}></div>
  </div>

  <section data-scene="hero" data-chapter="hero" data-static="0" style={css(`--p:0;--b:0;position:relative;z-index:1;height:260vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div style={css(`position:absolute;left:50%;top:50%;width:min(30vw,420px);height:70vh;transform:translate3d(-50%,-50%,0) scale(calc(.9 + var(--p)*2.4)) translate3d(calc(var(--mx,0)*10px),calc(var(--my,0)*8px),0);opacity:calc(.2 + var(--p)*.8);background:repeating-linear-gradient(102deg,rgba(255,255,255,.06) 0 2px,rgba(255,255,255,0) 2px 11px),linear-gradient(168deg,#8d8d8d 0%,#3a3a3a 46%,#0d0d0d 100%);box-shadow:inset 0 0 140px rgba(0,0,0,.7)`)}></div>
      <div style={css(`position:absolute;left:50%;top:50%;transform:translate3d(calc(-50% - var(--p)*40vw),-50%,0) scale(calc(1 + var(--p)*.7));opacity:calc(1 - var(--p)*.9);font-family:'Bodoni Moda',serif;font-size:clamp(88px,21vw,320px);line-height:.78;letter-spacing:-.035em;color:#f6f5f3;white-space:nowrap;clip-path:inset(0 50% 0 0)`)}>ankuzo</div>
      <div style={css(`position:absolute;left:50%;top:50%;transform:translate3d(calc(-50% + var(--p)*40vw),-50%,0) scale(calc(1 + var(--p)*.7));opacity:calc(1 - var(--p)*.9);font-family:'Bodoni Moda',serif;font-size:clamp(88px,21vw,320px);line-height:.78;letter-spacing:-.035em;color:#f6f5f3;white-space:nowrap;clip-path:inset(0 0 0 50%)`)}>ankuzo</div>
      <p style={css(`position:absolute;left:50%;top:calc(50% + clamp(52px,7.4vw,120px));margin:0;transform:translate3d(-50%,calc(var(--p)*-6vh),0);opacity:calc(1 - var(--p)*2.4);font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(15px,1.6vw,24px);color:rgba(241,240,238,.6);white-space:nowrap`)}>личный игровой архив</p>
      <div style={css(`position:absolute;left:0;right:0;bottom:0;padding:0 clamp(20px,4vw,56px) clamp(24px,4vh,44px);transform:translate3d(0,calc(var(--p)*8vh),0);opacity:calc(1 - var(--p)*2)`)}>
        <div style={css(`font-size:13px;line-height:1.5;color:rgba(241,240,238,.5);max-width:38ch`)}>Восемнадцать лет в чужих мирах, сведённые на одну страницу.</div>
      </div>
      <div style={css(`position:absolute;left:50%;bottom:clamp(70px,11vh,120px);transform:translateX(-50%);opacity:calc(.65 - var(--p)*3);font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:rgba(241,240,238,.6)`)}>пройти насквозь</div>
    </div>
  </section>

  <section data-scene="now" data-chapter="now" data-static="0.6" style={css(`--p:0;--s:0;position:relative;z-index:1;height:250vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div style={css(`position:absolute;top:9vh;right:0;width:min(64vw,940px);height:82vh;clip-path:inset(calc(28% - var(--p)*28%) 0 calc(28% - var(--p)*28%) 0);filter:invert(var(--s,0)) contrast(calc(1 + var(--s,0)*.4));transform:scale(calc(1.16 - var(--p)*.16)) translate3d(calc(var(--mx,0)*12px),calc(var(--my,0)*9px),0);background:repeating-linear-gradient(105deg,rgba(255,255,255,.06) 0 2px,rgba(255,255,255,0) 2px 12px),linear-gradient(196deg,#a4a4a4 0%,#404040 46%,#0e0e0e 100%);box-shadow:inset 0 0 200px rgba(0,0,0,.62)`)}>
        <span style={css(`position:absolute;left:16px;bottom:12px;font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.08em;color:rgba(241,240,238,.32)`)}>artwork / elden ring — shadow of the erdtree</span>
      </div>
      <div style={css(`position:absolute;left:clamp(20px,4.5vw,72px);top:22vh;z-index:2;max-width:min(58vw,760px);transform:translate3d(0,calc((1 - var(--p))*9vh),0);opacity:calc(.15 + var(--p)*1.5)`)}>
        <div style={css(`font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#f6f5f3;display:flex;align-items:center;gap:10px`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:#f6f5f3;display:inline-block`)}></span>сейчас в игре</div>
        <h2 style={css(`margin:14px 0 0;font-family:'Bodoni Moda',serif;font-weight:400;font-size:clamp(46px,7.4vw,138px);line-height:.86;letter-spacing:-.025em;color:#f6f5f3`)}>Elden&nbsp;Ring<br /><span style={css(`font-style:italic;color:rgba(246,245,243,.66)`)}>Shadow of the Erdtree</span></h2>
      </div>
      <div style={css(`position:absolute;left:clamp(20px,4.5vw,72px);bottom:clamp(28px,7vh,72px);z-index:2;display:flex;flex-wrap:wrap;align-items:flex-end;gap:clamp(20px,4vw,64px);transform:translate3d(calc((1 - var(--p))*-4vw),0,0);opacity:calc(var(--p)*1.4 - .2)`)}>
        <div><div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(52px,7vw,104px);line-height:.8;color:#f6f5f3`)}>41</div><div style={css(`font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.45);margin-top:8px`)}>час за месяц</div></div>
        <div style={css(`font-size:13px;line-height:1.6;color:rgba(241,240,238,.52);max-width:34ch`)}>PC · Steam. Хожу медленно, читаю описания предметов, дважды заблудился в Аббатстве. Это не спешка — это отпуск.</div>
      </div>
    </div>
  </section>

  <section data-scene="recent" data-chapter="recent0" data-static="0" style={css(`--p:0;position:relative;z-index:1;height:500vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div style={css(`position:absolute;top:clamp(22px,4vh,44px);left:clamp(20px,4.5vw,72px);z-index:3;font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(15px,1.5vw,22px);color:rgba(241,240,238,.5)`)}>последние две недели</div>
      <div style={css(`position:absolute;left:clamp(20px,4.5vw,72px);right:clamp(20px,4.5vw,72px);bottom:clamp(22px,4vh,40px);height:1px;background:rgba(241,240,238,.14);z-index:3`)}><div style={css(`position:absolute;left:0;top:-1px;height:3px;background:#f6f5f3;width:calc(var(--p)*100%)`)}></div></div>
      <div data-track="" style={css(`position:absolute;top:0;left:0;height:100%;display:flex;width:400vw;transform:translate3d(calc(var(--p)*-300vw),0,0);will-change:transform`)}>

        <article style={css(`position:relative;width:80vw;height:100%;flex:none;display:flex;align-items:center;justify-content:center`)}>
          <div style={css(`position:absolute;inset:14vh clamp(16px,3vw,48px);transform:translate3d(calc(var(--p)*-9vw),0,0) scale(calc(1 + var(--p)*.12));background:repeating-linear-gradient(100deg,rgba(255,255,255,.055) 0 2px,rgba(255,255,255,0) 2px 12px),linear-gradient(168deg,#9b9b9b 0%,#3a3a3a 54%,#0d0d0d 100%);box-shadow:inset 0 0 160px rgba(0,0,0,.62)`)}><span style={css(`position:absolute;left:14px;bottom:10px;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:rgba(241,240,238,.28)`)}>artwork / elden ring</span></div>
          <div style={css(`position:relative;z-index:2;width:100%;padding:0 clamp(24px,5vw,80px);display:flex;justify-content:space-between;align-items:flex-end;gap:32px;transform:translate3d(calc(var(--p)*30vw),0,0)`)}>
            <h3 style={css(`margin:0;font-family:'Bodoni Moda',serif;font-weight:400;font-size:clamp(40px,6.4vw,120px);line-height:.88;letter-spacing:-.02em;color:#f6f5f3`)}>Elden Ring</h3>
            <div style={css(`text-align:right;flex:none`)}><div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(30px,3.4vw,58px);line-height:1;color:#f6f5f3`)}>41 ч</div><div style={css(`font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.42);margin-top:6px`)}>вчера · PC</div></div>
          </div>
        </article>

        <article style={css(`position:relative;width:80vw;height:100%;flex:none;display:flex;align-items:center;justify-content:center`)}>
          <div style={css(`position:absolute;inset:20vh clamp(16px,3vw,48px) 10vh;transform:translate3d(calc(var(--p)*7vw),0,0);background:repeating-linear-gradient(96deg,rgba(255,255,255,.05) 0 2px,rgba(255,255,255,0) 2px 12px),linear-gradient(184deg,#4e4e4e 0%,#242424 56%,#080808 100%);box-shadow:inset 0 0 160px rgba(0,0,0,.6)`)}><span style={css(`position:absolute;left:14px;bottom:10px;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:rgba(241,240,238,.28)`)}>artwork / rain world</span></div>
          <div style={css(`position:relative;z-index:2;width:100%;padding:0 clamp(24px,5vw,80px);display:flex;justify-content:space-between;align-items:flex-start;gap:32px;transform:translate3d(calc(var(--p)*22vw),0,0)`)}>
            <div style={css(`max-width:26ch;font-size:13px;line-height:1.6;color:rgba(241,240,238,.5)`)}>Мир, которому на меня плевать. Из всего, во что я играл в этом году, — самое честное.</div>
            <h3 style={css(`margin:0;text-align:right;font-family:'Bodoni Moda',serif;font-weight:400;font-style:italic;font-size:clamp(40px,6.4vw,120px);line-height:.88;color:#f6f5f3`)}>Rain World<span style={css(`display:block;font-style:normal;font-family:'Archivo',sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.42);margin-top:14px`)}>27 ч · четыре дня назад · PC</span></h3>
          </div>
        </article>

        <article style={css(`position:relative;width:80vw;height:100%;flex:none;display:flex;align-items:flex-end;justify-content:center`)}>
          <div style={css(`position:absolute;inset:8vh clamp(60px,12vw,220px) 22vh clamp(16px,3vw,48px);transform:translate3d(calc(var(--p)*-6vw),0,0);background:repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 2px,rgba(255,255,255,0) 2px 12px),linear-gradient(160deg,#c6c6c6 0%,#4a4a4a 50%,#0a0a0a 100%);box-shadow:inset 0 0 160px rgba(0,0,0,.66)`)}><span style={css(`position:absolute;left:14px;bottom:10px;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:rgba(20,20,20,.5)`)}>artwork / bloodborne</span></div>
          <div style={css(`position:relative;z-index:2;width:100%;padding:0 clamp(24px,5vw,80px) clamp(26px,7vh,80px);transform:translate3d(calc(var(--p)*26vw),0,0)`)}>
            <h3 style={css(`margin:0;font-family:'Bodoni Moda',serif;font-weight:400;font-size:clamp(44px,7.2vw,138px);line-height:.86;letter-spacing:-.02em;color:#f6f5f3`)}>Bloodborne</h3>
            <div style={css(`margin-top:12px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.44)`)}>18 ч · PS5 · четвёртое прохождение</div>
          </div>
        </article>

        <article style={css(`position:relative;width:80vw;height:100%;flex:none;display:flex;align-items:center;justify-content:center`)}>
          <div style={css(`position:absolute;inset:16vh clamp(16px,3vw,48px);transform:translate3d(calc(var(--p)*10vw),0,0) scale(calc(1.1 - var(--p)*.1));background:repeating-linear-gradient(92deg,rgba(255,255,255,.05) 0 2px,rgba(255,255,255,0) 2px 12px),linear-gradient(200deg,#5f5f5f 0%,#1d1d1d 52%,#070707 100%);box-shadow:inset 0 0 170px rgba(0,0,0,.6)`)}><span style={css(`position:absolute;left:14px;bottom:10px;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:rgba(241,240,238,.28)`)}>artwork / outer wilds</span></div>
          <div style={css(`position:relative;z-index:2;text-align:center;padding:0 clamp(24px,5vw,80px);transform:translate3d(calc(var(--p)*18vw),0,0)`)}>
            <h3 style={css(`margin:0;font-family:'Bodoni Moda',serif;font-weight:400;font-size:clamp(42px,6.8vw,128px);line-height:.88;color:#f6f5f3`)}>Outer Wilds</h3>
            <div style={css(`margin-top:16px;font-size:13px;line-height:1.6;color:rgba(241,240,238,.5)`)}>22 минуты до конца света, и так двадцать два часа подряд.</div>
          </div>
        </article>

        <article style={css(`position:relative;width:80vw;height:100%;flex:none;display:flex;align-items:center;justify-content:flex-start`)}>
          <div style={css(`position:absolute;inset:12vh clamp(16px,3vw,48px) 12vh 34vw;transform:translate3d(calc(var(--p)*-8vw),0,0);background:repeating-linear-gradient(116deg,rgba(255,255,255,.05) 0 2px,rgba(255,255,255,0) 2px 12px),linear-gradient(176deg,#7d7d7d 0%,#2c2c2c 54%,#0a0a0a 100%);box-shadow:inset 0 0 150px rgba(0,0,0,.6)`)}><span style={css(`position:absolute;left:14px;bottom:10px;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:rgba(241,240,238,.28)`)}>artwork / disco elysium</span></div>
          <div style={css(`position:relative;z-index:2;padding:0 clamp(24px,5vw,80px);max-width:44vw;transform:translate3d(calc(var(--p)*14vw),0,0)`)}>
            <h3 style={css(`margin:0;font-family:'Bodoni Moda',serif;font-weight:400;font-size:clamp(38px,5.6vw,104px);line-height:.9;color:#f6f5f3`)}>Disco<br /><span style={css(`font-style:italic`)}>Elysium</span></h3>
            <div style={css(`margin-top:18px;font-size:13px;line-height:1.6;color:rgba(241,240,238,.52);max-width:30ch`)}>Перечитываю как книгу. 96 часов, и до сих пор не проходил трезвым копом.</div>
          </div>
        </article>

      </div>
    </div>
  </section>

  <section data-scene="wipe" data-chapter="steam" data-static="0" style={css(`--p:0;--b:0;position:relative;z-index:2;height:150vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div style={css(`position:absolute;inset:0;background:#eeedea;transform:scaleY(var(--b,0));transform-origin:50% 50%`)}></div>
      <div style={css(`position:absolute;inset:0;display:grid;place-items:center;opacity:calc(var(--b,0)*1.6 - .5)`)}>
        <div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(38px,7vw,120px);line-height:.9;letter-spacing:-.03em;color:#0b0b0b;text-align:center`)}>восемнадцать лет<br /><span style={css(`font-style:italic`)}>в одной библиотеке</span></div>
      </div>
    </div>
  </section>

  <section data-scene="steam" data-chapter="steam" data-static="0.5" style={css(`--p:0;position:relative;z-index:1;height:270vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden;display:flex;align-items:center`)}>
      <div style={css(`position:relative;width:100%;padding:0 clamp(20px,4.5vw,72px)`)}>
        <div data-count="2450" style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(120px,27vw,420px);line-height:.74;letter-spacing:-.05em;color:#f6f5f3;font-variant-numeric:tabular-nums;transform:translate3d(calc(var(--p)*-7vw),0,0)`)}>2450</div>
        <div style={css(`display:flex;flex-wrap:wrap;gap:clamp(20px,5vw,90px);align-items:flex-start;margin-top:clamp(14px,2.4vh,28px);transform:translate3d(calc(var(--p)*9vw),0,0)`)}>
          <div style={css(`font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(26px,3.4vw,60px);line-height:1;color:rgba(246,245,243,.82)`)}>часов в Dota&nbsp;2</div>
          <div style={css(`max-width:36ch;font-size:13px;line-height:1.65;color:rgba(241,240,238,.5)`)}>Больше, чем в любой другой игре, и я не уверен, что горжусь этим. Зато знаю, как выглядит дружба, разложенная на пять ролей.</div>
          <div style={css(`font-size:12px;line-height:2;letter-spacing:.06em;color:rgba(241,240,238,.42)`)}>steam · ankuzo<br />уровень 47 · 312 игр</div>
        </div>
      </div>
    </div>
  </section>

  <section data-scene="credits" data-chapter="steam" data-static="1" style={css(`--p:0;position:relative;z-index:1;padding:14vh clamp(20px,4.5vw,72px) 22vh`)}>
    <div style={css(`font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(16px,1.7vw,26px);color:rgba(241,240,238,.5);margin-bottom:clamp(28px,6vh,72px)`)}>всё, что осталось в часах</div>
    <div style={css(`display:flex;flex-direction:column`)}>
      <div style={css(`display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding:clamp(14px,2.4vh,26px) 0;border-top:1px solid rgba(241,240,238,.16);transform:translate3d(calc((1 - var(--p))*-8vw),0,0)`)}><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(26px,3.6vw,60px);line-height:1;color:#f6f5f3`)}>Dota 2</span><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(26px,3.6vw,60px);line-height:1;color:rgba(246,245,243,.92)`)}>2450</span></div>
      <div style={css(`display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding:clamp(14px,2.4vh,26px) 0 clamp(14px,2.4vh,26px) clamp(0px,6vw,120px);border-top:1px solid rgba(241,240,238,.16);transform:translate3d(calc((1 - var(--p))*7vw),0,0)`)}><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(24px,3.2vw,52px);line-height:1;color:#f6f5f3`)}>Red Dead Redemption 2</span><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(24px,3.2vw,52px);line-height:1;color:rgba(246,245,243,.86)`)}>412</span></div>
      <div style={css(`display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding:clamp(14px,2.4vh,26px) 0;border-top:1px solid rgba(241,240,238,.16);transform:translate3d(calc((1 - var(--p))*-6vw),0,0)`)}><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(22px,2.9vw,46px);line-height:1;color:#f6f5f3`)}>Elden Ring</span><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(22px,2.9vw,46px);line-height:1;color:rgba(246,245,243,.82)`)}>388</span></div>
      <div style={css(`display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding:clamp(14px,2.4vh,26px) 0 clamp(14px,2.4vh,26px) clamp(0px,10vw,200px);border-top:1px solid rgba(241,240,238,.16);transform:translate3d(calc((1 - var(--p))*5vw),0,0)`)}><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(20px,2.5vw,40px);line-height:1;color:rgba(246,245,243,.92)`)}>Kenshi</span><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(20px,2.5vw,40px);line-height:1;color:rgba(246,245,243,.78)`)}>214</span></div>
      <div style={css(`display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding:clamp(14px,2.4vh,26px) 0;border-top:1px solid rgba(241,240,238,.16);transform:translate3d(calc((1 - var(--p))*-4vw),0,0)`)}><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(18px,2.1vw,34px);line-height:1;color:rgba(246,245,243,.86)`)}>Disco Elysium</span><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(18px,2.1vw,34px);line-height:1;color:rgba(246,245,243,.72)`)}>96</span></div>
      <div style={css(`display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding:clamp(14px,2.4vh,26px) 0 clamp(14px,2.4vh,26px) clamp(0px,14vw,280px);border-top:1px solid rgba(241,240,238,.16);border-bottom:1px solid rgba(241,240,238,.16);transform:translate3d(calc((1 - var(--p))*3vw),0,0)`)}><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(17px,1.9vw,30px);line-height:1;color:rgba(246,245,243,.8)`)}>Outer Wilds</span><span style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(17px,1.9vw,30px);line-height:1;color:rgba(246,245,243,.66)`)}>41</span></div>
    </div>
  </section>

  <section data-scene="psn" data-chapter="psn" data-static="0.6" style={css(`--p:0;position:relative;z-index:1;padding:6vh 0 12vh`)}>
    <div style={css(`padding:0 clamp(20px,4.5vw,72px);max-width:min(46ch,90vw);margin-bottom:10vh`)}>
      <div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(34px,5vw,88px);line-height:.94;color:#f6f5f3`)}>PlayStation</div>
      <p style={css(`margin:18px 0 0;font-size:13px;line-height:1.7;color:rgba(241,240,238,.52)`)}>Консоль стоит в комнате, где нет рабочего стола. Поэтому здесь другие игры — те, которые я прохожу целиком, а не запускаю на двадцать минут.</p>
    </div>

    <div style={css(`position:relative;width:min(74vw,1080px);height:74vh;background:repeating-linear-gradient(102deg,rgba(255,255,255,.045) 0 2px,rgba(255,255,255,0) 2px 13px),linear-gradient(168deg,#b8b8b8 0%,#3c3c3c 52%,#080808 100%);box-shadow:inset 0 0 190px rgba(0,0,0,.6);filter:contrast(calc(.35 + var(--p)*1.05)) brightness(calc(1.75 - var(--p)*.85)) grayscale(1)`)}>
      <span style={css(`position:absolute;left:16px;bottom:12px;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:rgba(20,20,20,.45)`)}>still / bloodborne</span>
    </div>
    <div style={css(`display:flex;justify-content:flex-end;padding:0 clamp(20px,4.5vw,72px);margin-top:26px`)}><div style={css(`text-align:right;max-width:18ch`)}><div style={css(`font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(22px,2.6vw,42px);line-height:1.05;color:#f6f5f3`)}>платина</div><div style={css(`margin-top:10px;font-size:12px;line-height:1.6;color:rgba(241,240,238,.5)`)}>первая и до сих пор самая тяжёлая</div></div></div>

    <div style={css(`display:flex;justify-content:flex-end;margin-top:16vh;padding-right:clamp(20px,4.5vw,72px)`)}>
      <div style={css(`position:relative;width:min(52vw,720px);height:52vh;background:repeating-linear-gradient(88deg,rgba(255,255,255,.045) 0 2px,rgba(255,255,255,0) 2px 13px),linear-gradient(190deg,#8a8a8a 0%,#2a2a2a 54%,#070707 100%);box-shadow:inset 0 0 160px rgba(0,0,0,.6);filter:contrast(calc(.5 + var(--p)*.9)) brightness(calc(1.5 - var(--p)*.6)) grayscale(1)`)}>
        <span style={css(`position:absolute;left:16px;bottom:12px;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:rgba(241,240,238,.3)`)}>still / ghost of tsushima</span>
        <div style={css(`position:absolute;left:clamp(-140px,-12vw,-32px);top:16%;max-width:14ch`)}><div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(20px,2.3vw,36px);line-height:1.1;color:#f6f5f3`)}>платина</div><div style={css(`margin-top:8px;font-size:12px;color:rgba(241,240,238,.5)`)}>ради фоторежима</div></div>
      </div>
    </div>

    <div style={css(`display:flex;flex-wrap:wrap;align-items:flex-end;gap:clamp(24px,6vw,110px);padding:16vh clamp(20px,4.5vw,72px) 0`)}>
      <div><div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(72px,13vw,220px);line-height:.78;letter-spacing:-.03em;color:#f6f5f3`)}>2184</div><div style={css(`margin-top:12px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(241,240,238,.45)`)}>трофея</div></div>
      <div><div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(40px,6vw,96px);line-height:.82;color:rgba(246,245,243,.86)`)}>19</div><div style={css(`margin-top:10px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(241,240,238,.4)`)}>платин</div></div>
      <div style={css(`font-size:12px;line-height:2;letter-spacing:.06em;color:rgba(241,240,238,.42)`)}>psn · ankuzo<br />уровень 214<br />God of War Ragnarök — 94%</div>
    </div>
  </section>

  <section data-scene="discord" data-chapter="discord" data-static="0.7" style={css(`--p:0;position:relative;z-index:2;height:230vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div style={css(`position:absolute;inset:0;background:#eeedea;clip-path:circle(calc(var(--p)*150%) at 50% 50%)`)}></div>
      <div style={css(`position:absolute;inset:0;display:flex;align-items:center;padding:0 clamp(20px,4.5vw,72px);opacity:calc(var(--p)*2.6 - .5)`)}>
        <div style={css(`max-width:min(52ch,86vw);margin-left:clamp(0px,8vw,180px)`)}>
          <div style={css(`display:flex;align-items:center;gap:20px`)}>
            <div style={css(`position:relative;width:76px;height:76px;flex:none;border-radius:50%;background:repeating-linear-gradient(120deg,rgba(0,0,0,.07) 0 2px,rgba(0,0,0,0) 2px 9px),linear-gradient(150deg,#c9c8c5,#8c8b88)`)}><span style={css(`position:absolute;left:0;right:0;bottom:-18px;text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:9px;color:rgba(11,11,11,.4)`)}>avatar</span></div>
            <div>
              <div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(28px,3.4vw,54px);line-height:1;color:#0b0b0b`)}>ankuzo</div>
              <div style={css(`margin-top:8px;display:flex;align-items:center;gap:9px;font-size:12px;letter-spacing:.1em;color:rgba(11,11,11,.6)`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:#0b0b0b;display:inline-block`)}></span>в голосовом · 3 часа</div>
            </div>
          </div>
          <p style={css(`margin:clamp(28px,6vh,64px) 0 0;font-family:'Bodoni Moda',serif;font-size:clamp(20px,2.4vw,38px);line-height:1.28;color:#0b0b0b`)}>За всеми числами выше — один человек, который чаще всего просто сидит в канале и слушает, как играют другие.</p>
          <p style={css(`margin:22px 0 0;font-size:13px;line-height:1.75;color:rgba(11,11,11,.62);max-width:38ch`)}>Сервер «Погреб», шесть человек. По вторникам после полуночи там почти всегда кто-то есть.</p>
        </div>
      </div>
    </div>
  </section>

  <section data-scene="ts" data-chapter="ts" data-static="1" style={css(`--p:0;position:relative;z-index:1;height:250vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden;display:grid;place-items:center`)}>
      <div style={css(`position:absolute;left:50%;top:50%;transform:translate3d(-50%,-50%,0);width:calc(6vw + var(--p)*64vw);height:calc(46vh + var(--p)*44vh);background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.16) 58%,rgba(255,255,255,0));box-shadow:0 0 140px rgba(255,255,255,.18)`)}></div>
      <div style={css(`position:relative;text-align:center;padding:0 24px;opacity:calc(var(--p)*2.2 - .7);transform:translate3d(0,calc((1 - var(--p))*4vh),0);mix-blend-mode:difference;color:#fff`)}>
        <div style={css(`font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(18px,2vw,32px)`)}>последняя комната</div>
        <div style={css(`margin-top:clamp(14px,2.6vh,28px);font-family:'Bodoni Moda',serif;font-size:clamp(28px,5.2vw,86px);line-height:1;letter-spacing:-.02em`)}>ts.pogreb.su</div>
        <div style={css(`margin-top:14px;font-size:12px;letter-spacing:.2em;text-transform:uppercase`)}>порт 9987 · TeamSpeak 3</div>
      </div>
      <div style={css(`position:absolute;left:50%;bottom:clamp(60px,12vh,130px);transform:translateX(-50%);text-align:center;opacity:calc(var(--p)*2.2 - .9)`)}>
        <button type="button" className="copy-btn" onClick={copyTs} style={css(`background:transparent;border:1px solid rgba(241,240,238,.45);color:#f6f5f3;font-family:'Archivo',sans-serif;font-size:12px;letter-spacing:.18em;text-transform:uppercase;padding:14px 30px;cursor:pointer;transition:background 300ms,border-color 300ms`)}>{tsLabel}</button>
        <div style={css(`margin-top:16px;font-size:12px;color:rgba(241,240,238,.42)`)}>пароль — в дискорде, если мы знакомы</div>
      </div>
    </div>
  </section>

  <section data-scene="final" data-chapter="final" data-static="0.5" style={css(`--p:0;position:relative;z-index:1;height:100vh;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end`)}>
    <div style={css(`padding:0 clamp(20px,4.5vw,72px);font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(17px,2vw,30px);color:rgba(246,245,243,.62);margin-bottom:clamp(20px,4vh,40px)`)}>увидимся в голосовом</div>
    <div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(110px,25vw,400px);line-height:.7;letter-spacing:-.045em;color:#f6f5f3;padding:0 clamp(20px,4.5vw,72px) clamp(22px,4vh,44px);margin-bottom:-.02em;transform:translate3d(0,calc(var(--p)*-2vh),0)`)}>ankuzo</div>
  </section>

</div>
  );
}
