import { FaDiscord, FaSteam, FaTeamspeak } from "react-icons/fa";
import type { ProfileCardData } from "../../data/links";
import styles from "./ProfileCard.module.scss";

type Props = {
  card: ProfileCardData;
};

function FaceitMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M12 3.2 20 19.5H4L12 3.2Z" fill="currentColor" />
    </svg>
  );
}

const icons = {
  steam: FaSteam,
  discord: FaDiscord,
  teamspeak: FaTeamspeak,
  faceit: FaceitMark,
} as const;

export function ProfileCard({ card }: Props) {
  const Icon = icons[card.icon];
  const external = card.href.startsWith("http");

  return (
    <a
      className={styles.card}
      href={card.href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <span className={styles.icon}>
        <Icon />
      </span>
      <span className={styles.title}>{card.title}</span>
      <span className={styles.subtitle}>{card.subtitle}</span>
    </a>
  );
}
