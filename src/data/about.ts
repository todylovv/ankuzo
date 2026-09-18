export const aboutIntro = {
  index: "/ 01",
  title: "ОБО МНЕ",
  caption: "ЧЕЛОВЕК, КОТОРЫЙ ЛЮБИТ ИГРЫ, ТЕХНОЛОГИИ И ДЕЛАТЬ ЧТО-ТО СВОЁ",
  bio: "Привет, я Александр — ANKUZO. Занимаюсь кибербезопасностью, анализом больших данных и ИИ, делаю свои проекты. Здесь я собираю всё, что мне интересно: игры, код, идеи и личный прогресс.",
};

export const aboutFacts = [
  {
    id: "age",
    icon: "person" as const,
    value: "25",
    unit: "ЛЕТ",
    detail: "",
  },
  {
    id: "work",
    icon: "work" as const,
    value: "Кибер",
    unit: "Данные / ИИ",
    detail: "Анализ и свои проекты",
  },
  {
    id: "goals",
    icon: "goals" as const,
    value: "Цели",
    unit: "",
    detail: "Развитие, свобода, сильное окружение",
  },
];

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
  { id: "playstation", title: "PlayStation", handle: "nußac", href: "https://www.playstation.com/" },
  { id: "faceit", title: "FACEIT", handle: "nußac", href: "https://www.faceit.com/ru/players/nuBac" },
  { id: "discord", title: "Discord", handle: "ankuz0", href: "#discord" },
  { id: "twitch", title: "Twitch", handle: "ankuzo", href: "https://www.twitch.tv/ankuzo" },
];

export const aboutHardware = [
  { id: "cpu", label: "CPU", value: "Ryzen 5 5600" },
  { id: "gpu", label: "GPU", value: "RTX 3070 Ti" },
  { id: "ram", label: "RAM", value: "32 GB 3200 MHz" },
  { id: "monitor", label: "Мониторы", value: "2× 165 Hz" },
  { id: "mouse", label: "Мышь", value: "Superlight" },
  { id: "keyboard", label: "Клавиатура", value: "Магнитная" },
  { id: "peripherals", label: "Периферия", value: "HyperX Cloud 3 / FIFINE SC3 / AMBT" },
  { id: "console", label: "Консоль", value: "PlayStation 5" },
];
