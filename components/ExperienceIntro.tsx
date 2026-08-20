const CHAPTER_INDEX = [
  { index: "00", label: "PORTAL" },
  { index: "01", label: "LIBRARY" },
  { index: "02", label: "PLATFORMS" },
  { index: "03", label: "ONLINE" },
  { index: "04", label: "BUILD" },
  { index: "05", label: "22 / END" },
] as const;

const DEFAULT_CAPTION = "АРХИВ ОТКРЫВАЕТСЯ";

export interface ExperienceIntroProps {
  /** Mono caption under the index. Keeps the archive tone instead of a spinner. */
  caption?: string;
  /** Extra line used when the 3D layer failed instead of merely loading. */
  note?: string;
}

/**
 * Static, server-rendered entry screen. It carries the page's only visible
 * <h1> and a real description, so crawlers and screen readers get a meaningful
 * document long before the 3D chunk arrives — and it never locks scroll.
 */
export function ExperienceIntro({ caption = DEFAULT_CAPTION, note }: ExperienceIntroProps) {
  return (
    <main className="experience-shell experience-intro">
      <div className="experience-intro-inner">
        <p className="experience-intro-eyebrow">SILVER / SESSION 22</p>
        <h1 className="experience-intro-title">ANKUZO</h1>
        <p className="experience-intro-lede">
          Игры, технологии и поздний интернет, собранные в одну непрерывную digital-сцену.
          Библиотека, две платформы, ночная сеть и след сборки — один проезд камеры без остановок.
        </p>
        <ul className="experience-intro-index">
          {CHAPTER_INDEX.map((chapter) => (
            <li key={chapter.index}>
              <b>{chapter.index}</b>
              <span>{chapter.label}</span>
            </li>
          ))}
        </ul>
        <p className="experience-intro-status">{caption}</p>
        {note ? (
          <p className="experience-intro-note" role="alert">
            {note}
          </p>
        ) : null}
      </div>
    </main>
  );
}
