import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { motionConfig, type ModelTransform } from "./modelConfig";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

type Props = {
  transform: ModelTransform;
  children: ReactNode;
  floatPhase?: number;
};

export function FloatingModel({ transform, children, floatPhase = 0 }: Props) {
  const group = useRef<Group>(null);
  const reduced = usePrefersReducedMotion();
  const { position, rotation, scale } = transform;

  useFrame((state) => {
    if (!group.current) return;
    if (reduced) {
      group.current.position.set(...position);
      group.current.rotation.set(...rotation);
      return;
    }

    const t = state.clock.elapsedTime * motionConfig.floatSpeed + floatPhase;
    group.current.position.x = position[0];
    group.current.position.y = position[1] + Math.sin(t) * motionConfig.floatAmplitude;
    group.current.position.z = position[2];
    group.current.rotation.x = rotation[0] + Math.sin(t * 0.7) * 0.012;
    group.current.rotation.y = rotation[1];
    group.current.rotation.z = rotation[2] + Math.cos(t * 0.55) * 0.01;
  });

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      {children}
    </group>
  );
}
