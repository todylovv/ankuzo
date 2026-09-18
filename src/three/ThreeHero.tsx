import { Suspense } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { Canvas } from "@react-three/fiber";
import { cameraConfig, lightingConfig } from "./modelConfig";
import { SceneLights } from "./SceneLights";
import { ParallaxRig } from "./ParallaxRig";
import { AnkuzoModel } from "./AnkuzoModel";
import { TwentyTwoModel } from "./TwentyTwoModel";
import styles from "./ThreeHero.module.scss";

export function ThreeHero() {
  return (
    <div className={styles.stage} aria-hidden>
      <Canvas
        camera={{
          position: cameraConfig.position,
          fov: cameraConfig.fov,
          near: cameraConfig.near,
          far: cameraConfig.far,
        }}
        dpr={[1, 1.75]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace,
        }}
        shadows="soft"
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = lightingConfig.exposure;
          gl.outputColorSpace = SRGBColorSpace;
          scene.background = null;
        }}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "transparent",
        }}
      >
        <SceneLights />
        <Suspense fallback={null}>
          <ParallaxRig>
            <AnkuzoModel />
            <TwentyTwoModel />
          </ParallaxRig>
        </Suspense>
      </Canvas>
    </div>
  );
}
