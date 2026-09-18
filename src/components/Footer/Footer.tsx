import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p>ANKUZO.ONLINE</p>
      <p className={styles.center}>ИГРЫ / КОД / ИДЕИ / ЖИЗНЬ</p>
      <p className={styles.est}>С 2023</p>
    </footer>
  );
}
