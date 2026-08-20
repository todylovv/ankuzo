"use client";

import { Component, Suspense, lazy, useSyncExternalStore } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { ExperienceIntro } from "./ExperienceIntro";

/**
 * The 3D layer pulls three + fiber + drei (~940 KB). Loading it through a
 * dynamic import keeps it out of the document head's modulepreload set, so the
 * intro paints from the SSR HTML first and the chunk is fetched afterwards.
 */
const PortalExperience = lazy(async () => {
  const loaded = await import("./portal/PortalExperience");
  return { default: loaded.PortalExperience };
});

/** Hydration-safe "we are past the first client render" flag, without an effect. */
const subscribeToNothing = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

const FAILURE_NOTE =
  "Трёхмерная сцена не запустилась в этом браузере. Текст выше — полный смысл страницы; " +
  "обновите вкладку или откройте её в свежем Chrome, Safari или Firefox с включённым WebGL.";

interface ExperienceErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ExperienceErrorBoundaryState {
  failed: boolean;
}

/**
 * React 19 still has no hook-based error boundary, so this stays a class.
 * It sits outside <Suspense> on purpose: that way it catches both a rejected
 * chunk request and a throw from inside the scene (missing WebGL context, a
 * texture that never loads) instead of leaving a blank stage behind.
 */
class ExperienceErrorBoundary extends Component<
  ExperienceErrorBoundaryProps,
  ExperienceErrorBoundaryState
> {
  state: ExperienceErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ExperienceErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[experience] 3D layer failed", error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function ExperienceBoundary() {
  const mounted = useSyncExternalStore(subscribeToNothing, getHydratedSnapshot, getServerSnapshot);

  // Server render and first hydration pass stay on the static intro, so the
  // markup matches and PortalExperience's scroll lock only arrives with it.
  if (!mounted) return <ExperienceIntro />;

  return (
    <ExperienceErrorBoundary
      fallback={<ExperienceIntro caption="СЦЕНА НЕ ЗАПУСТИЛАСЬ" note={FAILURE_NOTE} />}
    >
      <Suspense fallback={<ExperienceIntro />}>
        <PortalExperience />
      </Suspense>
    </ExperienceErrorBoundary>
  );
}
