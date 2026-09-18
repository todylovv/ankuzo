import { useState } from "react";
import { cx } from "../../lib/cx";
import styles from "./GameArtwork.module.scss";

type Props = {
  src?: string;
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

export function GameArtwork({ src, title, className }: Props) {
  const [failedSrc, setFailedSrc] = useState("");
  const failed = Boolean(src && failedSrc === src);

  if (!src || failed) {
    return (
      <div className={cx(styles.fallback, className)} aria-hidden="true">
        <span>{initials(title)}</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src ?? "")}
    />
  );
}
