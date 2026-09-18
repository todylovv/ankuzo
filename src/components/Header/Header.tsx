import { useEffect, useRef, useState } from "react";
import { FaDiscord, FaGithub, FaSteam } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { navItems, type SocialLink } from "../../data/links";
import { useLiveData } from "../../data/useLiveData";
import { useHashId } from "../../hooks/useHashPage";
import { cx } from "../../lib/cx";
import styles from "./Header.module.scss";

const socialIcon = {
  discord: FaDiscord,
  steam: FaSteam,
  github: FaGithub,
} as const;

function SocialButton({ item }: { item: SocialLink }) {
  const Icon = socialIcon[item.id];
  return (
    <a
      className={cx(styles.social, styles[item.id])}
      href={item.href}
      aria-label={item.label}
      {...(item.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <Icon />
    </a>
  );
}

export function Header() {
  const { headerSocials } = useLiveData();
  const hashId = useHashId();
  const activeId = navItems.some((item) => item.id === hashId) ? hashId : "home";
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const externalSocials = headerSocials.filter((item) => item.href.startsWith("http"));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.header}>
      <a className={styles.logo} href="#home" aria-label="Главная Ankuzo">
        22
      </a>

      <nav className={styles.nav} aria-label="Основная навигация">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cx(styles.navItem, item.id === activeId && styles.active)}
            aria-current={item.id === activeId ? "page" : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className={styles.actions}>
        {externalSocials.map((item) => (
          <SocialButton key={item.id} item={item} />
        ))}
        <button
          ref={menuRef}
          className={styles.menu}
          type="button"
          aria-label="Открыть меню"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <dialog
        ref={dialogRef}
        id="mobile-menu"
        className={styles.drawer}
        aria-label="Меню сайта"
        onCancel={closeMenu}
        onClose={() => {
          setMenuOpen(false);
          menuRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className={styles.drawerCard}>
          <div className={styles.drawerHead}>
            <span>ANKUZO.ONLINE</span>
            <button type="button" aria-label="Закрыть меню" onClick={closeMenu} autoFocus>
              <IoClose />
            </button>
          </div>
          <nav className={styles.drawerNav} aria-label="Мобильная навигация">
            {navItems.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={item.id === activeId ? "page" : undefined}
                className={cx(item.id === activeId && styles.drawerActive)}
                onClick={closeMenu}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div className={styles.drawerSocials}>
            {externalSocials.map((item) => (
              <SocialButton key={item.id} item={item} />
            ))}
          </div>
        </div>
      </dialog>
    </header>
  );
}
