import { useRef } from "react";
import { Archive } from "./Archive";
import { useArchiveMotion } from "./useArchiveMotion";

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { tsLabel, copyTs } = useArchiveMotion(rootRef);
  return <Archive rootRef={rootRef} tsLabel={tsLabel} copyTs={copyTs} />;
}
