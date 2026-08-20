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

/**
 * Discord hands its badges over as a mix of opaque flag keys (HOUSE_BRAVERY)
 * and display strings ("Discord Nameplate"). They used to be cut to their first
 * two characters, which made the row read "HO NI DI" — shorter, but no longer
 * language, and a viewer cannot recover the word from it.
 *
 * A short whole word costs a few pixels more and is actually readable, so the
 * map trades the abbreviation for the word. Anything unlisted is humanised from
 * the key instead of being dropped: a badge Discord adds next year should
 * degrade into something legible rather than into noise or into nothing.
 */
const BADGE_LABELS: Record<string, string> = {
  ACTIVE_DEVELOPER: "Developer",
  BUG_HUNTER: "Bug Hunter",
  BUG_HUNTER_LEVEL_1: "Bug Hunter",
  BUG_HUNTER_LEVEL_2: "Bug Hunter",
  DISCORD_NAMEPLATE: "Nameplate",
  EARLY_SUPPORTER: "Early Supporter",
  EARLY_VERIFIED_BOT_DEVELOPER: "Developer",
  HOUSE_BALANCE: "Balance",
  HOUSE_BRAVERY: "Bravery",
  HOUSE_BRILLIANCE: "Brilliance",
  HYPESQUAD: "HypeSquad",
  NAMEPLATE: "Nameplate",
  NITRO: "Nitro",
  PARTNER: "Partner",
  PREMIUM: "Nitro",
  QUEST_COMPLETED: "Quest",
  SERVER_BOOSTER: "Booster",
  STAFF: "Staff",
  VERIFIED_DEVELOPER: "Developer",
};

function badgeLabel(badge: string) {
  // Both shapes normalise to the same key, so "Discord Nameplate" and
  // DISCORD_NAMEPLATE resolve to one entry rather than to two spellings.
  const key = badge.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const known = BADGE_LABELS[key];
  if (known) return known;
  return badge.trim().replace(/_+/g, " ").toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

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

          {/* Words need room to wrap, which the floating pill Discord uses for
              icon badges does not have — at readable size it would have run
              into the avatar. In the body the row is in normal flow and can
              take a second line without colliding with anything. */}
          {discord.badges.length > 0 ? (
            <ul className="dc-badges">
              {discord.badges.map((badge) => (
                <li key={badge} title={badge.replace(/_/g, " ")}>{badgeLabel(badge)}</li>
              ))}
            </ul>
          ) : null}

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
