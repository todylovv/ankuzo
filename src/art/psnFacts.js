const keyOf=value=>String(value??'').replace(/[™®]/g,'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const numberOrNull=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.round(value):null;
const safeImage=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:''}catch{return ''}};
export function buildPsnSnapshot(input){
  const raw=input&&typeof input==='object'?input:{};
  const grouped=new Map();
  for(const entry of Array.isArray(raw.library)?raw.library:[]){
    if(!entry||typeof entry.title!=='string'||!entry.title.trim())continue;
    const platforms=['PS5','PS4'].filter(p=>String(entry.platform).includes(p));
    if(!platforms.length)continue;
    const key=keyOf(entry.title);if(!key)continue;
    const group=grouped.get(key)??{id:key,title:entry.title.replace(/[™®]/g,'').trim(),versions:[]};
    const progress=numberOrNull(entry.trophyProgress);
    for(const platform of platforms){
      const version={platform,progress:progress===null?null:Math.min(100,progress),image:safeImage(entry.iconUrl)};
      const index=group.versions.findIndex(v=>v.platform===platform);
      if(index<0)group.versions.push(version);
      else if(group.versions[index].progress===null&&version.progress!==null)group.versions[index]=version;
      else if(!group.versions[index].image&&version.image)group.versions[index].image=version.image;
    }
    grouped.set(key,group);
  }
  const games=[...grouped.values()].map(game=>({...game,versions:game.versions.sort((a,b)=>b.platform.localeCompare(a.platform))}));
  const trophies=Object.fromEntries(['total','level','platinum','gold','silver','bronze'].map(k=>[k,numberOrNull(raw.trophies?.[k])]));
  const date=raw.lastSuccessfulAt??raw.updatedAt;
  const updatedAt=typeof date==='string'&&Number.isFinite(Date.parse(date))?date:null;
  const hasData=games.length>0||trophies.total!==null;
  const fresh=raw.status==='available'&&updatedAt&&Date.now()-Date.parse(updatedAt)<7*86400000;
  return {psnId:typeof raw.psnId==='string'&&raw.psnId.trim()?raw.psnId:'ankkui',games,trophies,updatedAt,hasData,state:hasData?(fresh?'fresh':'saved'):'empty'};
}
export function filterPsnGames(games,query='',platform='all'){
  const search=keyOf(query);
  return games.filter(g=>(platform==='all'||g.versions.some(v=>v.platform===platform))&&keyOf(g.title).includes(search));
}
export function featuredPsnGames(games){
  const names=['godofwarragnarok','eldenring','ghostoftsushima','deathstrandingdirectorscut'];
  const chosen=names.map(id=>games.find(g=>g.id===id)).filter(Boolean);
  return [...chosen,...games.filter(g=>!chosen.includes(g)&&g.versions.some(v=>v.progress!==null))].slice(0,4);
}
