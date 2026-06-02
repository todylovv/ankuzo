import { Chrome } from './components/layout/Chrome.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { Header } from './components/layout/Header.jsx';
import { About } from './components/sections/About.jsx';
import { Contact } from './components/sections/Contact.jsx';
import { Games } from './components/sections/Games.jsx';
import { Hero } from './components/sections/Hero.jsx';
import { PlayStation } from './components/sections/PlayStation.jsx';
import { Skills } from './components/sections/Skills.jsx';
import { Steam } from './components/sections/Steam.jsx';
import { Terminal } from './components/sections/Terminal.jsx';
import { useLegacyRuntime } from './hooks/useLegacyRuntime.js';
import { useMotionFoundation } from './hooks/useMotionFoundation.js';

function Divider() {
  return <hr className="section-divider" />;
}

export default function App() {
  useMotionFoundation();
  useLegacyRuntime();

  return (
    <>
      <Chrome />
      <Header />
      <main id="main">
        <Hero /><Divider /><Terminal /><Divider /><About /><Divider /><Skills /><Divider /><PlayStation /><Divider /><Games /><Divider /><Steam /><Contact />
      </main>
      <Footer />
      <button id="scrollTop" type="button" aria-label="Наверх" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>
    </>
  );
}
