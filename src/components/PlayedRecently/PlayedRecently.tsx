import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { useLiveData } from "../../data/useLiveData";
import { GameCard } from "../GameCard/GameCard";
import styles from "./PlayedRecently.module.scss";

export function PlayedRecently() {
  const { games } = useLiveData();
  const trackRef = useRef<HTMLDivElement>(null);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.72, 180),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <section className={styles.section} id="games">
      <div className={styles.copy}>
        <p className={styles.index}>/ 01</p>
        <h2 className={styles.title}>
          ИГРАЛ
          <br />
          НЕДАВНО
        </h2>
        <p className={styles.caption}>
          ИГРЫ ДЕЛАЮТ
          <br />
          НАС ЛУЧШЕ.
        </p>
      </div>

      <div className={styles.trackWrap}>
        <div className={styles.track} ref={trackRef}>
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.control} aria-label="Прокрутить игры назад" onClick={() => move(-1)}>
            <IoChevronBack />
          </button>
          <button type="button" className={styles.control} aria-label="Прокрутить игры вперёд" onClick={() => move(1)}>
            <IoChevronForward />
          </button>
        </div>
      </div>
    </section>
  );
}
import { useRef } from "react";
