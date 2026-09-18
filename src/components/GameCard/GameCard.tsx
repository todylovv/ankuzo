import { FaStar } from "react-icons/fa";
import { FiClock } from "react-icons/fi";
import type { Game } from "../../data/games";
import { cx } from "../../lib/cx";
import { GameArtwork } from "../GameArtwork/GameArtwork";
import styles from "./GameCard.module.scss";

type Props = {
  game: Game;
};

export function GameCard({ game }: Props) {
  return (
    <article className={styles.card}>
      <GameArtwork className={styles.art} src={game.image} title={game.title} />
      <div className={styles.shade} />
      {game.badge && (
        <span className={cx(styles.badge, styles[game.badge.tone])}>{game.badge.label}</span>
      )}
      <div className={styles.meta}>
        <h3 className={styles.title}>{game.title}</h3>
        <div className={styles.stats}>
          <span>
            <FiClock />
            {game.hours} ч
          </span>
          {game.rating != null && (
            <span>
              <FaStar />
              {game.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
