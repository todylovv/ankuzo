import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { Header } from "./components/Header/Header";
import { HeroSky } from "./components/Hero/HeroSky";
import { Hero } from "./components/Hero/Hero";
import { PlayedRecently } from "./components/PlayedRecently/PlayedRecently";
import { AboutSection } from "./components/AboutSection/AboutSection";
import { Footer } from "./components/Footer/Footer";
import { GamesPage } from "./pages/GamesPage/GamesPage";
import { StatsPage } from "./pages/StatsPage/StatsPage";
import { AboutPage } from "./pages/AboutPage/AboutPage";
import { LiveDataProvider } from "./data/useLiveData";
import { useHashPage } from "./hooks/useHashPage";
import { cx } from "./lib/cx";
import styles from "./App.module.scss";

const PAGE_NAMES = {
  home: "Главная",
  games: "Игры",
  stats: "Статистика",
  about: "Обо мне",
} as const;

export default function App() {
  const pageRef = useRef<HTMLDivElement>(null);
  const page = useHashPage();
  useEffect(() => {
    document.title = `${PAGE_NAMES[page]} — ANKUZO.ONLINE`;
  }, [page]);

  useLayoutEffect(() => {
    const node = pageRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(node, { opacity: 0, duration: 0.5, ease: "power1.out" });
    }, pageRef);

    return () => ctx.revert();
  }, [page]);

  return (
    <LiveDataProvider>
    <div className={cx(styles.page, page !== "home" && styles.subpage, page === "about" && styles.aboutPage)} ref={pageRef}>
      <HeroSky variant={page === "about" ? "about" : "default"} />
      <div className={styles.frame}>
        <Header />
        <h1 className="sr-only">{PAGE_NAMES[page]} — личный игровой архив ANKUZO</h1>
        {page === "games" && <GamesPage />}
        {page === "stats" && <StatsPage />}
        {page === "about" && <AboutPage />}
        {page === "home" && (
          <>
            <Hero />
            <div className={styles.content}>
              <PlayedRecently />
              <AboutSection />
            </div>
          </>
        )}
        <Footer />
      </div>
    </div>
    </LiveDataProvider>
  );
}
