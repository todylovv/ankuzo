import { Suspense } from "react";
import { twentyTwoTransform } from "./modelConfig";
import { FloatingModel } from "./FloatingModel";
import { ModelPlaceholder } from "./ModelPlaceholder";
import { TwentyTwoGltf } from "./TwentyTwoGltf";

export function TwentyTwoModel() {
  return (
    <FloatingModel transform={twentyTwoTransform} floatPhase={1.1}>
      <Suspense fallback={<ModelPlaceholder name="22" />}>
        <TwentyTwoGltf />
      </Suspense>
    </FloatingModel>
  );
}
