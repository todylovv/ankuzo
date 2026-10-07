import { useMemo, useState } from "react";
import { FaPlaystation } from "react-icons/fa";
import { FiAward, FiBarChart2, FiClock, FiMonitor } from "react-icons/fi";
import { IoArrowForward, IoChevronDown, IoChevronForward, IoGameControllerOutline, IoPlay } from "react-icons/io5";
import type { Game } from "../../data/games";
import { useLiveData } from "../../data/useLiveData";
import { cx } from "../../lib/cx";
import { DataFreshness } from "../../components/DataFreshness/DataFreshness";
import { GameArtwork } from "../../components/GameArtwork/GameArtwork";
import styles from "./StatsPage.module.scss";

type SortId = "hours" | "title";

type GenreSlice = {
  label: string;
  color: string;
  percent: number;
};

const GENRE_RULES: Array<{ label: string; color: string; test: (title: string) => boolean }> = [
  {
    label: "Шутеры",
    color: "#2eb7c9",
    test: (title) =>
      /counter-strike|cs2|valorant|apex|call of duty|battlefield|overwatch|destiny|doom|quake|rainbow|hunt|breakout|pubg|rust|dayz|arc raiders|tarkov|halo|fortnite|warface|insurgency|ready or not|left 4 dead|payday/i.test(
        title,
      ),
  },
  {
    label: "Экшен",
    color: "#7ed56f",
    test: (title) =>
      /helldivers|god of war|sekiro|souls|elden|devil may|bayonetta|spider|batman|uncharted|last of us|horizon|ghost of|gta|red dead|assassin|resident evil|stellar blade/i.test(
        title,
      ),
  },
  {
    label: "Приключения",
    color: "#8b7cf7",
    test: (title) =>
      /adventure|zelda|tomb raider|unravel|firewatch|life is strange|detroit|until dawn|walking dead|heavy rain|sea of thieves/i.test(
        title,
      ),
  },
  {
    label: "RPG",
    color: "#f0a14a",
    test: (title) =>
      /witcher|skyrim|fallout|cyberpunk|divinity|baldur|persona|final fantasy|dragon age|mass effect|diablo|path of exile|nioh|monster hunter|elderscrolls|kingdom come/i.test(
        title,
      ),
  },
  {
    label: "Стратегии",
    color: "#f071a3",
    test: (title) =>
      /civilization|stellaris|total war|age of empires|starcraft|warcraft|dota|league of|company of heroes|xcom|frostpunk|cities|simcity|rts|strategy/i.test(
        title,
      ),
  },
];

function formatNum(value: number) {
  return Math.round(value).toLocaleString("ru-RU");
}

function formatHours(value: number) {
  return `${formatNum(value)} ч`;
}

function prettyWhen(label?: string) {
  if (!label) return "";
  const text = label.toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function genresFrom(games: Game[]): GenreSlice[] {
  const hours = Array(GENRE_RULES.length).fill(0) as number[];
  let other = 0;

  for (const game of games) {
    if (game.platform !== "PC" || game.hours <= 0) continue;
    const weight = game.hours;
    const index = GENRE_RULES.findIndex((rule) => rule.test(game.title));
    if (index >= 0) hours[index] += weight;
    else other += weight;
  }

  const total = hours.reduce((sum, value) => sum + value, 0) + other;
  if (total <= 0) return [];

  const slices = [
    ...GENRE_RULES.map((rule, index) => ({
      label: rule.label,
      color: rule.color,
      percent: Math.round((hours[index] / total) * 100),
    })),
    { label: "Другое", color: "#9aa7b4", percent: Math.round((other / total) * 100) },
  ].filter((slice) => slice.percent > 0);

  const drift = 100 - slices.reduce((sum, slice) => sum + slice.percent, 0);
  if (slices[0]) slices[0].percent += drift;
  return slices;
}

function conic(slices: GenreSlice[]) {
  let cursor = 0;
  return slices
    .map((slice) => {
      const start = cursor;
      cursor += slice.percent;
      return `${slice.color} ${start}% ${cursor}%`;
    })
    .join(", ");
}

function EloChart({ peaks }: { peaks: { label: string; elo: number }[] }) {
  if (peaks.length < 2) return <p className={styles.dataNote}>История ELO пока недоступна{peaks[0] ? ` · пик ${peaks[0].label.toLowerCase()}: ${formatNum(peaks[0].elo)}` : ""}.</p>;
  const min = Math.min(...peaks.map((point) => point.elo)) - 50;
  const max = Math.max(...peaks.map((point) => point.elo)) + 50;
  const points = peaks.map((point, index) => ({
    ...point, x: 24 + index * 292 / (peaks.length - 1), y: 80 - (point.elo - min) / (max - min) * 60,
  }));
  return <div className={styles.chart}>
    <p className={styles.dataNote}>Пиковый ELO по сезонам</p>
    <svg viewBox="0 0 340 112" role="img" aria-label={peaks.map((point) => `${point.label}: ${point.elo} ELO`).join(", ")}>
      <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} className={styles.chartLine} />
      {points.map((point) => <g key={point.label}>
        <circle cx={point.x} cy={point.y} r="3" className={styles.chartDot} />
        <text x={point.x} y={point.y - 8} textAnchor="middle" className={styles.chartElo}>{formatNum(point.elo)}</text>
        <text x={point.x} y="108" textAnchor="middle" className={styles.chartMonth}>{point.label}</text>
      </g>)}
    </svg>
  </div>;
}

function FavCard({ game, rank }: { game: Game; rank: number }) {
  return (
    <article className={styles.fav}>
      <div className={styles.favArt}>
        <GameArtwork className={styles.favImage} src={game.image} title={game.title} />
        <span className={styles.rankBadge}>{rank}</span>
      </div>
      <p className={styles.favHours}>{formatHours(game.hours)}</p>
      <h3 className={styles.favTitle}>{game.title}</h3>
    </article>
  );
}

function RecentCard({ game }: { game: Game }) {
  const hours = game.hours2w && game.hours2w > 0 ? game.hours2w : game.hours;
  return (
    <article className={styles.recent}>
      <GameArtwork className={styles.recentArt} src={game.image} title={game.title} />
      <div className={styles.recentCopy}>
        <h3>{game.title}</h3>
        <p>{prettyWhen(game.lastPlayedLabel)}</p>
        <span>
          <IoPlay />
          {formatHours(hours)}{game.hours2w ? " за 2 недели" : " всего"}
        </span>
      </div>
    </article>
  );
}

export function StatsPage() {
  const { mostPlayed, recentlyPlayed, archiveGames, archiveStats, playerStats, activity, sources, loading } = useLiveData();
  const [sort, setSort] = useState<SortId>("hours");
  const { faceit } = playerStats;

  const favorites = useMemo(() => {
    const list = [...mostPlayed];
    list.sort((a, b) => (sort === "title" ? a.title.localeCompare(b.title, "ru") : b.hours - a.hours));
    return list.slice(0, 5);
  }, [mostPlayed, sort]);

  const recents = recentlyPlayed.slice(0, 5);
  const genres = useMemo(() => genresFrom(archiveGames), [archiveGames]);
  const pie = conic(genres);

  const largestLibrary = Math.max(archiveStats.pcCount, archiveStats.ps5Count, 1);
  const pcBar = archiveStats.pcCount / largestLibrary * 100;
  const psBar = archiveStats.ps5Count / largestLibrary * 100;
  const available = (id: string) => !loading && sources.some((source) => source.id === id && source.hasData);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.kicker}>ANKUZO.ONLINE</p>
          <div className={styles.ankuzoSlot}>
            <img className={styles.ankuzoMark} src="/images/ankuzo.png" alt="ANKUZO" draggable={false} />
          </div>
          <p className={styles.crumb}>МОЯ СТАТИСТИКА / ИГРЫ / ПРОГРЕСС</p>
        </div>
        <div className={styles.heroRight}>
          <p className={styles.scriptMore}>
            больше чем
            <br />
            просто
            <br />
            игра <span>+</span>
          </p>
          <img className={styles.twentyMark} src="/images/22.png" alt="22" draggable={false} />
        </div>
      </section>

      <DataFreshness sources={sources} loading={loading} />

      <section className={styles.layout}>
        <article className={styles.profile}>
          <GameArtwork className={styles.portrait} src={playerStats.avatarUrl} fallbackSrc="/images/portrait.svg" title={playerStats.nickname} />
          <div className={styles.profileShade} />
          <div className={styles.profileCopy}>
            <h2>{playerStats.nickname}</h2>
            <p className={styles.handle}>#22</p>
            <a className={styles.profileBtn} href={playerStats.profileUrl} target="_blank" rel="noreferrer">
              Профиль
              <span>
                <IoArrowForward />
              </span>
            </a>
          </div>
        </article>

        <div className={styles.kpis}>
          <article className={styles.kpi}>
            <IoGameControllerOutline />
            <p className={styles.kpiValue}>{available("steam") || available("psn") ? formatNum(playerStats.libraryGames) : "—"}</p>
            <p className={styles.kpiLabel}>
              ИГР
              <span>В БИБЛИОТЕКЕ</span>
            </p>
          </article>
          <article className={styles.kpi}>
            <FiClock />
            <p className={styles.kpiValue}>{available("steam") ? formatHours(playerStats.totalHours) : "—"}</p>
            <p className={styles.kpiLabel}>
              ЧАСОВ
              <span>В STEAM</span>
            </p>
          </article>
          <article className={styles.kpi}>
            <FiBarChart2 />
            <p className={styles.kpiValue}>{available("steam") ? playerStats.activeGames : "—"}</p>
            <p className={styles.kpiLabel}>
              ИГР
              <span>ЗА 2 НЕДЕЛИ</span>
            </p>
          </article>
          <article className={styles.kpi}>
            <FiAward />
            <p className={styles.kpiValue}>{available("psn") ? formatNum(playerStats.achievements) : "—"}</p>
            <p className={styles.kpiLabel}>
              ТРОФЕЕВ
              <span>PLAYSTATION</span>
            </p>
          </article>
        </div>

        <section className={styles.favorites}>
          <div className={styles.panelHead}>
            <a href="#games">
              БОЛЬШЕ ВСЕГО ИГРАЛ
              <IoChevronForward />
            </a>
            <label className={styles.sort}>
              <span className="sr-only">Сортировка любимых игр</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortId)}>
                <option value="hours">По времени</option>
                <option value="title">По названию</option>
              </select>
              <IoChevronDown />
            </label>
          </div>
          {favorites.length === 0 && <p className={styles.dataNote}>Пока нет данных о времени в играх.</p>}
          <div className={styles.favGrid}>
            {favorites.map((game, index) => (
              <FavCard key={game.id} game={game} rank={index + 1} />
            ))}
          </div>
        </section>

        <article className={styles.platforms}>
          <p className={styles.sideTitle}>ИГРЫ ПО ПЛАТФОРМАМ</p>
          <div className={styles.barRow}>
            <FiMonitor />
            <div>
              <span>PC</span>
              <i style={{ width: `${pcBar}%` }} />
            </div>
            <b>{archiveStats.pcCount} игр</b>
          </div>
          <div className={styles.barRow}>
            <FaPlaystation />
            <div>
              <span>PlayStation 5</span>
              <i style={{ width: `${psBar}%` }} />
            </div>
            <b>{archiveStats.ps5Count} игр</b>
          </div>
        </article>

        <section className={styles.recents}>
          <div className={styles.panelHead}>
            <p>ИГРЫ ЗА 2 НЕДЕЛИ</p>
          </div>
          {recents.length === 0 && <p className={styles.dataNote}>В снимке Steam нет игр за последние 2 недели.</p>}
          <div className={styles.recentGrid}>
            {recents.map((game) => (
              <RecentCard key={game.id} game={game} />
            ))}
          </div>
        </section>

        <article className={styles.genres}>
          <p className={styles.sideTitle}>ЖАНРЫ В STEAM</p>
          <p className={styles.dataNote}>Оценка по названиям · доля времени</p>
          {genres.length > 0 ? <div className={styles.genreBody}>
            <div className={styles.pie} style={{ background: `conic-gradient(${pie})` }} />
            <ul>
              {genres.map((genre) => (
                <li key={genre.label}>
                  <i style={{ background: genre.color }} />
                  <span>{genre.label}</span>
                  <b>{genre.percent}%</b>
                </li>
              ))}
            </ul>
          </div> : <p className={styles.dataNote}>Недостаточно данных о времени в играх.</p>}
        </article>

        <div className={styles.board}>
          <article className={styles.faceit}>
            <div className={styles.faceitHead}>
              <span className={styles.csMark} aria-hidden>
                CS
              </span>
              <div>
                <h3>COUNTER-STRIKE 2</h3>
                <p>FACEIT</p>
              </div>
            </div>
            {available("faceit") ? <div className={styles.faceitBody}>
              <div className={styles.level}>
                <img
                  className={styles.levelIcon}
                  src={`/images/faceit/skill_level_${Math.min(10, Math.max(1, faceit.level))}.png?v=lg`}
                  alt={`FACEIT уровень ${faceit.level}`}
                />
                <p>LEVEL</p>
                <b>{formatNum(faceit.elo)}</b>
                <span>ELO</span>
              </div>
              <div className={styles.faceitMain}>
                <div className={styles.faceitStats}>
                  <p>
                    <b>{formatNum(faceit.matches)}</b>
                    <span>МАТЧЕЙ</span>
                  </p>
                  <p>
                    <b>{faceit.winRate}%</b>
                    <span>WINRATE</span>
                  </p>
                  <p>
                    <b>{faceit.kd.toFixed(2)}</b>
                    <span>K/D</span>
                  </p>
                  <p>
                    <b>{Number.isInteger(faceit.adr) ? faceit.adr : faceit.adr.toFixed(1)}</b>
                    <span>ADR</span>
                  </p>
                  <p>
                    <b>{faceit.hs}%</b>
                    <span>HS</span>
                  </p>
                </div>
                <EloChart peaks={faceit.seasonPeaks} />
              </div>
            </div> : <p className={styles.dataNote}>Данные FACEIT сейчас недоступны.</p>}
          </article>

          <article className={styles.activity}>
            <p className={styles.sideTitle}>СВОДКА ИСТОЧНИКОВ</p>
            <p className={styles.dataNote}>Даты относятся к снимкам данных.</p>
            <ul>
              {activity.length === 0 ? (
                <li>
                  <div>
                    <p>Пока нет свежих событий</p>
                    <span>Данные подтянутся из Steam и FACEIT</span>
                  </div>
                </li>
              ) : (
                activity.map((item) => (
                  <li key={item.id}>
                    <i className={cx(styles.dot, styles[`tone_${item.tone}`])} />
                    <div>
                      <p>{item.title}</p>
                      <span>{item.when}</span>
                    </div>
                    {item.extra ? <b className={styles[`tone_${item.tone}`]}>{item.extra}</b> : null}
                  </li>
                ))
              )}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
