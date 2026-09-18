import { IoArrowForward } from "react-icons/io5";
import { useLiveData } from "../../data/useLiveData";
import { ProfileCard } from "../ProfileCard/ProfileCard";
import { QuoteCard } from "../QuoteCard/QuoteCard";
import { useOptionalAsset } from "../../hooks/useOptionalAsset";
import { cx } from "../../lib/cx";
import styles from "./AboutSection.module.scss";

const PLAYGROUND_SRC = "/images/playground.webp";

export function AboutSection() {
  const hasPlayground = useOptionalAsset("playground");
  const { profileCards } = useLiveData();

  return (
    <section className={styles.section} id="about">
      <QuoteCard />

      <div className={styles.about}>
        <p className={styles.index}>/ 02</p>
        <h2 className={styles.title}>ОБО МНЕ</h2>
        <p className={styles.body}>
          25. Кибербезопасность,
          <br />
          анализ больших данных и ИИ.
          <br />
          Всегда становлюсь лучше.
        </p>
        <a className={styles.more} href="#about">
          ЕЩЁ
          <IoArrowForward />
        </a>
      </div>

      {profileCards.map((card) => (
        <ProfileCard key={card.id} card={card} />
      ))}

      <article
        className={cx(styles.playground, hasPlayground && styles.playgroundImage)}
        style={hasPlayground ? { backgroundImage: `url(${PLAYGROUND_SRC})` } : undefined}
      >
        <p>
          СПОКОЙНЕЕ
          <br />
          УМ
          <br />
          ЯРЧЕ
          <br />
          ПЛОЩАДКА
        </p>
      </article>
    </section>
  );
}
