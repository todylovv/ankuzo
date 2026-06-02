import { DiscordIcon } from '../ui/DiscordIcon.jsx';

export function Footer() {
  return (
    <footer className="reveal">
      <div className="footer-left">
        <div>© <span id="footerYear">2026</span> ANKUZO</div>
        <div className="footer-counter"><span className="footer-counter-dot" /><span id="visitorCount">—</span> визитов</div>
      </div>
      <div className="footer-right">
        <div className="footer-contact-label">Контакт</div>
        <a href="https://discord.com/users/ankuz0" target="_blank" rel="noopener noreferrer" className="footer-discord-btn" aria-label="Discord: ankuz0">
          <DiscordIcon size={16} /> ankuz0
        </a>
      </div>
    </footer>
  );
}
