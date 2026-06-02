import { useEffect, useState } from 'react';
import { navItems } from '../../data/content.js';

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, []);

  return (
    <>
      <nav id="nav" aria-label="Основная навигация">
        <a className="nav-logo" href="#top" aria-label="ANKUZO, наверх">ANKUZO</a>
        <div id="dsWidget" className="discord-nav-status">
          <div id="dsDot" className="discord-nav-dot" />
          <div className="discord-nav-copy"><span id="dsStatus">...</span><span id="dsGame" /></div>
        </div>
        <div className="nav-links">
          {navItems.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}
        </div>
        <button className="nav-burger" id="burger" type="button" aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open} aria-controls="mobileNav" onClick={() => setOpen(value => !value)}>
          <span /><span /><span />
        </button>
      </nav>
      <div className={`nav-mobile${open ? ' open' : ''}`} id="mobileNav" aria-hidden={!open}>
        {navItems.map(([id, label]) => <a href={`#${id}`} key={id} onClick={() => setOpen(false)}>{label}</a>)}
      </div>
    </>
  );
}
