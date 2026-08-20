"use client";

import { useTilt } from "./useTilt";

/**
 * A game as an object you can turn, rather than a row in a table.
 *
 * Cover art was pulled off this site once already, and for a real reason: at
 * full-bleed size an orange Counter-Strike beside an acid-green Apex destroys
 * a palette built on one cold ramp. What failed then was the scale, not the
 * idea. Kept small, darkened toward the page's own ground and lit only where
 * the pointer is, the art becomes a texture inside the composition instead of
 * a competing poster — the same treatment that lets the Discord card quote
 * Discord without the page turning into Discord.
 *
 * The rank is set in the display face at a size the artwork cannot shout over,
 * because the ranking is the point: this is a list of what took the hours, and
 * the pictures are evidence rather than subject.
 */
export function GameCard({
  rank,
  title,
  hours,
  artwork,
  share,
  featured = false,
}: {
  rank: number;
  title: string;
  hours: number;
  artwork?: string;
  /** 0..1 of the account's total, used for the fill under the card. */
  share: number;
  featured?: boolean;
}) {
  // Destructured rather than kept as an object: the hooks lint rule reads
  // `tilt.ref` in JSX as a ref access during render.
  const { ref, onPointerMove, onPointerLeave } = useTilt<HTMLLIElement>(featured ? 11 : 8);

  return (
    <li
      ref={ref}
      className="game-card"
      data-featured={featured ? "true" : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="game-card-art">
        {artwork ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={artwork} alt="" loading="lazy" />
        ) : null}
        <span className="game-card-rank" aria-hidden="true">{String(rank).padStart(2, "0")}</span>
        <span className="game-card-sheen" aria-hidden="true" />
      </div>
      <p className="game-card-title">{title}</p>
      <p className="game-card-hours">
        <b>{hours.toLocaleString("en-US")}</b> h
      </p>
      {/* Proportion under the card rather than a bar beside it: the eye reads
          the row of cards as a ranking already, so the fill only has to confirm
          how steeply it falls away. */}
      <span className="game-card-share" aria-hidden="true">
        <i style={{ transform: `scaleX(${Math.max(0.04, share)})` }} />
      </span>
    </li>
  );
}
