type Bounds = { x: number; y: number; width: number; height: number };
export function energyFrame(phase: number, person: Bounds, viewport: {width:number;height:number}): {
  rect: Bounds; attached: number; spread: number; diffuse: number; strength: number; target: string;
};
