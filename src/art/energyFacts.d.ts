type Bounds = { x: number; y: number; width: number; height: number };
export function energyFrame(phase: number, person: Bounds, deck: Bounds, moving: Bounds): {
  rect: Bounds; mask: number; strength: number; target: string;
};
