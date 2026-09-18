import { useMemo, useState } from "react";
import { FaPlaystation } from "react-icons/fa";
import { FiClock, FiMonitor } from "react-icons/fi";
import { IoChevronDown, IoChevronForward, IoDesktopOutline, IoGameControllerOutline, IoGrid, IoList } from "react-icons/io5";
import { useLiveData } from "../../data/useLiveData";
import type { Game, GamePlatform } from "../../data/games";
import { cx } from "../../lib/cx";
import { DataFreshness } from "../../components/DataFreshness/DataFreshness";
import { GameArtwork } from "../../components/GameArtwork/GameArtwork";
import styles from "./GamesPage.module.scss";

type TileKind = "ranked" | "recent" | "archive";
type FilterId = "all" | GamePlatform;
type SortId = "hours" | "title";
type ViewId = "grid" | "list";

function padRank(rank: number) {
  return String(rank).padStart(2, "0");
}

function GameTile({ game, kind, rank }: { game: Game; kind: TileKind; rank?: number }) {
  return (
    <article className={cx(styles.tile, styles[kind])}>
      <GameArtwork className={styles.art} src={game.image} title={game.title} />
      <div className={styles.shade} />
      {kind === "ranked" && rank != null && <span className={styles.rank}>{padRank(rank)}</span>}
      {kind === "recent" && game.lastPlayedLabel && (
        <span className={styles.when}>{game.lastPlayedLabel}</span>
      )}
      <span className={styles.platform}>{game.platform}</span>
      <div className={styles.meta}>
        <h3 className={styles.gameTitle}>{game.title}</h3>
        {game.hours > 0 && (
          <p className={styles.hours}>
            <FiClock />
            {game.hours} ч
          </p>
        )}
      </div>
    </article>
  );
}

function GameRow({ game }: { game: Game }) {
  return (
    <article className={styles.row}>
      <GameArtwork className={styles.rowArt} src={game.image} title={game.title} />
      <h3 className={styles.rowTitle}>{game.title}</h3>
      <p className={styles.rowHours}>{game.hours > 0 ? `${game.hours} ч` : game.platform}</p>
      <span className={styles.rowPlatform}>{game.platform}</span>
    </article>
  );
}

export function GamesPage() {
  const { mostPlayed, recentlyPlayed, archiveGames, archiveStats, sources } = useLiveData();
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("hours");
  const [view, setView] = useState<ViewId>("grid");
  const [visibleCount, setVisibleCount] = useState(10);

  const sortedGames = useMemo(() => {
    const filtered = archiveGames.filter((game) => (filter === "all" ? true : game.platform === filter));
    return [...filtered]
      .sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title, "ru");
        return b.hours - a.hours || a.title.localeCompare(b.title, "ru");
      });
  }, [archiveGames, filter, sort]);

  const visible = sortedGames.slice(0, visibleCount);

  const pcShare = archiveStats.pcCount / Math.max(archiveStats.pcCount, archiveStats.ps5Count, 1);
  const psShare = archiveStats.ps5Count / Math.max(archiveStats.pcCount, archiveStats.ps5Count, 1);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.kicker}>ANKUZO.ONLINE</p>
          <div className={styles.ankuzoSlot}>
            <img className={styles.ankuzoMark} src="/images/ankuzo.png" alt="ANKUZO" draggable={false} />
          </div>
          <p className={styles.subtitle}>цифровой архив / PC + PlayStation / во что я играл</p>
        </div>

        <div className={styles.heroMid}>
        <div className={styles.stats}>
          <article className={styles.stat}>
            <IoGameControllerOutline className={styles.statIcon} />
            <p className={styles.statValue}>{archiveStats.totalGames}</p>
            <p className={styles.statLabel}>
              ВСЕГО ИГР
              <span>МОЯ КОЛЛЕКЦИЯ</span>
              <span>С 2018 ГОДА</span>
            </p>
          </article>
          <article className={styles.stat}>
            <IoDesktopOutline className={styles.statIcon} />
            <p className={styles.statValue}>
              {archiveStats.totalHours} <em>ч</em>
            </p>
            <p className={styles.statLabel}>
              НАКАТАНО
              <span>ПО ДАННЫМ</span>
              <span>STEAM</span>
            </p>
          </article>
          <article className={cx(styles.stat, styles.statSplit)}>
            <p className={styles.splitRow}>
              <FiMonitor />
              <span>PC</span>
              <strong>{archiveStats.pcCount}</strong>
            </p>
            <p className={styles.splitRow}>
              <FaPlaystation />
              <span>PS5</span>
              <strong>{archiveStats.ps5Count}</strong>
            </p>
            <p className={styles.statLabel}>
              НА КАКИХ
              <span>ПЛАТФОРМАХ</span>
            </p>
          </article>
        </div>

        <div className={styles.heroRight}>
          <p className={styles.handwritten}>
            хорошие
            <br />
            игры делают
            <br />
            дни ярче
            <span>+</span>
          </p>
          <p className={styles.tagline}>
            ИГРЫ
            <br />
            ЭМОЦИИ
            <br />
            ВСЕГДА С СОБОЙ
          </p>
        </div>
        </div>
      </section>

      <DataFreshness sources={sources} />

      <section className={styles.mostSection}>
        <div className={styles.copy}>
          <p className={styles.index}>/ 01</p>
          <h2 className={styles.sectionTitle}>
            БОЛЬШЕ
            <br />
            ВСЕГО ИГРАЛ
          </h2>
          <p className={styles.caption}>
            ИГРЫ, В КОТОРЫЕ Я
            <br />
            ВЛОЖИЛ БОЛЬШЕ ВСЕГО
            <br />
            ВРЕМЕНИ.
          </p>
        </div>
        <div className={styles.mostGrid}>
          {mostPlayed.map((game, index) => (
            <GameTile key={game.id} game={game} kind="ranked" rank={index + 1} />
          ))}
        </div>
      </section>

      <section className={styles.recentSection}>
        <div className={styles.copy}>
          <p className={styles.index}>/ 02</p>
          <h2 className={styles.sectionTitle}>
            НЕДАВНО
            <br />
            ИГРАЛ
          </h2>
          <p className={styles.caption}>
            ПОСЛЕДНИЕ ИГРЫ
            <br />
            В МОЕМ АРХИВЕ.
          </p>
        </div>
        <div className={styles.recentRow}>
          {recentlyPlayed.map((game) => (
            <GameTile key={game.id} game={game} kind="recent" />
          ))}
          <a
            className={styles.seeAll}
            href="#games"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById("archive")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <span className={styles.seeAllBtn} aria-hidden>
              <IoChevronForward />
            </span>
            <span className={styles.seeAllLabel}>
              СМОТРЕТЬ
              <br />
              ВСЕ НЕДАВНИЕ
              <br />
              ИГРЫ
            </span>
          </a>
        </div>
      </section>

      <section className={styles.archiveSection} id="archive">
        <div className={styles.copy}>
          <p className={styles.index}>/ 03</p>
          <h2 className={styles.sectionTitle}>ВЕСЬ АРХИВ</h2>
          <p className={styles.caption}>
            ВСЕ МОИ ИГРЫ
            <br />
            В ОДНОМ МЕСТЕ.
          </p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filters} role="group" aria-label="Фильтр по платформе">
            {(
              [
                ["all", "ВСЕ"],
                ["PC", "PC"],
                ["PS5", "PS5"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                className={cx(styles.filter, filter === id && styles.filterActive)}
                onClick={() => {
                  setFilter(id);
                  setVisibleCount(10);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className={styles.sort}>
            <span className="sr-only">Сортировка архива</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortId);
                setVisibleCount(10);
              }}
            >
              <option value="hours">по времени</option>
              <option value="title">по названию</option>
            </select>
            <IoChevronDown />
          </label>
          <div className={styles.views}>
            <button
              type="button"
              className={cx(styles.viewBtn, view === "grid" && styles.viewActive)}
              aria-label="Сетка"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <IoGrid />
            </button>
            <button
              type="button"
              className={cx(styles.viewBtn, view === "list" && styles.viewActive)}
              aria-label="Список"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <IoList />
            </button>
          </div>
        </div>

        <article className={styles.platforms}>
          <p className={styles.platformsKicker}>МОИ ПЛАТФОРМЫ</p>
          <p className={styles.platformsLead}>В ОДНОМ МЕСТЕ</p>
          <div className={styles.barRow}>
            <FiMonitor />
            <div className={styles.barCopy}>
              <span className={styles.barName}>PC</span>
              <span className={styles.barTrack}>
                <span className={styles.barFill} style={{ width: `${pcShare * 100}%` }} />
              </span>
            </div>
            <b>{archiveStats.pcCount} игр</b>
          </div>
          <div className={styles.barRow}>
            <FaPlaystation />
            <div className={styles.barCopy}>
              <span className={styles.barName}>PlayStation 5</span>
              <span className={styles.barTrack}>
                <span className={styles.barFill} style={{ width: `${psShare * 100}%` }} />
              </span>
            </div>
            <b>{archiveStats.ps5Count} игр</b>
          </div>
          <p className={styles.platformsNote}>
            одни платформы
            <br />
            одни эмоции
          </p>
        </article>

        <div className={styles.results}>
          {view === "grid" ? (
            <div className={styles.archiveGrid}>
              {visible.map((game) => (
                <GameTile key={game.id} game={game} kind="archive" />
              ))}
            </div>
          ) : (
            <div className={styles.archiveList}>
              {visible.map((game) => (
                <GameRow key={game.id} game={game} />
              ))}
            </div>
          )}
          {sortedGames.length === 0 && <p className={styles.empty}>В этой категории пока нет игр.</p>}
          {visibleCount < sortedGames.length && (
            <button
              className={styles.loadMore}
              type="button"
              onClick={() => setVisibleCount((count) => Math.min(count + 10, sortedGames.length))}
            >
              Показать ещё <span>{sortedGames.length - visibleCount}</span>
            </button>
          )}
          <p className={styles.resultCount} aria-live="polite">
            Показано {Math.min(visibleCount, sortedGames.length)} из {sortedGames.length}
          </p>
        </div>
      </section>
    </main>
  );
}
