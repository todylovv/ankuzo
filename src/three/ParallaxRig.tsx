import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { MathUtils } from "three";
import { motionConfig } from "./modelConfig";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

export function ParallaxRig({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  const reduced = usePrefersReducedMotion();

  useFrame((state) => {
    if (!group.current || reduced) return;
    const x = state.pointer.x * motionConfig.parallaxX;
    const y = state.pointer.y * motionConfig.parallaxY;
    group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, x, 0.045);
    group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, -y, 0.045);
  });

  return <group ref={group}>{children}</group>;
}
