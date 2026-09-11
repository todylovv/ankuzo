import { useState, type Ref } from "react";
import { css } from "./css";
import { GameStill } from "./GameStill";
import { SilkField } from "./SilkField";
import type { ArchiveLive, CreditGame, PsnStill, RecentGame, SteamPerson } from "./useArchiveData";

type ArchiveProps = {
  rootRef: Ref<HTMLDivElement>;
  tsLabel: string;
  copyTs: () => void;
  live: ArchiveLive;
};

function trophiesWord(value: number): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "трофеев";
  if (last === 1) return "трофей";
  if (last >= 2 && last <= 4) return "трофея";
  return "трофеев";
}

function hoursWord(value: number): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "часов";
  if (last === 1) return "час";
  if (last >= 2 && last <= 4) return "часа";
  return "часов";
}

function steamHoursCopy(count: number, topGame: string): string {
  const rest = `Больше всего времени — в ${topGame}.`;
  if (count === 2) return `Сумма двух аккаунтов. ${rest}`;
  if (count > 1) return `Сумма аккаунтов. ${rest}`;
  return rest;
}

type SteamPeopleProps = {
  people: SteamPerson[];
};

function SteamPeople({ people }: SteamPeopleProps) {
  if (people.length === 0) return null;
  return (
    <div style={css(`display:flex;flex-wrap:wrap;align-items:center;gap:22px 40px`)}>
      {people.map((person) => (
        <a
          key={person.url}
          className="steam-face"
          href={person.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${person.nick} в Steam, ${person.status}`}
        >
          <span className="steam-face-photo">
            {person.avatar ? (
              <img src={person.avatar} alt="" width={96} height={96} decoding="async" referrerPolicy="no-referrer" />
            ) : (
              <span>{person.nick.slice(0, 1)}</span>
            )}
          </span>
          <span>
            <span className="steam-face-nick">{person.nick}</span>
            <span className={person.online ? "steam-face-status is-on" : "steam-face-status"}>
              <span className="steam-face-dot" />
              {person.status}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}

function SteamMark({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#f6f5f3" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-9.87 8.21l5.38 2.22a2.9 2.9 0 0 1 1.62-.49c.22 0 .43.03.64.08l2.91-4.22v-.06A3.54 3.54 0 1 1 16.3 12l-4.15 3.04c0 .1-.01.2-.01.3a2.91 2.91 0 0 1-2.9 2.91 2.94 2.94 0 0 1-2.83-2.15L1.3 13.5A10 10 0 1 0 12 2zm-4.4 13.46.92.38a2.18 2.18 0 0 0 2.8-1.24 2.18 2.18 0 0 0-1.24-2.8l-.95-.4 2.36 1.84a1.74 1.74 0 1 1-1.7 2.95l-2.2-.73zM16.3 11.2a2.36 2.36 0 1 0-2.17-3.47 2.36 2.36 0 0 0 2.17 3.47z" />
    </svg>
  );
}

function PsnMark({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.28)} viewBox="0 0 88 22" fill="none" aria-hidden="true">
      <path d="M11 2.2 19.4 18.4H14.7L11 11.6 7.3 18.4H2.6L11 2.2z" fill="#f6f5f3" />
      <circle cx="33" cy="11" r="8.2" stroke="#f6f5f3" strokeWidth="1.6" />
      <path d="M50.2 4.4 61.8 17.6M61.8 4.4 50.2 17.6" stroke="#f6f5f3" strokeWidth="1.6" />
      <rect x="70.4" y="3.6" width="14.8" height="14.8" stroke="#f6f5f3" strokeWidth="1.6" />
    </svg>
  );
}

function TsMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#f6f5f3" aria-hidden="true">
      <path d="M12 3.2A7.8 7.8 0 0 0 4.2 11v3.4c0 .9.7 1.6 1.6 1.6H8v-4.4H6.2A5.8 5.8 0 0 1 12 5.8a5.8 5.8 0 0 1 5.8 5.8H16v4.4h2.2c.9 0 1.6-.7 1.6-1.6V11A7.8 7.8 0 0 0 12 3.2zM8 13.2v5.1c0 1 .8 1.8 1.8 1.8h.7V13.2H8zm5.5 0v6.9h.7c1 0 1.8-.8 1.8-1.8v-5.1h-2.5z" />
    </svg>
  );
}

type CreditLook = {
  pad: string;
  size: string;
  name: string;
  hours: string;
};

const CREDIT_LOOK: CreditLook[] = [
  { pad: "0", size: "clamp(22px,3.06vw,51px)", name: "#f6f5f3", hours: "rgba(246,245,243,.92)" },
  { pad: "clamp(0px,6vw,120px)", size: "clamp(20px,2.72vw,44px)", name: "#f6f5f3", hours: "rgba(246,245,243,.86)" },
  { pad: "0", size: "clamp(19px,2.47vw,39px)", name: "#f6f5f3", hours: "rgba(246,245,243,.82)" },
  { pad: "clamp(0px,10vw,200px)", size: "clamp(17px,2.13vw,34px)", name: "rgba(246,245,243,.92)", hours: "rgba(246,245,243,.78)" },
  { pad: "0", size: "clamp(15px,1.79vw,29px)", name: "rgba(246,245,243,.86)", hours: "rgba(246,245,243,.72)" },
  { pad: "clamp(0px,14vw,280px)", size: "clamp(14px,1.62vw,26px)", name: "rgba(246,245,243,.8)", hours: "rgba(246,245,243,.66)" },
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
  { id: "ts", background: "radial-gradient(18% 64% at 50% 50%,rgba(255,255,255,.34) 0%,rgba(255,255,255,0) 72%),radial-gradient(72% 40% at 50% 100%,#1a1a1a 0%,rgba(26,26,26,0) 70%),#050505" },
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

const CREDIT_EDGE = "1px solid rgba(241,240,238,.16)";
const MUTED = `font-size:clamp(15px,1.5vw,22px);color:rgba(241,240,238,.5)`;

function CreditRow({ game, index, last }: CreditRowProps) {
  const look = CREDIT_LOOK[Math.min(index, CREDIT_LOOK.length - 1)];
  const edge = last ? `border-bottom:${CREDIT_EDGE};` : "";
  return (
    <div
      style={css(
        `display:flex;align-items:center;justify-content:space-between;gap:24px;padding:clamp(12px,2vh,22px) 0 clamp(12px,2vh,22px) ${look.pad};border-top:${CREDIT_EDGE};${edge}`,
      )}
    >
      <span style={css(`display:flex;align-items:center;gap:clamp(12px,2vw,22px);min-width:0`)}>
        <span style={css(`position:relative;display:block;width:44px;height:63px;flex:none;overflow:hidden;background:#141414`)}>
          <GameStill art={game.art} kind="poster" position="center center" fill />
        </span>
        <span style={css(`font-weight:500;font-size:${look.size};line-height:1;color:${look.name}`)}>{game.name}</span>
      </span>
      <span style={css(`font-size:${look.size};line-height:1;color:${look.hours}`)}>{game.hours}</span>
    </div>
  );
}

const SLIDE = `position:relative;width:80vw;height:100%;flex:none;display:flex`;
const TITLE = `margin:0;font-weight:500;color:#f6f5f3;text-shadow:0 12px 40px rgba(0,0,0,.55)`;
const SLIDE_NAME = `${TITLE};font-size:clamp(22px,3.2vw,40px);line-height:1.05;letter-spacing:-.02em`;
const SLIDE_HOURS = `font-size:clamp(18px,2.1vw,30px);line-height:1;color:#f6f5f3`;

function GhostName({ name }: { name: string }) {
  return (
    <div aria-hidden="true" style={css(`position:absolute;inset:0;overflow:hidden;pointer-events:none`)}>
      <div
        style={css(
          `position:absolute;left:clamp(16px,3vw,48px);top:18%;font-size:clamp(32px,7vw,88px);line-height:.8;letter-spacing:-.04em;color:rgba(246,245,243,.06);white-space:nowrap;text-transform:lowercase`,
        )}
      >
        {name}
      </div>
    </div>
  );
}

type RecentSlideProps = {
  game: RecentGame;
  index: number;
};

function RecentSlide({ game, index }: RecentSlideProps) {
  switch (index) {
    case 0:
      return (
        <article style={css(`${SLIDE};align-items:center;justify-content:center`)}>
          <GhostName name={game.name} />
          <div style={css(`position:relative;z-index:2;width:min(58vw,720px);padding:12vh 0 12vh`)}>
            <GameStill art={game.art} kind="wide" />
            <div style={css(`margin-top:20px;display:flex;justify-content:space-between;align-items:flex-end;gap:32px`)}>
              <h3 style={css(SLIDE_NAME)}>{game.name}</h3>
              <div style={css(`text-align:right;flex:none`)}>
                <div style={css(SLIDE_HOURS)}>{game.hours}</div>
                <div style={css(`font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.42);margin-top:6px`)}>{game.meta}</div>
              </div>
            </div>
          </div>
        </article>
      );
    case 1:
      return (
        <article style={css(`${SLIDE};align-items:center;justify-content:flex-end`)}>
          <GhostName name={game.name} />
          <div style={css(`position:absolute;left:clamp(24px,5vw,80px);top:50%;width:min(48vw,640px);transform:translateY(-50%)`)}>
            <GameStill art={game.art} kind="wide" />
          </div>
          <div style={css(`position:relative;z-index:2;padding:0 clamp(24px,5vw,80px);max-width:34vw`)}>
            <div style={css(`max-width:26ch;font-size:13px;line-height:1.6;color:rgba(241,240,238,.5)`)}>{game.meta}</div>
            <h3 style={css(`${SLIDE_NAME};text-align:right;margin-top:18px`)}>
              {game.name}
              <span style={css(`display:block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.42);margin-top:14px`)}>{game.hours}</span>
            </h3>
          </div>
        </article>
      );
    case 2:
      return (
        <article style={css(`${SLIDE};align-items:center;justify-content:flex-start`)}>
          <GhostName name={game.name} />
          <div style={css(`position:relative;z-index:2;width:min(52vw,680px);margin-left:clamp(24px,5vw,80px);padding:12vh 0 12vh`)}>
            <GameStill art={game.art} kind="wide" />
            <h3 style={css(`${SLIDE_NAME};margin-top:20px`)}>{game.name}</h3>
            <div style={css(`margin-top:10px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.44)`)}>{game.hours} · {game.meta}</div>
          </div>
        </article>
      );
    case 3:
      return (
        <article style={css(`${SLIDE};align-items:center;justify-content:center`)}>
          <GhostName name={game.name} />
          <div style={css(`position:relative;z-index:2;width:min(50vw,660px);text-align:center;padding:12vh 0 12vh`)}>
            <GameStill art={game.art} kind="wide" />
            <h3 style={css(`${SLIDE_NAME};margin-top:20px`)}>{game.name}</h3>
            <div style={css(`margin-top:10px;font-size:13px;line-height:1.6;color:rgba(241,240,238,.5)`)}>{game.hours} · {game.meta}</div>
          </div>
        </article>
      );
    default: {
      const space = game.name.indexOf(" ");
      const first = space === -1 ? game.name : game.name.slice(0, space);
      const second = space === -1 ? "" : game.name.slice(space + 1);
      return (
        <article style={css(`${SLIDE};align-items:center;justify-content:flex-start`)}>
          <GhostName name={game.name} />
          <div style={css(`position:absolute;right:clamp(24px,5vw,80px);top:16vh;width:min(28vw,380px)`)}>
            <GameStill art={game.art} kind="poster" />
          </div>
          <div style={css(`position:relative;z-index:2;padding:0 clamp(24px,5vw,80px);max-width:44vw`)}>
            <h3 style={css(SLIDE_NAME)}>
              {first}
              {second ? (
                <>
                  <br />
                  <span style={css(`color:rgba(246,245,243,.72)`)}>{second}</span>
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

type TrophyKind = "platinum" | "gold" | "silver" | "bronze";

const TROPHY_FILL: Record<TrophyKind, string> = {
  platinum: "#e8e8ea",
  gold: "#d4b15a",
  silver: "#c4c4c6",
  bronze: "#c0844a",
};

function TrophyMark({ kind, size = 22 }: { kind: TrophyKind; size?: number }) {
  const fill = TROPHY_FILL[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {kind === "platinum" ? (
        <path d="M12 1.6 12.85 4.1 15.4 3.4 14.2 5.7 16.6 7.1 14 7.2 13.6 9.8 12 7.8 10.4 9.8 10 7.2 7.4 7.1 9.8 5.7 8.6 3.4 11.15 4.1 12 1.6Z" fill={fill} />
      ) : null}
      <path
        d="M7.2 5.2h9.6v1.1h1.7V7c0 2.35-1.55 4.35-3.75 5.05l-.55.18V14.4h2.3V16H7.5v-1.6h2.3v-2.07l-.55-.18C7.05 11.35 5.5 9.35 5.5 7V6.3h1.7V5.2Zm1.6 1.2V7.6H7.1c.25 1.35 1.15 2.5 2.4 3.05V6.4H8.8Zm6.5 0v4.25c1.25-.55 2.15-1.7 2.4-3.05h-1.7V6.4h-.7Z"
        fill={fill}
      />
      <path d="M9.2 17.2h5.6V18.8H9.2z" fill={fill} opacity="0.85" />
    </svg>
  );
}

type PsnStatProps = {
  value: number;
  label: string;
  kind: TrophyKind;
};

function PsnStat({ value, label, kind }: PsnStatProps) {
  return (
    <div>
      <TrophyMark kind={kind} />
      <div style={css(`margin-top:8px;font-weight:500;font-size:clamp(22px,3.2vw,40px);line-height:.86;letter-spacing:-.03em;color:${TROPHY_FILL[kind]};font-variant-numeric:tabular-nums`)}>{value}</div>
      <div style={css(`margin-top:8px;font-size:11px;letter-spacing:.04em;color:rgba(241,240,238,.38)`)}>{label}</div>
    </div>
  );
}

const PSN_PREVIEW = 6;

type PsnLibraryProps = {
  games: PsnStill[];
};

function PsnLibrary({ games }: PsnLibraryProps) {
  const [open, setOpen] = useState(false);
  const shown = open ? games : games.slice(0, PSN_PREVIEW);
  const extra = Math.max(0, games.length - PSN_PREVIEW);

  return (
    <div style={css(`margin-top:clamp(28px,5vh,48px)`)}>
      <div style={css(`display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:20px`)}>
        <div style={css(MUTED)}>
          коллекция · {games.length}
        </div>
        {extra > 0 ? (
          <button
            type="button"
            className="quiet-toggle"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "свернуть" : `ещё ${extra}`}
          </button>
        ) : null}
      </div>
      <div style={css(`display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,92px));gap:clamp(12px,1.8vw,22px) clamp(10px,1.4vw,18px)`)}>
        {shown.map((game) => (
          <div key={game.title}>
            <div style={css(`position:relative;width:100%;aspect-ratio:2 / 3;overflow:hidden;background:#101010`)}>
              <GameStill art={game.art} kind="poster" position="center center" fill />
            </div>
            {open ? (
              <div style={css(`margin-top:8px;font-size:11px;line-height:1.35;color:rgba(246,245,243,.5)`)}>{game.title}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Archive({ rootRef, tsLabel, copyTs, live }: ArchiveProps) {
  return (
    <div ref={rootRef} data-archive="" style={css(`--silk-light:0;--wipe-b:0;--discord-p:0;position:relative;background:#090909;overflow-x:clip;font-family:'Onest',system-ui,sans-serif`)}>

  <div aria-hidden="true" style={css(`position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden`)}>
    {PLATES.map((plate) => (
      <div key={plate.id} data-plate={plate.id} style={css(plateStyle(plate))} />
    ))}
    <div style={css(`position:absolute;inset:0;background:radial-gradient(122% 92% at 50% 50%,rgba(9,9,9,0) 32%,rgba(9,9,9,.78) 100%)`)} />
    <div style={css(`position:absolute;inset:0;background:#eeedea;transform:scaleY(var(--wipe-b,0));transform-origin:50% 50%`)} />
    <div style={css(`position:absolute;left:50%;top:50%;width:140vmax;height:140vmax;margin:-70vmax;border-radius:50%;background:#eeedea;transform:scale(var(--discord-p,0));transform-origin:50% 50%`)} />
  </div>
  <SilkField />

  <section data-scene="hero" data-chapter="hero" data-static="0" style={css(`--p:0;--b:0;position:relative;z-index:2;height:260vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div className="hero-title">
        <div style={css(`position:relative;opacity:calc(1 - var(--p)*1.15)`)}>
          <div aria-hidden="true" style={css(`visibility:hidden;white-space:nowrap`)}>ankuzo</div>
          <div style={css(`position:absolute;inset:0;display:flex`)}>
            <div style={css(`width:50%;overflow:hidden;transform:translate3d(calc(var(--p)*-52vw),0,0)`)}>
              <div style={css(`width:200%;white-space:nowrap`)}>ankuzo</div>
            </div>
            <div style={css(`width:50%;overflow:hidden;transform:translate3d(calc(var(--p)*52vw),0,0)`)}>
              <div style={css(`width:200%;margin-left:-100%;white-space:nowrap`)}>ankuzo</div>
            </div>
          </div>
        </div>
        <p style={css(`margin:.22em 0 0;font-size:clamp(15px,1.6vw,24px);letter-spacing:.02em;color:rgba(241,240,238,.6);white-space:nowrap;text-align:center;opacity:calc(1 - var(--p)*2.6);transform:translate3d(0,calc(var(--p)*-3vh),0)`)}>личный игровой архив</p>
      </div>
      <div style={css(`position:absolute;left:0;right:0;bottom:0;z-index:2;padding:0 clamp(20px,4vw,56px) clamp(24px,4vh,44px);transform:translate3d(0,calc(var(--p)*8vh),0);opacity:calc(1 - var(--p)*2)`)}>
        <div style={css(`font-size:13px;line-height:1.5;color:rgba(241,240,238,.5);max-width:38ch`)}>Восемнадцать лет в чужих мирах, сведённые на одну страницу.</div>
      </div>
      <div style={css(`position:absolute;left:50%;bottom:clamp(70px,11vh,120px);z-index:2;transform:translateX(-50%);opacity:calc(.65 - var(--p)*3)`)}>
        <div className="hero-prompt">пройти насквозь</div>
      </div>
    </div>
  </section>

  {live.playing ? <section data-scene="now" data-chapter="now" data-static="0.6" style={css(`--p:0;position:relative;z-index:2;height:250vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <GhostName name={live.nowName} />
      <div style={css(`position:absolute;top:12vh;right:clamp(24px,5vw,80px);width:min(30vw,400px);z-index:1;transform:translate3d(0,calc((1 - var(--p))*6vh),0)`)}>
        <GameStill art={live.nowArt} kind="poster" eager />
      </div>
      <div style={css(`position:absolute;left:clamp(20px,4.5vw,72px);top:22vh;z-index:2;max-width:min(46vw,640px);transform:translate3d(0,calc((1 - var(--p))*9vh),0);opacity:calc(.15 + var(--p)*1.5)`)}>
        <div style={css(`font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#f6f5f3;display:flex;align-items:center;gap:10px`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:#f6f5f3;display:inline-block`)}></span>{live.nowLabel}</div>
        <h2 style={css(`margin:14px 0 0;font-weight:500;font-size:clamp(42px,6.8vw,120px);line-height:.9;letter-spacing:-.04em;color:#f6f5f3;text-shadow:0 18px 50px rgba(0,0,0,.55)`)}>
          {live.nowName}
          {live.nowSub ? (
            <>
              <br />
              <span style={css(`font-weight:400;color:rgba(246,245,243,.66)`)}>{live.nowSub}</span>
            </>
          ) : null}
        </h2>
      </div>
      <div style={css(`position:absolute;left:clamp(20px,4.5vw,72px);bottom:clamp(28px,7vh,72px);z-index:2;display:flex;flex-wrap:wrap;align-items:flex-end;gap:clamp(20px,4vw,64px);transform:translate3d(calc((1 - var(--p))*-4vw),0,0);opacity:calc(var(--p)*1.4 - .2)`)}>
        <div><div style={css(`font-weight:500;font-size:clamp(52px,7vw,104px);line-height:.8;color:#f6f5f3`)}>{live.monthHours}</div><div style={css(`font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(241,240,238,.45);margin-top:8px`)}>{hoursWord(live.monthHours)} за две недели</div></div>
        <div style={css(`font-size:13px;line-height:1.6;color:rgba(241,240,238,.52);max-width:34ch`)}>PC · Steam. Часы за последние две недели по двум аккаунтам.</div>
      </div>
    </div>
  </section> : null}

  <section data-scene="recent" data-chapter="recent0" data-static="0" style={css(`--p:0;position:relative;z-index:2;height:500vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div style={css(`position:absolute;top:clamp(22px,4vh,44px);left:clamp(20px,4.5vw,72px);z-index:3;${MUTED}`)}>последние две недели</div>
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
      <div style={css(`position:absolute;inset:0;display:grid;place-items:center;opacity:calc(var(--b,0)*1.6 - .5)`)}>
        <div style={css(`font-weight:500;font-size:clamp(36px,6.4vw,104px);line-height:.92;letter-spacing:-.04em;color:#0b0b0b;text-align:center`)}>восемнадцать лет<br /><span style={css(`font-weight:400`)}>в одной библиотеке</span></div>
      </div>
    </div>
  </section>

  <section data-scene="steam" data-chapter="steam" data-static="1" style={css(`--p:0;position:relative;z-index:2;padding:12vh clamp(20px,4.5vw,72px) 16vh`)}>
    <div style={css(`display:flex;align-items:center;gap:14px`)}>
      <SteamMark size={36} />
      <span style={css(`font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:rgba(241,240,238,.55)`)}>Steam</span>
    </div>
    <div style={css(`display:flex;flex-wrap:wrap;align-items:flex-end;gap:clamp(16px,3vw,48px);margin-top:clamp(14px,2.4vh,28px)`)}>
      <div style={css(`font-weight:500;font-size:clamp(65px,12.6vw,180px);line-height:.74;letter-spacing:-.05em;color:#f6f5f3;font-variant-numeric:tabular-nums`)}>{live.steamHours}</div>
      <div style={css(`padding-bottom:8px`)}>
        <div style={css(`font-size:clamp(20px,2.7vw,43px);line-height:1;color:rgba(246,245,243,.86)`)}>{hoursWord(live.steamHours)} на Steam</div>
        <div style={css(`margin-top:10px;max-width:42ch;font-size:13px;line-height:1.6;color:rgba(241,240,238,.5)`)}>
          {steamHoursCopy(live.steamPeople.length, live.topGame)}
        </div>
        <div style={css(`margin-top:8px;font-size:12px;letter-spacing:.06em;color:rgba(241,240,238,.42)`)}>{live.steamGames} игр</div>
      </div>
    </div>
    <div style={css(`margin-top:clamp(28px,4.2vh,44px)`)}>
      <SteamPeople people={live.steamPeople} />
    </div>
    <div style={css(`${MUTED};margin:clamp(28px,5vh,52px) 0 clamp(8px,1.6vh,16px)`)}>всё, что осталось в часах</div>
    <div style={css(`display:flex;flex-direction:column`)}>
      {live.credits.map((game, index) => (
        <CreditRow key={game.name} game={game} index={index} last={index === live.credits.length - 1} />
      ))}
    </div>
  </section>

  <section data-scene="psn" data-chapter="psn" data-static="0.6" style={css(`--p:0;position:relative;z-index:2;padding:10vh clamp(20px,4.5vw,72px) 14vh`)}>
    <div style={css(`margin-bottom:8px`)}>
      <PsnMark size={88} />
    </div>
    <div style={css(`font-weight:500;font-size:clamp(42px,6.2vw,96px);line-height:.9;letter-spacing:-.04em;color:#f6f5f3`)}>PlayStation</div>
    <div style={css(`margin-top:10px;font-size:13px;color:rgba(241,240,238,.42)`)}>{live.psnId} · уровень {live.psnLevel}</div>
    <p style={css(`margin:clamp(22px,3.6vh,36px) 0 clamp(36px,6vh,64px);font-size:13px;line-height:1.75;color:rgba(241,240,238,.5);max-width:min(44ch,90vw)`)}>Консоль стоит в комнате, где нет рабочего стола. Поэтому здесь другие игры — те, которые я прохожу целиком, а не запускаю на двадцать минут.</p>

    <div style={css(`display:flex;flex-wrap:wrap;align-items:flex-end;gap:clamp(20px,3.4vw,48px);padding-bottom:clamp(28px,5vh,48px);border-bottom:1px solid rgba(241,240,238,.14)`)}>
      <div>
        <div style={css(`font-weight:500;font-size:clamp(64px,11vw,168px);line-height:.74;letter-spacing:-.05em;color:#f6f5f3;font-variant-numeric:tabular-nums`)}>{live.psnTotal}</div>
        <div style={css(`margin-top:10px;font-size:clamp(18px,2.2vw,32px);color:rgba(246,245,243,.72)`)}>{trophiesWord(live.psnTotal)}</div>
      </div>
      <div style={css(`display:flex;flex-wrap:wrap;gap:clamp(16px,2.6vw,36px);padding-bottom:6px`)}>
        <PsnStat value={live.psnPlatinum} label="платин" kind="platinum" />
        <PsnStat value={live.psnGold} label="золотых" kind="gold" />
        <PsnStat value={live.psnSilver} label="серебряных" kind="silver" />
        <PsnStat value={live.psnBronze} label="бронзовых" kind="bronze" />
      </div>
    </div>

    {live.psnStills.length > 0 ? <PsnLibrary games={live.psnStills} /> : null}
  </section>

  <section data-scene="discord" data-chapter="discord" data-static="0.7" style={css(`--p:0;--b:1;position:relative;z-index:2;height:230vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      {live.discordBanner ? (
        <div
          aria-hidden="true"
          style={css(
            `position:absolute;left:8%;right:18%;top:12%;height:28vh;opacity:calc(var(--b,0)*1.4 - .35);overflow:hidden;mask-image:linear-gradient(180deg,#000 0%,transparent 100%)`,
          )}
        >
          <img src={live.discordBanner} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) contrast(1.05)", opacity: 0.28 }} />
        </div>
      ) : null}
      <div style={css(`position:absolute;inset:0;display:flex;align-items:center;padding:0 clamp(20px,4.5vw,72px);opacity:calc(var(--b,0)*1.85 - .4)`)}>
        <div style={css(`max-width:min(58ch,90vw);margin-left:clamp(0px,8vw,180px)`)}>
          <div style={css(`display:flex;align-items:center;gap:22px`)}>
            <div style={css(`position:relative;width:96px;height:96px;flex:none`)}>
              <div style={css(`width:76px;height:76px;margin:10px;border-radius:50%;overflow:hidden;background:repeating-linear-gradient(120deg,rgba(0,0,0,.07) 0 2px,rgba(0,0,0,0) 2px 9px),linear-gradient(150deg,#c9c8c5,#8c8b88)`)}>
                {live.discordAvatar ? <img src={live.discordAvatar} alt="" width={76} height={76} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              </div>
              {live.discordDecoration ? (
                <img src={live.discordDecoration} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
              ) : null}
            </div>
            <div>
              <div style={css(`font-weight:500;font-size:clamp(26px,3.2vw,52px);line-height:1.05;color:#0b0b0b`)}>{live.discordDisplay}</div>
              <div style={css(`margin-top:6px;font-size:13px;letter-spacing:.04em;color:rgba(11,11,11,.5)`)}>@{live.discordName}</div>
              <div style={css(`margin-top:8px;display:flex;align-items:center;gap:9px;font-size:12px;letter-spacing:.1em;color:rgba(11,11,11,.6)`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:#0b0b0b;display:inline-block`)}></span>{live.discordStatus}</div>
            </div>
          </div>
          {live.discordBadges.length > 0 ? (
            <div style={css(`margin-top:22px;display:flex;flex-wrap:wrap;gap:8px 18px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(11,11,11,.42)`)}>
              {live.discordBadges.map((badge) => (
                <span key={badge}>{badge}</span>
              ))}
            </div>
          ) : null}
          {live.discordBio ? (
            <p style={css(`margin:22px 0 0;font-size:14px;line-height:1.7;color:rgba(11,11,11,.62);max-width:46ch`)}>{live.discordBio}</p>
          ) : null}
          <p style={css(`margin:clamp(22px,4vh,40px) 0 0;font-weight:500;font-size:clamp(20px,2.4vw,38px);line-height:1.28;color:#0b0b0b`)}>Вопросы есть — пиши сюда.</p>
          <p style={css(`margin:18px 0 0;font-size:13px;line-height:1.75;color:rgba(11,11,11,.62);max-width:46ch`)}>
            Играю один. Голос в TeamSpeak: в поиске{" "}
            <span style={css(`color:#0b0b0b`)}>Ankuzo</span>, или по ссылке{" "}
            <a href="https://tmspk.gg/3Vi7A7Y9" style={css(`color:#0b0b0b;text-decoration:underline;text-underline-offset:3px`)}>tmspk.gg/3Vi7A7Y9</a>.
          </p>
        </div>
      </div>
    </div>
  </section>

  <section data-scene="ts" data-chapter="ts" data-static="1" style={css(`--p:0;position:relative;z-index:2;height:140vh`)}>
    <div data-sticky="" style={css(`position:sticky;top:0;height:100vh;overflow:hidden`)}>
      <div
        aria-hidden="true"
        style={css(
          `position:absolute;left:50%;top:8vh;bottom:28vh;width:1px;transform:translateX(-50%) scaleY(calc(.2 + var(--p)*.8));transform-origin:50% 0;background:linear-gradient(180deg,rgba(246,245,243,0),rgba(246,245,243,.5) 12%,rgba(246,245,243,.22) 100%)`,
        )}
      />
      <div style={css(`position:relative;z-index:2;padding:clamp(28px,8vh,72px) 24px 0;text-align:center;color:#f6f5f3;opacity:calc(.45 + var(--p)*.55)`)}>
        <div style={css(`display:flex;align-items:center;justify-content:center;gap:12px`)}>
          <TsMark size={36} />
          <span style={css(`font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:rgba(241,240,238,.7)`)}>TeamSpeak</span>
        </div>
        <div style={css(`margin-top:clamp(14px,2.4vh,22px);font-size:clamp(16px,1.8vw,24px);color:rgba(241,240,238,.55)`)}>последняя комната</div>
        <div style={css(`margin-top:8px;font-weight:500;font-size:clamp(36px,6vw,72px);line-height:.9;letter-spacing:-.04em`)}>Ankuzo</div>
        <div style={css(`margin-top:10px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(241,240,238,.48)`)}>в поиске сервера</div>
        <div style={css(`margin-top:clamp(22px,4vh,36px)`)}>
          <button type="button" className="copy-btn" onClick={copyTs} style={css(`background:transparent;border:1px solid rgba(241,240,238,.45);color:#f6f5f3;font-size:12px;letter-spacing:.18em;text-transform:uppercase;padding:12px 26px;cursor:pointer;transition:background 300ms,border-color 300ms`)}>{tsLabel}</button>
          <div style={css(`margin-top:12px;font-size:12px;color:rgba(241,240,238,.42)`)}>
            <a href="https://tmspk.gg/3Vi7A7Y9" style={css(`color:rgba(241,240,238,.55);text-decoration:none;letter-spacing:.04em`)}>tmspk.gg/3Vi7A7Y9</a>
          </div>
        </div>
      </div>
      <div style={css(`position:absolute;left:0;right:0;bottom:0;z-index:2;transform:translate3d(0,calc((1 - var(--p))*6vh),0)`)}>
        <div style={css(`padding:0 clamp(20px,4.5vw,72px);font-size:clamp(17px,2vw,30px);color:rgba(246,245,243,.62);margin-bottom:clamp(12px,2.2vh,22px)`)}>увидимся в голосовом</div>
        <div
          className="glitch"
          style={css(
            `position:relative;font-weight:500;font-size:clamp(80px,18vw,280px);line-height:.78;letter-spacing:-.06em;color:#f6f5f3;padding:0 clamp(20px,4.5vw,72px) clamp(10px,1.6vh,22px);margin-bottom:-.04em`,
          )}
        >
          <span className="glitch-word">ankuzo</span>
          <span className="glitch-word glitch-cut glitch-cut-a" aria-hidden="true">ankuzo</span>
          <span className="glitch-word glitch-cut glitch-cut-b" aria-hidden="true">ankuzo</span>
        </div>
      </div>
    </div>
  </section>

</div>
  );
}
