export const aboutIntro = {
  title: "Обо мне",
  bio: "Занимаюсь кибербезопасностью, анализом больших данных и ИИ. Делаю свои проекты и собираю здесь игры, код, идеи и личный прогресс.",
};

export const aboutFacts = [
  { id: "age", text: "25 лет" },
  { id: "work", text: "Данные / ИИ" },
  { id: "goals", text: "Развитие и свобода" },
] as const;

export const aboutInterests = [
  {
    id: "games",
    image: "/images/about/games.jpg",
    title: "Игры",
    line: "PC / PlayStation",
    note: "Соревновательные и сюжетные",
  },
  {
    id: "tech",
    image: "/images/about/tech.jpg",
    title: "Технологии",
    line: "Python, SQL, Java, Flutter, AI",
    note: "Backend и свои проекты",
  },
  {
    id: "visual",
    image: "/images/about/visual.jpg",
    title: "Визуал",
    line: "Дизайн, 3D, фото",
    note: "Эстетика и стиль",
  },
  {
    id: "freedom",
    image: "/images/about/freedom.jpg",
    title: "Свобода",
    line: "Путешествия",
    note: "Новые места. Новые впечатления",
  },
];

export type AboutPlatformId =
  | "steam"
  | "playstation"
  | "faceit"
  | "discord"
  | "twitch";

export const aboutPlatforms: Array<{
  id: AboutPlatformId;
  title: string;
  handle: string;
  href: string;
}> = [
  { id: "steam", title: "Steam", handle: "nußac", href: "https://steamcommunity.com/profiles/76561199770575251/" },
  { id: "playstation", title: "PlayStation", handle: "ankkui", href: "" },
  { id: "faceit", title: "FACEIT", handle: "nuBac", href: "https://www.faceit.com/ru/players/nuBac" },
  { id: "discord", title: "Discord", handle: "ankuz0", href: "#discord" },
  { id: "twitch", title: "Twitch", handle: "ankuzo", href: "https://www.twitch.tv/ankuzo" },
];
