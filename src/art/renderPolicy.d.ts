export function frameDue(now:number,last:number,fps:number):boolean;
export function silkPixelRatio(width:number,dpr?:number,quality?:string):number;
export function renderBudget(width:number,height:number,dpr?:number,scale?:number):{ratio:number;width:number;height:number;auraWidth:number;auraHeight:number};
export function nextRenderScale(current:number,samples:number[]):number;
