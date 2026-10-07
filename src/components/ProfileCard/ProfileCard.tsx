import { FaDiscord, FaSteam, FaTeamspeak } from "react-icons/fa";
import { SiFaceit } from "react-icons/si";
import type { ProfileCardData } from "../../data/links";
import styles from "./ProfileCard.module.scss";

type Props = {
  card: ProfileCardData;
};

const icons = {
  steam: FaSteam,
  discord: FaDiscord,
  teamspeak: FaTeamspeak,
  faceit: SiFaceit,
} as const;

export function ProfileCard({ card }: Props) {
  const Icon = icons[card.icon];
  const external = card.href.startsWith("http");
  const Tag = external ? "a" : "div";

  return (
    <Tag
      className={styles.card}
      {...(external ? { href: card.href, target: "_blank", rel: "noreferrer" } : {})}
    >
      <span className={styles.icon}>
        <Icon />
      </span>
      <span className={styles.title}>{card.title}</span>
      <span className={styles.subtitle}>{card.subtitle}</span>
    </Tag>
  );
}
