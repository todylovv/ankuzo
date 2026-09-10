import type { Ref } from "react";
import { css } from "./css";
import { GameStill } from "./GameStill";
import type { ArchiveLive, CreditGame, RecentGame } from "./useArchiveData";

type ArchiveProps = {
  rootRef: Ref<HTMLDivElement>;
  tsLabel: string;
  copyTs: () => void;
  live: ArchiveLive;
};

function hoursWord(value: number): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "часов";
  if (last === 1) return "час";
  if (last >= 2 && last <= 4) return "часа";
  return "часов";
}

type CreditLook = {
  pad: string;
  size: string;
  name: string;
  hours: string;
};

const CREDIT_LOOK: CreditLook[] = [
  { pad: "0", size: "clamp(26px,3.6vw,60px)", name: "#f6f5f3", hours: "rgba(246,245,243,.92)" },
  { pad: "clamp(0px,6vw,120px)", size: "clamp(24px,3.2vw,52px)", name: "#f6f5f3", hours: "rgba(246,245,243,.86)" },
  { pad: "0", size: "clamp(22px,2.9vw,46px)", name: "#f6f5f3", hours: "rgba(246,245,243,.82)" },
  { pad: "clamp(0px,10vw,200px)", size: "clamp(20px,2.5vw,40px)", name: "rgba(246,245,243,.92)", hours: "rgba(246,245,243,.78)" },
  { pad: "0", size: "clamp(18px,2.1vw,34px)", name: "rgba(246,245,243,.86)", hours: "rgba(246,245,243,.72)" },
  { pad: "clamp(0px,14vw,280px)", size: "clamp(17px,1.9vw,30px)", name: "rgba(246,245,243,.8)", hours: "rgba(246,245,243,.66)" },
];

type Plate = {
  id: string;
  on?: boolean;
  background: string;
};

const PLATES: Plate[] = [
  {
    id: "hero",
    on: true,
    background:
      "radial-gradient(56% 52% at 36% 42%,#333 0%,rgba(51,51,51,0) 72%),radial-gradient(44% 52% at 76% 68%,rgba(120,120,120,.28) 0%,rgba(120,120,120,0) 70%),#0b0b0b",
  },
  {
    id: "now",
    background:
      "radial-gradient(54% 56% at 64% 38%,#6e6e6e 0%,rgba(110,110,110,0) 70%),radial-gradient(38% 38% at 22% 76%,rgba(30,30,30,.9) 0%,rgba(30,30,30,0) 72%),#0d0d0d",
  },
  { id: "recent0", background: "radial-gradient(50% 50% at 32% 44%,#5a5a5a 0%,rgba(90,90,90,0) 72%),#0c0c0c" },
  { id: "recent1", background: "radial-gradient(60% 46% at 62% 66%,#2b2b2b 0%,rgba(43,43,43,0) 74%),#070707" },
  { id: "recent2", background: "radial-gradient(46% 46% at 48% 40%,#8e8e8e 0%,rgba(142,142,142,0) 70%),#101010" },
  { id: "recent3", background: "radial-gradient(70% 40% at 50% 18%,#3d3d3d 0%,rgba(61,61,61,0) 76%),#060606" },
  {
    id: "recent4",
    background:
      "radial-gradient(48% 54% at 26% 56%,#6a6a6a 0%,rgba(106,106,106,0) 72%),radial-gradient(34% 34% at 78% 30%,rgba(160,160,160,.22) 0%,rgba(160,160,160,0) 72%),#0b0b0b",
  },
  { id: "steam", background: "linear-gradient(96deg,rgba(120,120,120,.32) 0%,rgba(0,0,0,0) 52%),#0a0a0a" },
  { id: "psn", background: "radial-gradient(58% 54% at 70% 46%,#4c4c4c 0%,rgba(76,76,76,0) 74%),#080808" },
  { id: "discord", background: "radial-gradient(52% 50% at 44% 52%,#9a9a98 0%,rgba(154,154,152,0) 74%),#101010" },
  { id: "ts", background: "radial-gradient(18% 64% at 50% 50%,rgba(255,255,255,.34) 0%,rgba(255,255,255,0) 72%),#050505" },
  { id: "final", background: "radial-gradient(72% 56% at 50% 94%,#242424 0%,rgba(36,36,36,0) 76%),#080808" },
];

function plateStyle(plate: Plate): string {
  const show = plate.on ? "1" : "0";
  const vis = plate.on ? "visible" : "hidden";
  return `position:absolute;inset:0;opacity:${show};visibility:${vis};background:${plate.background}`;
}

type CreditRowProps = {
  game: CreditGame;
  index: number;
  last: boolean;
};

function CreditRow({ game, index, last }: CreditRowProps) {
  const look = CREDIT_LOOK[Math.min(index, CREDIT_LOOK.length - 1)];
  return (
    <div
      style={css(
        `display:flex;align-items:center;justify-content:space-between;gap:24px;padding:clamp(14px,2.4vh,26px) 0 clamp(14px,2.4vh,26px) ${look.pad};border-top:1px solid rgba(241,240,238,.16);${last ? "border-bottom:1px solid rgba(241,240,238,.16);" : ""}`,
      )}
    >
      <span style={css(`display:flex;align-items:center;gap:clamp(12px,2vw,22px);min-width:0`)}>
        <span style={css(`position:relative;display:block;width:52px;height:74px;flex:none;overflow:hidden;background:#141414`)}>
          <GameStill art={game.art} kind="poster" position="center center" />
        </span>
        <span style={css(`font-family:'Bodoni Moda',serif;font-size:${look.size};line-height:1;color:${look.name}`)}>{game.name}</span>
      </span>
      <span style={css(`font-family:'Bodoni Moda',serif;font-size:${look.size};line-height:1;color:${look.hours}`)}>{game.hours}</span>
    </div>
  );
}

const SLIDE = `position:relative;width:80vw;height:100%;flex:none;display:flex`;
const STILL = `overflow:hidden;background:#101010`;
const TITLE = `margin:0;font-family:'Bodoni Moda',serif;font-weight:400;color:#f6f5f3;text-shadow:0 12px 40px rgba(0,0,0,.55)`;

type RecentSlideProps = {
  game: RecentGame;
  index: number;
};

function RecentSlide({ game, index }: RecentSlideProps) {
  switch (index) {
    case 0:
      return (
        <article style={css(`${SLIDE};align-items:center;justify-content:center`)}>
          <div style={css(`position:absolute;inset:14vh clamp(16px,3vw,48px);${STILL}`)}>
            <GameStill art={game.art} kind="wide" caption={game.caption} />
          </div>
          <div style={css(`position:relative;z-index:2;width:100%;padding:0 clamp(24px,5vw,80px);display:flex;justify-content:space-between;align-items:flex-end;gap:32px`)}>
            <h3 style={css(`${TITLE};font-size:clamp(40px,6.4vw,120px);line-height:.88;letter-spacing:-.02em`)}>{game.name}</h3>
            <div style={css(`text-align:right;flex:none`)}>
              <div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(30px,3.4vw,58px);line-height:1;color:#f6f5f3`)}>{game.hours}</div>
              <div style={css(`font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.42);margin-top:6px`)}>{game.meta}</div>
            </div>
          </div>
        </article>
      );
    case 1:
      return (
        <article style={css(`${SLIDE};align-items:center;justify-content:center`)}>
          <div style={css(`position:absolute;inset:20vh clamp(16px,3vw,48px) 10vh;${STILL}`)}>
            <GameStill art={game.art} kind="wide" caption={game.caption} />
          </div>
          <div style={css(`position:relative;z-index:2;width:100%;padding:0 clamp(24px,5vw,80px);display:flex;justify-content:space-between;align-items:flex-start;gap:32px`)}>
            <div style={css(`max-width:26ch;font-size:13px;line-height:1.6;color:rgba(241,240,238,.5)`)}>{game.meta}</div>
            <h3 style={css(`${TITLE};text-align:right;font-style:italic;font-size:clamp(40px,6.4vw,120px);line-height:.88`)}>
              {game.name}
              <span style={css(`display:block;font-style:normal;font-family:'Archivo',sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.42);margin-top:14px`)}>{game.hours}</span>
            </h3>
          </div>
        </article>
      );
    case 2:
      return (
        <article style={css(`${SLIDE};align-items:flex-end;justify-content:center`)}>
          <div style={css(`position:absolute;inset:8vh clamp(60px,12vw,220px) 22vh clamp(16px,3vw,48px);${STILL}`)}>
            <GameStill art={game.art} kind="wide" caption={game.caption} captionDark />
          </div>
          <div style={css(`position:relative;z-index:2;width:100%;padding:0 clamp(24px,5vw,80px) clamp(26px,7vh,80px)`)}>
            <h3 style={css(`${TITLE};font-size:clamp(44px,7.2vw,138px);line-height:.86;letter-spacing:-.02em`)}>{game.name}</h3>
            <div style={css(`margin-top:12px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.44)`)}>{game.hours} · {game.meta}</div>
          </div>
        </article>
      );
    case 3:
      return (
        <article style={css(`${SLIDE};align-items:center;justify-content:center`)}>
          <div style={css(`position:absolute;inset:16vh clamp(16px,3vw,48px);${STILL}`)}>
            <GameStill art={game.art} kind="wide" caption={game.caption} />
          </div>
          <div style={css(`position:relative;z-index:2;text-align:center;padding:0 clamp(24px,5vw,80px)`)}>
            <h3 style={css(`${TITLE};font-size:clamp(42px,6.8vw,128px);line-height:.88`)}>{game.name}</h3>
            <div style={css(`margin-top:16px;font-size:13px;line-height:1.6;color:rgba(241,240,238,.5)`)}>{game.hours} · {game.meta}</div>
          </div>
        </article>
      );
    default: {
      const space = game.name.indexOf(" ");
      const first = space === -1 ? game.name : game.name.slice(0, space);
      const second = space === -1 ? "" : game.name.slice(space + 1);
      return (
        <article style={css(`${SLIDE};align-items:center;justify-content:flex-start`)}>
          <div style={css(`position:absolute;inset:12vh clamp(16px,3vw,48px) 12vh 34vw;${STILL}`)}>
            <GameStill art={game.art} kind="poster" caption={game.caption} />
          </div>
          <div style={css(`position:relative;z-index:2;padding:0 clamp(24px,5vw,80px);max-width:44vw`)}>
            <h3 style={css(`${TITLE};font-size:clamp(38px,5.6vw,104px);line-height:.9`)}>
              {first}
              {second ? (
                <>
                  <br />
                  <span style={css(`font-style:italic`)}>{second}</span>
                </>
              ) : null}
            </h3>
            <div style={css(`margin-top:18px;font-size:13px;line-height:1.6;color:rgba(241,240,238,.52);max-width:30ch`)}>{game.hours} · {game.meta}</div>
          </div>
        </article>
      );
    }
  }
}

export function Archive({ rootRef, tsLabel, copyTs, live }: ArchiveProps) {
  return (
    <div ref={rootRef} style={css(`position:relative;background:#090909;overflow-x:clip;font-family:'Archivo',system-ui,sans-serif`)}>

  <div aria-hidden="true" style={css(`position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden`)}>
    {PLATES.map((plate) => (
      <div key={plate.id} data-plate={plate.id} style={css(plateStyle(plate))} />
    ))}
    <div style={css(`position:absolute;inset:0;background:radial-gradient(122% 92% at 50% 50%,rgba(9,9,9,0) 32%,rgba(9,9,9,.78) 100%)`)} />
  </div>

  <section data-scene="hero" data-chapter="hero" data-static="0" style={css(`--p:0;--b:0;position:relative;z-index:1;height:260vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div style={css(`position:absolute;left:50%;top:50%;width:min(30vw,420px);height:70vh;overflow:hidden;transform:translate3d(-50%,-50%,0) scale(calc(.9 + var(--p)*2.4));opacity:calc(.2 + var(--p)*.8);background:#141414`)}>
        <GameStill art={live.nowArt} kind="poster" eager />
      </div>
      <div style={css(`position:absolute;left:50%;top:50%;display:flex;width:max-content;transform:translate3d(-50%,-50%,0) scale(calc(1 + var(--p)*.7));opacity:calc(1 - var(--p)*.9);font-family:'Bodoni Moda',serif;font-size:clamp(88px,21vw,320px);line-height:.78;letter-spacing:-.035em;color:#f6f5f3`)}>
        <div style={css(`width:50%;overflow:hidden;transform:translate3d(calc(var(--p)*-40vw),0,0)`)}>
          <div style={css(`width:200%;white-space:nowrap`)}>ankuzo</div>
        </div>
        <div style={css(`width:50%;overflow:hidden;transform:translate3d(calc(var(--p)*40vw),0,0)`)}>
          <div style={css(`width:200%;margin-left:-100%;white-space:nowrap`)}>ankuzo</div>
        </div>
      </div>
      <p style={css(`position:absolute;left:50%;top:calc(50% + clamp(52px,7.4vw,120px));margin:0;transform:translate3d(-50%,calc(var(--p)*-6vh),0);opacity:calc(1 - var(--p)*2.4);font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(15px,1.6vw,24px);color:rgba(241,240,238,.6);white-space:nowrap`)}>личный игровой архив</p>
      <div style={css(`position:absolute;left:0;right:0;bottom:0;padding:0 clamp(20px,4vw,56px) clamp(24px,4vh,44px);transform:translate3d(0,calc(var(--p)*8vh),0);opacity:calc(1 - var(--p)*2)`)}>
        <div style={css(`font-size:13px;line-height:1.5;color:rgba(241,240,238,.5);max-width:38ch`)}>Восемнадцать лет в чужих мирах, сведённые на одну страницу.</div>
      </div>
      <div style={css(`position:absolute;left:50%;bottom:clamp(70px,11vh,120px);transform:translateX(-50%);opacity:calc(.65 - var(--p)*3);font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:rgba(241,240,238,.6)`)}>пройти насквозь</div>
    </div>
  </section>

  <section data-scene="now" data-chapter="now" data-static="0.6" style={css(`--p:0;position:relative;z-index:1;height:250vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div style={css(`position:absolute;top:9vh;right:0;width:min(64vw,940px);height:82vh;overflow:hidden;background:#101010`)}>
        <div style={css(`position:absolute;inset:0;transform:scaleY(calc(.44 + var(--p)*.56));transform-origin:50% 50%`)}>
          <GameStill art={live.nowArt} kind="poster" caption={live.nowCaption} eager />
        </div>
      </div>
      <div style={css(`position:absolute;left:clamp(20px,4.5vw,72px);top:22vh;z-index:2;max-width:min(58vw,760px);transform:translate3d(0,calc((1 - var(--p))*9vh),0);opacity:calc(.15 + var(--p)*1.5)`)}>
        <div style={css(`font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#f6f5f3;display:flex;align-items:center;gap:10px`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:#f6f5f3;display:inline-block`)}></span>{live.nowLabel}</div>
        <h2 style={css(`margin:14px 0 0;font-family:'Bodoni Moda',serif;font-weight:400;font-size:clamp(46px,7.4vw,138px);line-height:.86;letter-spacing:-.025em;color:#f6f5f3;text-shadow:0 18px 50px rgba(0,0,0,.55)`)}>
          {live.nowName}
          {live.nowSub ? (
            <>
              <br />
              <span style={css(`font-style:italic;color:rgba(246,245,243,.66)`)}>{live.nowSub}</span>
            </>
          ) : null}
        </h2>
      </div>
      <div style={css(`position:absolute;left:clamp(20px,4.5vw,72px);bottom:clamp(28px,7vh,72px);z-index:2;display:flex;flex-wrap:wrap;align-items:flex-end;gap:clamp(20px,4vw,64px);transform:translate3d(calc((1 - var(--p))*-4vw),0,0);opacity:calc(var(--p)*1.4 - .2)`)}>
        <div><div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(52px,7vw,104px);line-height:.8;color:#f6f5f3`)}>{live.monthHours}</div><div style={css(`font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.45);margin-top:8px`)}>{hoursWord(live.monthHours)} за две недели</div></div>
        <div style={css(`font-size:13px;line-height:1.6;color:rgba(241,240,238,.52);max-width:34ch`)}>PC · Steam. Часы за последние две недели по двум аккаунтам.</div>
      </div>
    </div>
  </section>

  <section data-scene="recent" data-chapter="recent0" data-static="0" style={css(`--p:0;position:relative;z-index:1;height:500vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div style={css(`position:absolute;top:clamp(22px,4vh,44px);left:clamp(20px,4.5vw,72px);z-index:3;font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(15px,1.5vw,22px);color:rgba(241,240,238,.5)`)}>последние две недели</div>
      <div style={css(`position:absolute;left:clamp(20px,4.5vw,72px);right:clamp(20px,4.5vw,72px);bottom:clamp(22px,4vh,40px);height:1px;background:rgba(241,240,238,.14);z-index:3`)}><div style={css(`position:absolute;left:0;top:-1px;height:3px;background:#f6f5f3;width:calc(var(--p)*100%)`)}></div></div>
      <div data-track="" style={css(`position:absolute;top:0;left:0;height:100%;display:flex;width:400vw;transform:translate3d(calc(var(--p)*-300vw),0,0)`)}>
        {live.recents.map((game, index) => (
          <RecentSlide key={`${game.name}-${index}`} game={game} index={index} />
        ))}
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
        <div data-count={String(live.steamHours)} style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(120px,27vw,420px);line-height:.74;letter-spacing:-.05em;color:#f6f5f3;font-variant-numeric:tabular-nums;transform:translate3d(calc(var(--p)*-7vw),0,0)`)}>{live.steamHours}</div>
        <div style={css(`display:flex;flex-wrap:wrap;gap:clamp(20px,5vw,90px);align-items:flex-start;margin-top:clamp(14px,2.4vh,28px);transform:translate3d(calc(var(--p)*9vw),0,0)`)}>
          <div style={css(`font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(26px,3.4vw,60px);line-height:1;color:rgba(246,245,243,.82)`)}>{hoursWord(live.steamHours)} на Steam</div>
          <div style={css(`max-width:36ch;font-size:13px;line-height:1.65;color:rgba(241,240,238,.5)`)}>Сумма двух аккаунтов. Больше всего времени — в {live.topGame}.</div>
          <div style={css(`font-size:12px;line-height:2;letter-spacing:.06em;color:rgba(241,240,238,.42)`)}>steam · {live.steamAccounts}<br />{live.steamGames} игр</div>
        </div>
      </div>
    </div>
  </section>

  <section data-scene="credits" data-chapter="steam" data-static="1" style={css(`--p:0;position:relative;z-index:1;padding:14vh clamp(20px,4.5vw,72px) 22vh`)}>
    <div style={css(`font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(16px,1.7vw,26px);color:rgba(241,240,238,.5);margin-bottom:clamp(28px,6vh,72px)`)}>всё, что осталось в часах</div>
    <div style={css(`display:flex;flex-direction:column`)}>
      {live.credits.map((game, index) => (
        <CreditRow key={game.name} game={game} index={index} last={index === live.credits.length - 1} />
      ))}
    </div>
  </section>

  <section data-scene="psn" data-chapter="psn" data-static="0.6" style={css(`--p:0;position:relative;z-index:1;padding:6vh 0 12vh`)}>
    <div style={css(`padding:0 clamp(20px,4.5vw,72px);max-width:min(46ch,90vw);margin-bottom:10vh`)}>
      <div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(34px,5vw,88px);line-height:.94;color:#f6f5f3`)}>PlayStation</div>
      <p style={css(`margin:18px 0 0;font-size:13px;line-height:1.7;color:rgba(241,240,238,.52)`)}>Консоль стоит в комнате, где нет рабочего стола. Поэтому здесь другие игры — те, которые я прохожу целиком, а не запускаю на двадцать минут.</p>
    </div>

    <div style={css(`position:relative;width:min(74vw,1080px);height:74vh;overflow:hidden;background:#101010`)}>
      <GameStill art={live.psnStills[0]?.art || live.nowArt} kind="wide" caption={live.psnStills[0]?.caption || "still / playstation"} />
    </div>
    <div style={css(`display:flex;justify-content:flex-end;padding:0 clamp(20px,4.5vw,72px);margin-top:26px`)}><div style={css(`text-align:right;max-width:22ch`)}><div style={css(`font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(22px,2.6vw,42px);line-height:1.05;color:#f6f5f3`)}>{live.psnStills[0]?.title || "PlayStation"}</div><div style={css(`margin-top:10px;font-size:12px;line-height:1.6;color:rgba(241,240,238,.5)`)}>из библиотеки</div></div></div>

    <div style={css(`display:flex;justify-content:flex-end;margin-top:16vh;padding-right:clamp(20px,4.5vw,72px)`)}>
      <div style={css(`position:relative;width:min(52vw,720px);height:52vh;overflow:hidden;background:#101010`)}>
        <GameStill art={live.psnStills[1]?.art || live.psnStills[0]?.art || live.nowArt} kind="poster" caption={live.psnStills[1]?.caption || "still / playstation"} />
        <div style={css(`position:absolute;left:clamp(-140px,-12vw,-32px);top:16%;max-width:16ch;z-index:2`)}><div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(20px,2.3vw,36px);line-height:1.1;color:#f6f5f3`)}>{live.psnStills[1]?.title || "PlayStation"}</div><div style={css(`margin-top:8px;font-size:12px;color:rgba(241,240,238,.5)`)}>из библиотеки</div></div>
      </div>
    </div>

    <div style={css(`display:flex;flex-wrap:wrap;align-items:flex-end;gap:clamp(24px,6vw,110px);padding:16vh clamp(20px,4.5vw,72px) 0`)}>
      <div><div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(72px,13vw,220px);line-height:.78;letter-spacing:-.03em;color:#f6f5f3`)}>{live.psnTotal}</div><div style={css(`margin-top:12px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(241,240,238,.45)`)}>трофея</div></div>
      <div><div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(40px,6vw,96px);line-height:.82;color:rgba(246,245,243,.86)`)}>{live.psnPlatinum}</div><div style={css(`margin-top:10px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(241,240,238,.4)`)}>платин</div></div>
      <div style={css(`font-size:12px;line-height:2;letter-spacing:.06em;color:rgba(241,240,238,.42)`)}>psn · {live.psnId}<br />уровень {live.psnLevel}{live.psnHighlight ? <><br />{live.psnHighlight}</> : null}</div>
    </div>
  </section>

  <section data-scene="discord" data-chapter="discord" data-static="0.7" style={css(`--p:0;position:relative;z-index:2;height:230vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div style={css(`position:absolute;left:50%;top:50%;width:140vmax;height:140vmax;margin:-70vmax;border-radius:50%;background:#eeedea;transform:scale(var(--p));transform-origin:50% 50%`)}></div>
      <div style={css(`position:absolute;inset:0;display:flex;align-items:center;padding:0 clamp(20px,4.5vw,72px);opacity:calc(var(--p)*2.6 - .5)`)}>
        <div style={css(`max-width:min(52ch,86vw);margin-left:clamp(0px,8vw,180px)`)}>
          <div style={css(`display:flex;align-items:center;gap:20px`)}>
            <div style={css(`position:relative;width:76px;height:76px;flex:none`)}>
              <div style={css(`width:76px;height:76px;border-radius:50%;overflow:hidden;background:repeating-linear-gradient(120deg,rgba(0,0,0,.07) 0 2px,rgba(0,0,0,0) 2px 9px),linear-gradient(150deg,#c9c8c5,#8c8b88)`)}>
                {live.discordAvatar ? <img src={live.discordAvatar} alt="" width={76} height={76} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              </div>
              <span style={css(`position:absolute;left:0;right:0;bottom:-18px;text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:9px;color:rgba(11,11,11,.4)`)}>avatar</span>
            </div>
            <div>
              <div style={css(`font-family:'Bodoni Moda',serif;font-size:clamp(28px,3.4vw,54px);line-height:1;color:#0b0b0b`)}>{live.discordName}</div>
              <div style={css(`margin-top:8px;display:flex;align-items:center;gap:9px;font-size:12px;letter-spacing:.1em;color:rgba(11,11,11,.6)`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:#0b0b0b;display:inline-block`)}></span>{live.discordStatus}</div>
            </div>
          </div>
          <p style={css(`margin:clamp(28px,6vh,64px) 0 0;font-family:'Bodoni Moda',serif;font-size:clamp(20px,2.4vw,38px);line-height:1.28;color:#0b0b0b`)}>Вопросы есть — пиши сюда.</p>
          <p style={css(`margin:22px 0 0;font-size:13px;line-height:1.75;color:rgba(11,11,11,.62);max-width:42ch`)}>
            Играю один. Голос в TeamSpeak: в поиске{" "}
            <span style={css(`color:#0b0b0b`)}>Ankuzo</span>, или по ссылке{" "}
            <a href="https://tmspk.gg/3Vi7A7Y9" style={css(`color:#0b0b0b;text-decoration:underline;text-underline-offset:3px`)}>tmspk.gg/3Vi7A7Y9</a>.
          </p>
        </div>
      </div>
    </div>
  </section>

  <section data-scene="ts" data-chapter="ts" data-static="1" style={css(`--p:0;position:relative;z-index:1;height:250vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden;display:grid;place-items:center`)}>
      <div style={css(`position:absolute;left:50%;top:50%;width:70vw;height:90vh;transform:translate3d(-50%,-50%,0) scale(calc(.12 + var(--p)*.88));transform-origin:50% 50%;background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.16) 58%,rgba(255,255,255,0))`)}></div>
      <div style={css(`position:relative;text-align:center;padding:0 24px;opacity:calc(var(--p)*2.2 - .7);transform:translate3d(0,calc((1 - var(--p))*4vh),0);color:#f6f5f3`)}>
        <div style={css(`font-family:'Bodoni Moda',serif;font-style:italic;font-size:clamp(18px,2vw,32px)`)}>последняя комната</div>
        <div style={css(`margin-top:clamp(14px,2.6vh,28px);font-family:'Bodoni Moda',serif;font-size:clamp(28px,5.2vw,86px);line-height:1;letter-spacing:-.02em`)}>Ankuzo</div>
        <div style={css(`margin-top:14px;font-size:12px;letter-spacing:.2em;text-transform:uppercase`)}>в поиске TeamSpeak</div>
      </div>
      <div style={css(`position:absolute;left:50%;bottom:clamp(60px,12vh,130px);transform:translateX(-50%);text-align:center;opacity:calc(var(--p)*2.2 - .9)`)}>
        <button type="button" className="copy-btn" onClick={copyTs} style={css(`background:transparent;border:1px solid rgba(241,240,238,.45);color:#f6f5f3;font-family:'Archivo',sans-serif;font-size:12px;letter-spacing:.18em;text-transform:uppercase;padding:14px 30px;cursor:pointer;transition:background 300ms,border-color 300ms`)}>{tsLabel}</button>
        <div style={css(`margin-top:16px;font-size:12px;color:rgba(241,240,238,.42)`)}>
          <a href="https://tmspk.gg/3Vi7A7Y9" style={css(`color:rgba(241,240,238,.55);text-decoration:none;letter-spacing:.04em`)}>tmspk.gg/3Vi7A7Y9</a>
        </div>
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
