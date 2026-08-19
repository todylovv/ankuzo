"use client";

import type { ExperienceData } from "../../lib/experience-data";

function hours(value?: number) {
  if (value === undefined) return undefined;
  return `${Math.round(value).toLocaleString("en-US")} H`;
}

function syncLabel(value?: string) {
  if (!value) return "SIGNAL / AUTHORED";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "SIGNAL / SAFE SNAPSHOT";
  return `SYNC / ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function ExperienceSignals({ data }: { data: ExperienceData }) {
  const libraryGame = data.steam.currentGame ?? data.steam.featured[0] ?? data.playstation.featured[0];
  const steamGame = data.steam.featured[0];
  const playstationGame = data.playstation.featured[0];
  const overlap = data.overlaps[0];
  const discord = data.discord;
  const discordName = discord.displayName ?? discord.username ?? "ANKUZO";

  return (
    <div className="experience-signals" aria-live="polite">
      <section className="experience-signal experience-signal--library" aria-label="Library signal">
        <span>{data.steam.currentGame ? "NOW PLAYING" : libraryGame?.platform === "steam" ? "MOST PLAYED" : "PERSONAL ARCHIVE"}</span>
        <strong>{libraryGame?.title ?? data.authoredFallback.libraryLabel}</strong>
        <small>{libraryGame?.platformLabel ?? "PC / PLAYSTATION"}{hours(libraryGame?.hours) ? ` · ${hours(libraryGame?.hours)}` : ""}</small>
      </section>

      <section className="experience-signal experience-signal--platforms" aria-label="Platform signals">
        <div>
          <span>STEAM / PC</span>
          <strong>{steamGame?.title ?? "PC ARCHIVE"}</strong>
          <small>{hours(steamGame?.hours) ?? data.steam.health.availability.toUpperCase()}</small>
        </div>
        <p>{overlap ? `SHARED TITLE / ${overlap.title}` : "TWO ECOSYSTEMS / ONE PERSON"}</p>
        <div>
          <span>PLAYSTATION</span>
          <strong>{playstationGame?.title ?? "CONSOLE ARCHIVE"}</strong>
          <small>{playstationGame?.platformLabel ?? data.playstation.health.availability.toUpperCase()}</small>
        </div>
      </section>

      <section className="experience-signal experience-signal--online" aria-label={`Discord presence: ${discord.presence}`}>
        <span className={`presence-signal presence-signal--${discord.presence}`} aria-hidden="true" />
        <div>
          <span>DISCORD / {discord.presence.toUpperCase()}</span>
          <strong>{discordName}</strong>
          <small>{syncLabel(discord.health.lastSuccessfulAt)}</small>
        </div>
      </section>
    </div>
  );
}
