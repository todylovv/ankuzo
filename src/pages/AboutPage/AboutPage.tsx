import { FaDiscord, FaPlaystation, FaSteam, FaTwitch } from "react-icons/fa";
import { FiArrowUpRight, FiBarChart2, FiSend } from "react-icons/fi";
import { LuCake } from "react-icons/lu";
import { SiFaceit } from "react-icons/si";
import { aboutFacts, aboutInterests, aboutIntro, aboutPlatforms } from "../../data/about";
import { useLiveData } from "../../data/useLiveData";
import styles from "./AboutPage.module.scss";

function YandexMusicMark() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="m16 0 2 10 7-7-4 10 11-1-9 6 8 6-11-2 1 10-5-9-5 9 1-11-11 3 8-7-9-5 11 1L7 3l7 8Z" /></svg>;
}

const platformIcon = {
  steam: FaSteam,
  playstation: FaPlaystation,
  faceit: SiFaceit,
  discord: FaDiscord,
  twitch: FaTwitch,
} as const;
const factIcon = { age: LuCake, work: FiBarChart2, goals: FiSend } as const;

export function AboutPage() {
  const { profileCards, nowPlaying } = useLiveData();
  const platforms = aboutPlatforms.map((item) => {
    const live = profileCards.find((card) => card.id === item.id);
    return { ...item, href: live?.href || item.href };
  });

  return (
    <main className={styles.page} id="about">
      <div className={styles.masthead}>
        <img src="/images/ankuzo.png" alt="ANKUZO" width="980" height="234" draggable={false} />
      </div>

      <div className={styles.sheet}>
        <section className={styles.intro} aria-labelledby="about-title">
          <h2 id="about-title" className={styles.title}>{aboutIntro.title}</h2>
          <p className={styles.bio}>{aboutIntro.bio}</p>
          <ul className={styles.facts} aria-label="Коротко обо мне">
            {aboutFacts.map((fact) => {
              const Icon = factIcon[fact.id];
              return <li key={fact.id}><Icon aria-hidden="true" /><span>{fact.text}</span></li>;
            })}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="interests-title">
          <h2 id="interests-title" className={styles.sectionTitle}>Интересы</h2>
          <div className={styles.interests}>
            {aboutInterests.map((item) => (
              <article key={item.id} className={styles.interest}>
                <img src={item.image} alt="" width="480" height="270" loading="lazy" decoding="async" />
                <h3>{item.title}</h3>
                <p>{item.line}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="platforms" aria-labelledby="platforms-title">
          <h2 id="platforms-title" className={styles.sectionTitle}>Мои платформы</h2>
          <div className={styles.platforms}>
            {platforms.map((item) => {
              const Icon = platformIcon[item.id];
              const external = item.href.startsWith("https://") || item.href.startsWith("http://");
              const content = <>
                <Icon className={styles.platformIcon} aria-hidden="true" />
                <span className={styles.platformCopy}><span>{item.title}</span><strong>{item.handle}</strong></span>
                {external && <FiArrowUpRight className={styles.external} aria-hidden="true" />}
              </>;
              return external ? (
                <a key={item.id} className={styles.platform} href={item.href} target="_blank" rel="noreferrer">
                  {content}
                </a>
              ) : <div key={item.id} className={styles.platform}>{content}</div>;
            })}
          </div>
        </section>

        <aside className={styles.music} aria-label="Яндекс Музыка">
          <span className={styles.musicIcon} aria-hidden="true"><YandexMusicMark /></span>
          <strong>Яндекс Музыка</strong>
          <span className={styles.musicTrack}>
            {nowPlaying.playing ? `${nowPlaying.title} — ${nowPlaying.artist}` : nowPlaying.title}
          </span>
          {nowPlaying.playing && nowPlaying.cover && <img src={nowPlaying.cover} alt="" width="36" height="36" />}
        </aside>
      </div>
    </main>
  );
}
