import { IoArrowForward } from "react-icons/io5";
import styles from "./Hero.module.scss";

export function Hero() {
  return (
    <section className={styles.hero} id="home">
      <div className={styles.left}>
        <p className={styles.kicker}>ANKUZO.ONLINE</p>
        <div className={styles.ankuzoSlot}>
          <img
            className={styles.ankuzoMark}
            src="/images/ankuzo.png"
            alt="ANKUZO"
            draggable={false}
          />
        </div>
        <p className={styles.subtitle}>цифровой архив / игры / я</p>
        <div className={styles.ctaRow}>
          <a className={styles.explore} href="#games">
            <span>СМОТРЕТЬ АРХИВ</span>
            <span className={styles.exploreIcon} aria-hidden>
              <IoArrowForward />
            </span>
          </a>
          <p className={styles.stack}>
            <span>ИГРАЙ</span>
            <span>СЛЕДИ</span>
            <span>РАСТИ</span>
            <span>ПОВТОРЯЙ</span>
          </p>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.twentySlot}>
          <img
            className={styles.twentyMark}
            src="/images/22.png"
            alt="22"
            draggable={false}
          />
        </div>
        <p className={styles.handwritten}>
          то же
          <br />
          но лучше
          <br />
          <span>+</span>
        </p>
        <p className={styles.tagline}>
          ХОРОШИЕ ИГРЫ
          <br />
          ЯРЧЕ ДНИ
        </p>
      </div>
    </section>
  );
}
