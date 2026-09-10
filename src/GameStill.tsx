import { useEffect, useMemo, useState } from "react";
import { css } from "./css";
import { artUrls, type GameArt } from "./gameArt";

type GameStillProps = {
  art: GameArt;
  kind?: "wide" | "poster";
  caption?: string;
  captionDark?: boolean;
  position?: string;
  eager?: boolean;
};

export function GameStill({
  art,
  kind = "wide",
  caption,
  captionDark = false,
  position = "center 28%",
  eager,
}: GameStillProps) {
  const urls = useMemo(() => artUrls(art, kind), [art, kind]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [urls[0]]);
  const src = urls[index];

  return (
    <>
      {src ? (
        <img
          src={src}
          alt=""
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          onError={() => setIndex((current) => current + 1)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: position,
            transform: "translateZ(0) scale(1.06)",
          }}
        />
      ) : null}
      <div
        aria-hidden="true"
        style={css(
          `position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(102deg,rgba(255,255,255,.045) 0 2px,rgba(255,255,255,0) 2px 13px),linear-gradient(180deg,rgba(8,8,8,.18) 0%,rgba(8,8,8,.12) 42%,rgba(8,8,8,.72) 100%)`,
        )}
      />
      {caption ? (
        <span
          style={css(
            `position:absolute;left:16px;bottom:12px;z-index:2;font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.08em;color:${captionDark ? "rgba(20,20,20,.5)" : "rgba(241,240,238,.38)"}`,
          )}
        >
          {caption}
        </span>
      ) : null}
    </>
  );
}
