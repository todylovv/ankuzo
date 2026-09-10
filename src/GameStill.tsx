import { useEffect, useMemo, useState } from "react";
import { css } from "./css";
import { artUrls, type GameArt } from "./gameArt";

type GameStillProps = {
  art: GameArt;
  kind?: "wide" | "poster";
  position?: string;
  eager?: boolean;
  fill?: boolean;
};

export function GameStill({
  art,
  kind = "wide",
  position = "center 28%",
  eager,
  fill = false,
}: GameStillProps) {
  const urls = useMemo(() => artUrls(art, kind), [art, kind]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [urls[0]]);
  const src = urls[index];
  const ratio = kind === "poster" ? "2 / 3" : "16 / 9";

  return (
    <div
      style={css(
        fill
          ? `position:absolute;inset:0;overflow:hidden;background:#141414`
          : `position:relative;width:100%;aspect-ratio:${ratio};overflow:hidden;background:#141414`,
      )}
    >
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
    </div>
  );
}
