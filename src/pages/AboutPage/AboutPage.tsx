import { useEffect, useRef, useState } from "react";
import { FaDiscord, FaPlaystation, FaSteam, FaTwitch } from "react-icons/fa";
import {
  IoChevronForward,
  IoCodeSlashOutline,
  IoClose,
  IoFlagOutline,
  IoPersonOutline,
} from "react-icons/io5";
import { FiCpu, FiHeadphones, FiMonitor } from "react-icons/fi";
import { LuKeyboard, LuMouse } from "react-icons/lu";
import {
  aboutFacts,
  aboutHardware,
  aboutInterests,
  aboutIntro,
  aboutPlatforms,
  type AboutPlatformId,
} from "../../data/about";
import { useLiveData } from "../../data/useLiveData";
import { cx } from "../../lib/cx";
import styles from "./AboutPage.module.scss";

const factIcon = {
  person: IoPersonOutline,
  work: IoCodeSlashOutline,
  goals: IoFlagOutline,
} as const;

function YandexMusicMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#FFCC00" />
      <path
        fill="#111"
        d="M8.2 6.4c2.7 1.4 4.6 3.8 5.3 6.7.3-1.8 1.2-3.4 2.6-4.5v9h-1.7V12c-.6 2.4-2.3 4.3-4.6 5.2-2.5-1.2-4.2-3.7-4.2-6.6 0-1.6.5-3.1 1.4-4.3.4-.5.8-.9 1.2-1.3Z"
      />
    </svg>
  );
}

function FaceitMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M12 3.2 20 19.5H4L12 3.2Z" fill="currentColor" />
    </svg>
  );
}

const platformIcon = {
  steam: FaSteam,
  playstation: FaPlaystation,
  faceit: FaceitMark,
  discord: FaDiscord,
  twitch: FaTwitch,
} as const;

const hardwareIcon = {
  cpu: FiCpu,
  gpu: FiMonitor,
  ram: FiCpu,
  monitor: FiMonitor,
  mouse: LuMouse,
  keyboard: LuKeyboard,
  peripherals: FiHeadphones,
  console: FaPlaystation,
} as const;

export function AboutPage() {
  const { profileCards, nowPlaying } = useLiveData();
  const [setupOpen, setSetupOpen] = useState(false);
  const setupDialogRef = useRef<HTMLDialogElement>(null);
  const setupTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = setupDialogRef.current;
    if (!dialog) return;
    if (setupOpen && !dialog.open) dialog.showModal();
    if (!setupOpen && dialog.open) dialog.close();
  }, [setupOpen]);

  const platforms = aboutPlatforms.map((item) => {
    const live = profileCards.find((card) => card.id === item.id);
    if (!live) return item;
    return {
      ...item,
      href: live.href || item.href,
      handle: item.handle,
    };
  });

  return (
    <main className={styles.page} id="about">
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.kicker}>ANKUZO.ONLINE</p>
          <div className={styles.ankuzoSlot}>
            <img className={styles.ankuzoMark} src="/images/ankuzo.png" alt="ANKUZO" draggable={false} />
          </div>
          <p className={styles.subtitle}>больше чем просто игры</p>
        </div>
        <p className={styles.handTop}>
          same person
          <br />
          higher standards
          <span>+</span>
        </p>
      </section>

      <div className={styles.board}>
        <div className={styles.aboutHead}>
          <p className={styles.index}>{aboutIntro.index}</p>
          <h2 className={styles.sectionTitle}>{aboutIntro.title}</h2>
          <p className={styles.caption}>{aboutIntro.caption}</p>
        </div>

        <div className={styles.aboutMain}>
          <p className={styles.bio}>{aboutIntro.bio}</p>
          <div className={styles.facts}>
            {aboutFacts.map((fact) => {
              const Icon = factIcon[fact.icon];
              return (
                <article key={fact.id} className={styles.fact}>
                  <Icon />
                  <p className={styles.factValue}>
                    {fact.value}
                    {fact.unit ? <span>{fact.unit}</span> : null}
                  </p>
                  {fact.detail ? <p className={styles.factDetail}>{fact.detail}</p> : null}
                </article>
              );
            })}
          </div>
        </div>

        <div className={styles.side}>
          <article className={styles.quoteCard}>
            <p>
              «Хорошие игры
              <br />
              делают ярче дни.»
              <span>+</span>
            </p>
            <img src="/images/about/quote.jpg" alt="" />
          </article>

          <article
            className={styles.playground}
            style={{ backgroundImage: "url(/images/about/moon.jpg)" }}
          >
            <p>
              СПОКОЙНЕЕ
              <br />
              УМ
              <br />
              ЯРЧЕ
              <br />
              ПЛОЩАДКА
              <b>+</b>
            </p>
            <span>22</span>
          </article>

          <article className={cx(styles.listen, !nowPlaying.playing && styles.listenIdle)}>
            <p className={styles.listenKicker}>
              <span className={styles.eq} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              {nowPlaying.playing ? "СЕЙЧАС СЛУШАЮ" : "ЯНДЕКС МУЗЫКА"}
              <YandexMusicMark />
            </p>
            <div className={styles.listenBody}>
              {nowPlaying.cover ? <img src={nowPlaying.cover} alt="" /> : <div className={styles.coverFallback} />}
              <div>
                <h3>{nowPlaying.title}</h3>
                <p>{nowPlaying.artist}</p>
                {nowPlaying.playing ? (
                  <>
                    <div className={styles.progress} aria-hidden>
                      <i style={{ width: `${nowPlaying.progress * 100}%` }} />
                    </div>
                    <div className={styles.times}>
                      <span>{nowPlaying.elapsed}</span>
                      <span>{nowPlaying.duration}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </article>
        </div>

        <div className={styles.interestsHead}>
          <p className={styles.index}>/ 02</p>
          <h2 className={styles.sectionTitle}>
            МОИ
            <br />
            ИНТЕРЕСЫ
          </h2>
          <p className={styles.caption}>
            ТО, ЧТО ДЕЛАЕТ
            <br />
            МОИ ДНИ ЯРЧЕ
          </p>
        </div>

        <div className={styles.interestGrid}>
          {aboutInterests.map((item) => (
            <article key={item.id} className={styles.interest}>
              <img src={item.image} alt="" />
              <div className={styles.interestShade} />
              <div className={styles.interestCopy}>
                <h3>{item.title}</h3>
                <p>{item.line}</p>
                <span>{item.note}</span>
              </div>
            </article>
          ))}
        </div>

        <aside className={styles.platformsIntro}>
          <p className={styles.index}>/ 03</p>
          <h2 className={styles.sectionTitle}>
            МОИ
            <br />
            ПЛАТФОРМЫ
          </h2>
          <p className={styles.caption}>
            ВСЕ ВАЖНЫЕ ССЫЛКИ
            <br />
            В ОДНОМ МЕСТЕ
          </p>
          <p className={styles.jacketQuote}>
            «Дисциплина
            <br />
            даёт свободу.»
          </p>
          <a
            className={styles.playstats}
            href="#about"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById("platforms")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          >
            <strong>PLAYSTATS</strong>
            <span>
              ВСЕ ССЫЛКИ
              <IoChevronForward />
            </span>
          </a>
        </aside>

        <div className={styles.platformRow} id="platforms">
          {platforms.map((item) => {
            const Icon = platformIcon[item.id as AboutPlatformId];
            const external = item.href.startsWith("http");
            const content = (
              <>
                <span className={styles.platformIcon}>
                  <Icon />
                </span>
                <span className={styles.platformTitle}>{item.title}</span>
                <span className={styles.platformHandle}>{item.handle}</span>
                {!external && item.id !== "discord" ? <span className={styles.platformStatus}>ссылка скоро</span> : null}
              </>
            );
            return external ? (
              <a key={item.id} className={styles.platform} href={item.href} target="_blank" rel="noreferrer">
                {content}
              </a>
            ) : (
              <div key={item.id} className={cx(styles.platform, styles.platformUnavailable)}>
                {content}
              </div>
            );
          })}
        </div>

        <section className={styles.hardware} id="setup">
          <div className={styles.hardwareHead}>
            <p className={styles.index}>/ 04</p>
            <h2 className={styles.sectionTitle}>МОЁ ЖЕЛЕЗО</h2>
            <p className={styles.caption}>КРАТКО О КОНФИГЕ</p>
          </div>
          <div className={styles.specs}>
            {aboutHardware.map((item) => {
              const Icon = hardwareIcon[item.id as keyof typeof hardwareIcon];
              return (
                <article
                  key={item.id}
                  className={styles.spec}
                >
                  {Icon ? <Icon /> : null}
                  <p>
                    <span>{item.label}</span>
                    <b>{item.value}</b>
                  </p>
                </article>
              );
            })}
          </div>
          <button ref={setupTriggerRef} className={styles.setupBtn} type="button" onClick={() => setSetupOpen(true)}>
            ПОЛНЫЙ СЕТАП
          </button>
        </section>
      </div>

      <p className={styles.handBottom}>
        good
        <br />
        games
        <br />
        better days
        <span>+</span>
      </p>

      <dialog
        ref={setupDialogRef}
        className={styles.modal}
        aria-labelledby="setup-title"
        onCancel={() => setSetupOpen(false)}
        onClose={() => {
          setSetupOpen(false);
          setupTriggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSetupOpen(false);
        }}
      >
          <div className={styles.modalCard}>
            <div className={styles.modalHead}>
              <h3 id="setup-title">Полный сетап</h3>
              <button type="button" aria-label="Закрыть" onClick={() => setSetupOpen(false)} autoFocus>
                <IoClose />
              </button>
            </div>
            <ul>
              {aboutHardware.map((item) => (
                <li key={item.id}>
                  <span>{item.label}</span>
                  <b>{item.value}</b>
                </li>
              ))}
            </ul>
          </div>
      </dialog>
    </main>
  );
}
