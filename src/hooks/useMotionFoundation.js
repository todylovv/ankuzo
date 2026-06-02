import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

export function useMotionFoundation() {
  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.registerPlugin(ScrollTrigger);
    window.gsap = gsap;
    window.ScrollTrigger = ScrollTrigger;
    window.SplitType = SplitType;

    if (reducedMotion || !matchMedia('(min-width: 901px) and (pointer: fine)').matches) return;

    const lenis = new Lenis({
      duration: 1.08,
      smoothWheel: true,
      anchors: true
    });
    const update = time => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    window.studioLenis = lenis;

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
      delete window.studioLenis;
    };
  }, []);
}
