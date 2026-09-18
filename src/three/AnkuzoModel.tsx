import { useGLTF } from "@react-three/drei";
import { Suspense } from "react";
import { ankuzoTransform, MODEL_PATHS } from "./modelConfig";
import { FloatingModel } from "./FloatingModel";
import { ModelPlaceholder } from "./ModelPlaceholder";
import { useOptionalAsset } from "../hooks/useOptionalAsset";

function GltfScene({ path }: { path: string }) {
  const gltf = useGLTF(path);
  return <primitive object={gltf.scene} />;
}

export function AnkuzoModel() {
  const hasModel = useOptionalAsset("ankuzo");

  return (
    <FloatingModel transform={ankuzoTransform} floatPhase={0.15}>
      {hasModel ? (
        <Suspense fallback={<ModelPlaceholder name="ANKUZO" />}>
          <GltfScene path={MODEL_PATHS.ankuzo} />
        </Suspense>
      ) : (
        <ModelPlaceholder name="ANKUZO" />
      )}
    </FloatingModel>
  );
}
