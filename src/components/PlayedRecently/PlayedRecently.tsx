import { useEffect, useRef, useState } from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { useLiveData } from "../../data/useLiveData";
import { GameCard } from "../GameCard/GameCard";
import styles from "./PlayedRecently.module.scss";

export function PlayedRecently() {
  const { recentlyPlayed: games, loading } = useLiveData();
  const trackRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ back: false, forward: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => setPosition({ back: track.scrollLeft > 1, forward: track.scrollLeft + track.clientWidth < track.scrollWidth - 1 });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    track.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); track.removeEventListener("scroll", update); };
  }, [games]);

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
          {games[0]?.lastPlayedLabel || "За 2 недели по снимку Steam"}
        </p>
      </div>

      <div className={styles.trackWrap}>
        <div className={styles.track} ref={trackRef}>
          {games.length === 0 && <p className={styles.empty}>{loading ? "Загрузка игр…" : "В снимке Steam нет игр за последние 2 недели."}</p>}
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
        {(position.back || position.forward) && <div className={styles.controls}>
          <button type="button" className={styles.control} disabled={!position.back} aria-label="Прокрутить игры назад" onClick={() => move(-1)}>
            <IoChevronBack />
          </button>
          <button type="button" className={styles.control} disabled={!position.forward} aria-label="Прокрутить игры вперёд" onClick={() => move(1)}>
            <IoChevronForward />
          </button>
        </div>}
      </div>
    </section>
  );
}
