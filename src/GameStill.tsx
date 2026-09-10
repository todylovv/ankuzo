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
  const captionColor = captionDark ? "rgba(20,20,20,.5)" : "rgba(241,240,238,.38)";

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
          }}
        />
      ) : null}
      <div
        aria-hidden="true"
        style={css(
          `position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(8,8,8,.12) 0%,rgba(8,8,8,.08) 42%,rgba(8,8,8,.62) 100%)`,
        )}
      />
      {caption ? (
        <span
          style={css(
            `position:absolute;left:16px;bottom:12px;z-index:2;font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.08em;color:${captionColor}`,
          )}
        >
          {caption}
        </span>
      ) : null}
    </>
  );
}
