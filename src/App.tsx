import { useRef } from "react";
import { Archive } from "./Archive";
import { useArchiveData } from "./useArchiveData";
import { useArchiveMotion } from "./useArchiveMotion";

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const live = useArchiveData();
  const { tsLabel, copyTs } = useArchiveMotion(rootRef);
  return <Archive rootRef={rootRef} tsLabel={tsLabel} copyTs={copyTs} live={live} />;
}
