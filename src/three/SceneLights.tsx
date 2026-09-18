import { SkyEnvironment } from "./SkyEnvironment";
import { lightingConfig } from "./modelConfig";

export function SceneLights() {
  return (
    <>
      <SkyEnvironment />
      <hemisphereLight args={["#e8eef4", "#3a424c", 0.42]} />
      <ambientLight intensity={lightingConfig.ambientIntensity} />
      <directionalLight
        castShadow
        position={lightingConfig.key.position}
        intensity={lightingConfig.key.intensity}
        color={lightingConfig.key.color}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00035}
        shadow-normalBias={0.035}
        shadow-radius={8}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={8}
        shadow-camera-bottom={-6}
      />
      <directionalLight
        position={lightingConfig.fill.position}
        intensity={lightingConfig.fill.intensity}
        color={lightingConfig.fill.color}
      />
      <directionalLight
        position={lightingConfig.rim.position}
        intensity={lightingConfig.rim.intensity}
        color={lightingConfig.rim.color}
      />
    </>
  );
}
