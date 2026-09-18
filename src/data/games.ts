export type GameBadgeTone = "playing" | "favorite";
export type GamePlatform = "PC" | "PS5";

export type Game = {
  id: string;
  title: string;
  hours: number;
  rating?: number;
  image: string;
  platform: GamePlatform;
  hours2w?: number;
  lastPlayedLabel?: string;
  badge?: {
    label: string;
    tone: GameBadgeTone;
  };
};

export type ArchiveStats = {
  totalGames: number;
  totalHours: number;
  pcCount: number;
  ps5Count: number;
};

export const games: Game[] = [
  {
    id: "cs2",
    title: "Counter-Strike 2",
    hours: 1240,
    rating: 4.8,
    image: "/images/games/cs2.webp",
    platform: "PC",
    lastPlayedLabel: "СЕГОДНЯ",
    badge: { label: "ИГРАЮ", tone: "playing" },
  },
  {
    id: "apex",
    title: "Apex Legends",
    hours: 420,
    rating: 4.6,
    image: "/images/games/apex.webp",
    platform: "PC",
    lastPlayedLabel: "3 ДНЯ НАЗАД",
    badge: { label: "ЛЮБИМАЯ", tone: "favorite" },
  },
  {
    id: "arena-breakout",
    title: "Arena Breakout",
    hours: 210,
    rating: 4.2,
    image: "/images/games/arena-breakout.webp",
    platform: "PC",
    lastPlayedLabel: "8 ДНЕЙ НАЗАД",
  },
  {
    id: "valorant",
    title: "Valorant",
    hours: 370,
    rating: 4.4,
    image: "/images/games/valorant.webp",
    platform: "PC",
    lastPlayedLabel: "12 ДНЕЙ НАЗАД",
  },
  {
    id: "helldivers-2",
    title: "Helldivers 2",
    hours: 85,
    rating: 4.1,
    image: "/images/games/helldivers-2.webp",
    platform: "PS5",
    lastPlayedLabel: "СЕГОДНЯ",
  },
];

export const fallbackArchive: Game[] = [
  ...games,
  {
    id: "god-of-war",
    title: "God of War",
    hours: 62,
    image: "/images/games/god-of-war.webp",
    platform: "PS5",
    lastPlayedLabel: "3 ДНЯ НАЗАД",
  },
  {
    id: "horizon",
    title: "Horizon Zero Dawn",
    hours: 54,
    image: "/images/games/horizon.webp",
    platform: "PS5",
  },
  {
    id: "re4",
    title: "Resident Evil 4",
    hours: 38,
    image: "/images/games/re4.webp",
    platform: "PS5",
    lastPlayedLabel: "12 ДНЕЙ НАЗАД",
  },
  {
    id: "detroit",
    title: "Detroit: Become Human",
    hours: 27,
    image: "/images/games/detroit.webp",
    platform: "PS5",
    lastPlayedLabel: "20 ДНЕЙ НАЗАД",
  },
  {
    id: "rdr2",
    title: "Red Dead Redemption 2",
    hours: 24,
    image: "/images/games/rdr2.webp",
    platform: "PS5",
  },
];

export const fallbackStats: ArchiveStats = {
  totalGames: 26,
  totalHours: 2450,
  pcCount: 16,
  ps5Count: 10,
};
