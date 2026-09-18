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

const FALLBACK_GENRES: GenreSlice[] = [
  { label: "Шутеры", color: "#2eb7c9", percent: 42 },
  { label: "Экшен", color: "#7ed56f", percent: 18 },
  { label: "Приключения", color: "#8b7cf7", percent: 14 },
  { label: "RPG", color: "#f0a14a", percent: 10 },
  { label: "Стратегии", color: "#f071a3", percent: 8 },
  { label: "Другое", color: "#9aa7b4", percent: 8 },
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
    const weight = game.hours > 0 ? game.hours : 1;
    const index = GENRE_RULES.findIndex((rule) => rule.test(game.title));
    if (index >= 0) hours[index] += weight;
    else other += weight;
  }

  const total = hours.reduce((sum, value) => sum + value, 0) + other;
  if (total <= 0) return FALLBACK_GENRES;

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
  return slices.length > 0 ? slices : FALLBACK_GENRES;
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

function eloPoints(elo: number) {
  const factors = [0.71, 0.735, 0.72, 0.78, 0.81, 0.865, 0.9, 0.96, 1];
  return factors.map((factor) => elo * factor);
}

function EloChart({ elo }: { elo: number }) {
  const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен"];
  const values = eloPoints(elo);
  const width = 340;
  const height = 92;
  const padX = 6;
  const padY = 10;
  const min = Math.min(...values) * 0.97;
  const max = Math.max(...values);
  const points = values.map((value, index) => {
    const x = padX + (index * (width - padX * 2)) / (values.length - 1);
    const y = height - padY - ((value - min) / Math.max(max - min, 1)) * (height - padY * 2);
    return { x, y };
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const area = `${line} L${last.x.toFixed(1)},${height} L${points[0].x.toFixed(1)},${height} Z`;

  return (
    <div className={styles.chart}>
      <svg viewBox={`0 0 ${width} ${height + 16}`} aria-hidden>
        <path d={area} className={styles.chartFill} />
        <path d={line} className={styles.chartLine} />
        <circle cx={last.x} cy={last.y} r="3.2" className={styles.chartDot} />
        <text x={last.x - 4} y={Math.max(12, last.y - 8)} className={styles.chartElo} textAnchor="end">
          {formatNum(elo)}
        </text>
        {points.map((point, index) => (
          <text key={months[index]} x={point.x} y={height + 12} className={styles.chartMonth} textAnchor="middle">
            {months[index]}
          </text>
        ))}
      </svg>
    </div>
  );
}

function coverUrl(image: string) {
  const match = image.match(/\/apps\/(\d+)\//);
  if (!match) return image;
  return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${match[1]}/library_hero.jpg`;
}

function FavCard({ game, rank }: { game: Game; rank: number }) {
  const art = coverUrl(game.image);
  return (
    <article className={styles.fav}>
      <div className={styles.favArt}>
        <GameArtwork className={styles.favImage} src={art} title={game.title} />
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
          {formatHours(hours)}
        </span>
      </div>
    </article>
  );
}

export function StatsPage() {
  const { mostPlayed, recentlyPlayed, archiveGames, archiveStats, playerStats, activity, sources } = useLiveData();
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

  const pcBar = 100;
  const psBar =
    playerStats.psHours > 0
      ? (playerStats.psHours / Math.max(playerStats.pcHours, playerStats.psHours, 1)) * 100
      : (archiveStats.ps5Count / Math.max(archiveStats.pcCount + archiveStats.ps5Count, 1)) * 100;
  const psValue = playerStats.psHours > 0 ? formatHours(playerStats.psHours) : `${playerStats.psGames} игр`;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.kicker}>ANKUZO.ONLINE</p>
          <div className={styles.ankuzoSlot}>
            <img className={styles.ankuzoMark} src="/images/ankuzo.png" alt="ANKUZO" draggable={false} />
          </div>
          <p className={styles.scriptPlay}>
            play
            <br />
            analyze
            <br />
            improve
            <br />
            repeat
            <span>+</span>
          </p>
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

      <DataFreshness sources={sources} />

      <section className={styles.layout}>
        <article className={styles.profile}>
          <GameArtwork className={styles.portrait} src={playerStats.avatarUrl} title={playerStats.nickname} />
          <div className={styles.profileShade} />
          <div className={styles.profileCopy}>
            <h2>{playerStats.nickname}</h2>
            <p className={styles.handle}>#22</p>
            <p className={styles.quote}>
              «Дисциплина
              <br />
              Даёт свободу.»
            </p>
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
            <p className={styles.kpiValue}>{formatNum(playerStats.libraryGames)}</p>
            <p className={styles.kpiLabel}>
              ИГР
              <span>В БИБЛИОТЕКЕ</span>
            </p>
          </article>
          <article className={styles.kpi}>
            <FiClock />
            <p className={styles.kpiValue}>{formatHours(playerStats.totalHours)}</p>
            <p className={styles.kpiLabel}>
              ОБЩЕЕ
              <span>ВРЕМЯ В ИГРАХ</span>
            </p>
          </article>
          <article className={styles.kpi}>
            <FiBarChart2 />
            <p className={styles.kpiValue}>{playerStats.activeGames}</p>
            <p className={styles.kpiLabel}>
              АКТИВНЫХ
              <span>ИГР СЕЙЧАС</span>
            </p>
          </article>
          <article className={styles.kpi}>
            <FiAward />
            <p className={styles.kpiValue}>{formatNum(playerStats.achievements)}</p>
            <p className={styles.kpiLabel}>
              ДОСТИЖЕНИЙ
              <span>ПЛАТФОРМ</span>
            </p>
          </article>
        </div>

        <article className={styles.moonCard}>
          <p>
            «Лучшие моменты
            <br />
            ещё впереди.»
            <span>+</span>
          </p>
          <div className={styles.moon} aria-hidden />
        </article>

        <section className={styles.favorites}>
          <div className={styles.panelHead}>
            <a href="#games">
              ЛЮБИМЫЕ ИГРЫ
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
          <div className={styles.favGrid}>
            {favorites.map((game, index) => (
              <FavCard key={game.id} game={game} rank={index + 1} />
            ))}
          </div>
        </section>

        <article className={styles.platforms}>
          <p className={styles.sideTitle}>ПЛАТФОРМЫ</p>
          <div className={styles.barRow}>
            <FiMonitor />
            <div>
              <span>PC</span>
              <i style={{ width: `${pcBar}%` }} />
            </div>
            <b>{formatHours(playerStats.pcHours)}</b>
          </div>
          <div className={styles.barRow}>
            <FaPlaystation />
            <div>
              <span>PlayStation 5</span>
              <i style={{ width: `${Math.max(psBar, 8)}%` }} />
            </div>
            <b>{psValue}</b>
          </div>
        </article>

        <section className={styles.recents}>
          <div className={styles.panelHead}>
            <p>ПОСЛЕДНИЕ ИГРЫ</p>
          </div>
          <div className={styles.recentGrid}>
            {recents.map((game) => (
              <RecentCard key={game.id} game={game} />
            ))}
          </div>
        </section>

        <article className={styles.genres}>
          <p className={styles.sideTitle}>ЖАНРЫ</p>
          <div className={styles.genreBody}>
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
          </div>
        </article>

        <article className={styles.goals}>
          <p>
            SAME GAMES
            <br />
            NEW GOALS
            <span>+</span>
          </p>
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
            <div className={styles.faceitBody}>
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
                <EloChart elo={faceit.elo} />
              </div>
            </div>
          </article>

          <article className={styles.activity}>
            <p className={styles.sideTitle}>НЕДАВНЯЯ АКТИВНОСТЬ</p>
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

        <article className={styles.skyCard}>
          <p>
            good
            <br />
            games
            <br />
            better days <span>+</span>
          </p>
          <svg className={styles.plane} viewBox="0 0 64 24" aria-hidden>
            <path d="M2 18h38l8-6 14 1-14 4 4 5H40l-6-4H2z" />
          </svg>
        </article>
      </section>
    </main>
  );
}
