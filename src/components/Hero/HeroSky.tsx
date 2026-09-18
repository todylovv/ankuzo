import { HERO_SKY_PATH } from "../../three/modelConfig";
import { cx } from "../../lib/cx";
import styles from "./HeroSky.module.scss";

const ABOUT_SKY_PATH = "/images/about/figure.jpg";

type HeroSkyProps = {
  variant?: "default" | "about";
};

export function HeroSky({ variant = "default" }: HeroSkyProps) {
  const about = variant === "about";

  return (
    <div className={cx(styles.sky, about && styles.skyAbout)} aria-hidden>
      <img
        className={cx(styles.photo, about && styles.photoAbout)}
        src={about ? ABOUT_SKY_PATH : HERO_SKY_PATH}
        alt=""
      />
      <div className={cx(styles.fade, about && styles.fadeAbout)} />
    </div>
  );
}
