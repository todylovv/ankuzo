import { useState } from "react";
import { cx } from "../../lib/cx";
import styles from "./GameArtwork.module.scss";

type Props = {
  src?: string;
  fallbackSrc?: string;
  title: string;
  className?: string;
};

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function GameArtwork({ src, fallbackSrc, title, className }: Props) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const image = [src, fallbackSrc].find((url) => url && !failedSources.includes(url));

  if (!image) {
    return (
      <div className={cx(styles.fallback, className)} aria-hidden="true">
        <span>{initials(title)}</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={image}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSources((previous) => [...previous, image])}
    />
  );
}
