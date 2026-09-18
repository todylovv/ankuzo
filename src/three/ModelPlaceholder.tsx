import { Center, Text3D } from "@react-three/drei";
import { DoubleSide } from "three";
import { chromeMaterialConfig, FONT_3D_PATH, placeholderBounds } from "./modelConfig";

type Props = {
  name: "ANKUZO" | "22";
};

const GLYPH_ADVANCE: Record<string, number> = {
  A: 1069,
  N: 949,
  K: 996,
  U: 926,
  Z: 906,
  O: 1094,
  "2": 900,
};

function ChromeMaterial() {
  return (
    <meshPhysicalMaterial
      color={chromeMaterialConfig.color}
      metalness={chromeMaterialConfig.metalness}
      roughness={chromeMaterialConfig.roughness}
      clearcoat={chromeMaterialConfig.clearcoat}
      clearcoatRoughness={chromeMaterialConfig.clearcoatRoughness}
      envMapIntensity={chromeMaterialConfig.envMapIntensity}
      specularColor={chromeMaterialConfig.specularColor}
      side={DoubleSide}
    />
  );
}

export function ModelPlaceholder({ name }: Props) {
  const bounds = name === "ANKUZO" ? placeholderBounds.ankuzo : placeholderBounds.twentyTwo;
  const chars = name.split("");
  const size = name === "ANKUZO" ? 0.8 : 0.92;
  const overlap = 0.1;

  const xs: number[] = [];
  let cursor = 0;
  for (const char of chars) {
    xs.push(cursor);
    cursor += ((GLYPH_ADVANCE[char] ?? 900) / 1000) * size - overlap;
  }

  return (
    <group>
      <mesh visible={false}>
        <boxGeometry args={[bounds.width, bounds.height, bounds.depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <Center>
        <group>
          {chars.map((char, index) => (
            <Text3D
              key={`${name}-${index}`}
              font={FONT_3D_PATH}
              position={[xs[index], 0, 0]}
              size={size}
              height={0.5}
              curveSegments={12}
              bevelEnabled
              bevelThickness={0.12}
              bevelSize={0.08}
              bevelSegments={8}
              castShadow
              receiveShadow
            >
              {char}
              <ChromeMaterial />
            </Text3D>
          ))}
        </group>
      </Center>
    </group>
  );
}
