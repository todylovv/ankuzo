"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { DiscordSignal } from "../../lib/experience-data";

/**
 * The Discord profile, built to look like Discord's own popout and tilted by
 * the pointer.
 *
 * Copying the real card's proportions is the point: a profile that is nearly
 * Discord reads as a mistake, while one that matches reads as the thing
 * itself. So this uses Discord's own surface colours and geometry rather than
 * the site palette — it is a quotation, and a quotation keeps its own voice.
 *
 * The tilt is written straight to CSS custom properties from the pointer
 * handler. Putting it in React state would re-render the whole chapter on
 * every mouse move for an effect that is pure presentation.
 */

const MAX_TILT = 13;

export function DiscordCard({
  discord,
  activity,
  activityDetail,
}: {
  discord: DiscordSignal;
  activity?: string;
  activityDetail?: string;
}) {
  const card = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const write = useCallback((x: number, y: number, lit: number) => {
    const node = card.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
    node.style.setProperty("--tilt-y", `${y.toFixed(2)}deg`);
    node.style.setProperty("--sheen", lit.toFixed(3));
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const node = card.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    // -1..1 from the centre of the card.
    const px = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const py = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      // Y rotation follows horizontal travel, X is inverted so pushing the
      // pointer up tips the top of the card away, like a real object would.
      write(-py * MAX_TILT, px * MAX_TILT, (px + 1) / 2);
    });
  }, [write]);

  const onPointerLeave = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    write(0, 0, 0.5);
  }, [write]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const name = discord.displayName ?? discord.username ?? "ANKUZO";
  const accent = discord.accentColor ?? "#5865F2";

  return (
    <div className="dc-stage">
      <div
        ref={card}
        className="dc-card"
        style={{ "--dc-accent": accent } as CSSProperties}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className="dc-banner">
          {discord.banner ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={discord.banner} alt="" loading="lazy" />
          ) : null}
        </div>

        {discord.badges.length > 0 ? (
          <div className="dc-badges">
            {discord.badges.map((badge) => (
              <span key={badge} title={badge.replace(/_/g, " ")}>
                {badge.replace(/_/g, " ").slice(0, 2)}
              </span>
            ))}
          </div>
        ) : null}

        <div className="dc-avatar-wrap">
          {discord.avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="dc-avatar" src={discord.avatar} alt="" width={80} height={80} loading="lazy" />
          ) : null}
          {discord.decoration ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="dc-decoration" src={discord.decoration} alt="" aria-hidden="true" loading="lazy" />
          ) : null}
          <i className={`dc-status dc-status--${discord.presence}`} aria-hidden="true" />
        </div>

        <div className="dc-body">
          <p className="dc-name">{name}</p>
          {discord.username ? <p className="dc-handle">{discord.username}</p> : null}

          {activity ? (
            <>
              <hr className="dc-rule" />
              <p className="dc-section">Playing</p>
              <p className="dc-text">
                {activity}{activityDetail ? ` — ${activityDetail}` : ""}
              </p>
            </>
          ) : null}

          {discord.bio ? (
            <>
              <hr className="dc-rule" />
              <p className="dc-section">About Me</p>
              <p className="dc-text">{discord.bio}</p>
            </>
          ) : null}
        </div>

        <span className="dc-sheen" aria-hidden="true" />
      </div>
    </div>
  );
}
