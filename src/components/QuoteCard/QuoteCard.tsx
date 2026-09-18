import { useOptionalAsset } from "../../hooks/useOptionalAsset";
import styles from "./QuoteCard.module.scss";

const PORTRAIT_SRC = "/images/portrait.webp";

export function QuoteCard() {
  const hasPortrait = useOptionalAsset("portrait");

  return (
    <article className={styles.card}>
      <div className={styles.copy}>
        <p className={styles.quote}>
          «Дисциплина
          <br />
          даёт свободу.»
        </p>
        <span className={styles.sign}>22</span>
      </div>
      <div
        className={styles.portrait}
        style={{
          backgroundImage: `url(${hasPortrait ? PORTRAIT_SRC : "/images/portrait.svg"})`,
        }}
        aria-hidden
      />
    </article>
  );
}
