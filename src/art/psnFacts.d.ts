export type PsnVersion={platform:'PS4'|'PS5';progress:number|null;image:string};
export type PsnGame={id:string;title:string;versions:PsnVersion[]};
export type PsnProfile={psnId:string;games:PsnGame[];trophies:Record<'total'|'level'|'platinum'|'gold'|'silver'|'bronze',number|null>;updatedAt:string|null;hasData:boolean;state:'fresh'|'saved'|'empty'};
export function buildPsnSnapshot(input:unknown):PsnProfile;
export function filterPsnGames(games:PsnGame[],query?:string,platform?:string):PsnGame[];
export function featuredPsnGames(games:PsnGame[]):PsnGame[];
