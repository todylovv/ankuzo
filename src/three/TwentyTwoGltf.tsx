import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  type Mesh,
  type Object3D,
} from "three";
import { chromeMaterialConfig, MODEL_PATHS } from "./modelConfig";

function isLightOrCamera(obj: Object3D) {
  return (
    obj.type.includes("Light") ||
    obj.type.includes("Camera") ||
    obj.name.toLowerCase().includes("camera")
  );
}

function toChromeMaterial() {
  return new MeshPhysicalMaterial({
    color: new Color(chromeMaterialConfig.color),
    metalness: chromeMaterialConfig.metalness,
    roughness: chromeMaterialConfig.roughness,
    clearcoat: chromeMaterialConfig.clearcoat,
    clearcoatRoughness: chromeMaterialConfig.clearcoatRoughness,
    envMapIntensity: chromeMaterialConfig.envMapIntensity,
    specularColor: new Color(chromeMaterialConfig.specularColor),
    side: DoubleSide,
  });
}

export function TwentyTwoGltf() {
  const gltf = useGLTF(MODEL_PATHS.twentyTwo);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const chrome = toChromeMaterial();
    const remove: Object3D[] = [];

    cloned.traverse((obj) => {
      if (isLightOrCamera(obj)) {
        remove.push(obj);
        return;
      }
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = chrome;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    for (const obj of remove) obj.parent?.remove(obj);
    return cloned;
  }, [gltf]);

  return <primitive object={scene} />;
}

useGLTF.preload(MODEL_PATHS.twentyTwo);
