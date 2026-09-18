export type NavItem = {
  id: string;
  label: string;
  href: string;
};

export const navItems: NavItem[] = [
  { id: "home", label: "ГЛАВНАЯ", href: "#home" },
  { id: "games", label: "ИГРЫ", href: "#games" },
  { id: "stats", label: "СТАТЫ", href: "#stats" },
  { id: "about", label: "ОБО МНЕ", href: "#about" },
  { id: "links", label: "ССЫЛКИ", href: "#about/platforms" },
];

export type SocialLink = {
  id: "discord" | "steam" | "github";
  href: string;
  label: string;
};

export const headerSocials: SocialLink[] = [
  { id: "discord", href: "#discord", label: "Discord" },
  { id: "steam", href: "#steam", label: "Steam" },
  { id: "github", href: "https://github.com/todylovv", label: "GitHub" },
];

export type ProfileCardData = {
  id: string;
  title: string;
  subtitle: string;
  icon: "steam" | "faceit" | "discord" | "teamspeak";
  href: string;
};

export const profileCards: ProfileCardData[] = [
  {
    id: "steam",
    title: "Steam",
    subtitle: "nußac",
    icon: "steam",
    href: "#steam",
  },
  {
    id: "faceit",
    title: "FACEIT",
    subtitle: "10 уровень",
    icon: "faceit",
    href: "#faceit",
  },
  {
    id: "discord",
    title: "Discord",
    subtitle: "Толкование молодости",
    icon: "discord",
    href: "#discord",
  },
  {
    id: "teamspeak",
    title: "TeamSpeak",
    subtitle: "Ankuzo",
    icon: "teamspeak",
    href: "https://tmspk.gg/3Vi7A7Y9",
  },
];
