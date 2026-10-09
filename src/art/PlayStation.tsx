import { useDeferredValue, useMemo, useState, useId } from 'react';
import { useLiveData } from '../data/useLiveData';
import { safeExternalUrl } from '../data/artFacts';
import { featuredPsnGames, filterPsnGames, type PsnGame, type PsnProfile, type PsnVersion } from './psnFacts.js';
import './playstation.css';

const count=(value:number|null)=>value===null?'—':value.toLocaleString('ru-RU');
const trophyKinds=[['platinum','платина'],['gold','золото'],['silver','серебро'],['bronze','бронза']] as const;

function Trophy({kind}:{kind:string}){
  const metalId=useId();
  return <svg className={`ps-trophy ${kind}`} viewBox="0 0 40 48" aria-hidden="true"><defs><linearGradient id={metalId} x1="0" x2="1"><stop offset="0" stopColor="var(--metal)"/><stop offset=".38" stopColor="var(--shine)"/><stop offset=".6" stopColor="var(--metal)"/><stop offset="1" stopColor="var(--shine)"/></linearGradient></defs><path className="trophy-handles" d="M10 7H3v7c0 8 5 12 12 12M30 7h7v7c0 8-5 12-12 12"/><path className="trophy-cup" style={{fill:`url(#${metalId})`}} d="M9 3h22v12c0 9-5 14-11 14S9 24 9 15Z"/><path className="trophy-stem" style={{fill:`url(#${metalId})`}} d="M18 28h4v9l8 5v3H10v-3l8-5Z"/><path className="trophy-shine" d="M13 7v8c0 5 2 7 4 8"/>{kind==='platinum'&&<path className="trophy-gem" d="m20 6 6 7-6 8-6-8Z"/>}</svg>;
}

export function TrophySummary({profile}:{profile:PsnProfile}){
  return <div className="ps-trophy-summary" aria-label="Трофеи PlayStation">
    <div className="ps-account"><span className="ps-monogram" aria-hidden="true">22</span><div><strong>{profile.psnId}</strong><small>Уровень {count(profile.trophies.level)}</small></div></div>
    <div className="ps-trophy-total"><strong>{count(profile.trophies.total)}</strong><small>трофеев</small></div>
    <dl className="ps-trophy-types">{trophyKinds.map(([key,label])=><div key={key}><Trophy kind={key}/><dt>{label}</dt><dd>{count(profile.trophies[key])}</dd></div>)}</dl>
  </div>;
}

function SnapshotNote({profile}:{profile:PsnProfile}){
  const date=profile.updatedAt?new Date(profile.updatedAt).toLocaleDateString('ru-RU'):null;
  return <p className="ps-snapshot">{profile.state==='saved'?'Сохранённый снимок':profile.state==='fresh'?'Обновлено':'Синхронизация недоступна'}{date&&<> · <time dateTime={profile.updatedAt!}>{date}</time></>}</p>;
}

function GameCover({game,version}:{game:PsnGame;version:PsnVersion}){
  return <div className="ps-cover"><span className="ps-cover-fallback" aria-hidden="true">♠</span>{version.image&&<img src={safeExternalUrl(version.image)} alt={game.title} loading="lazy" decoding="async" onError={event=>{event.currentTarget.hidden=true}}/>}<span className="ps-cover-shade"/><span className="ps-platform">{version.platform}</span><span className="ps-cover-progress">{version.progress===null?'В библиотеке':`${version.progress}% трофеев`}</span></div>;
}

export function PlayStationScene({open}:{open:(id?:string)=>void}){
  const {psnProfile,loading}=useLiveData();
  const games=useMemo(()=>featuredPsnGames(psnProfile.games),[psnProfile.games]);
  return <section className="scene playstation-scene" id="view-playstation" aria-labelledby="playstation-title">
    <img className="ps-static-card" src="/art/card-back.png" alt="" aria-hidden="true" />
    <div className="ps-console-floor" aria-hidden="true"/>
    <img className="ps-console" src={`${import.meta.env.BASE_URL}art/ps5-slim.webp`} width="1448" height="1086" alt="PlayStation 5 Slim и DualSense с красной боковой подсветкой" decoding="async"/>
    <div className="ps-scene-copy"><h2 id="playstation-title">PlayStation<span>.</span></h2><p className="ps-id">PSN · {psnProfile.psnId}</p><p className="subtle">Игры и трофеи</p><button className="outline" onClick={()=>open()}>Вся библиотека <span>↗</span></button></div>
    <div className="ps-scene-trophies"><TrophySummary profile={psnProfile}/><SnapshotNote profile={psnProfile}/></div>
    <div className="ps-featured"><div className="ps-featured-heading"><h3>В библиотеке</h3><button onClick={()=>open()}>Все игры <span>↗</span></button></div>
      {loading?<p className="ps-loading" role="status">Загружаю библиотеку…</p>:games.length?<div className="ps-featured-grid">{games.map(game=><button className="ps-featured-game" key={game.id} onClick={()=>open(game.id)} aria-label={`${game.title} — раскрыть игру`}><GameCover game={game} version={game.versions[0]}/><span className="ps-game-title">{game.title}<span aria-hidden="true">↗</span></span></button>)}</div>:<p className="ps-loading">Библиотека пока недоступна. Попробуй зайти позже.</p>}
    </div>
  </section>;
}

function CatalogGame({game,expanded,toggle,preferred}:{game:PsnGame;expanded:boolean;toggle:()=>void;preferred:string}){
  const [chosen,setChosen]=useState('');
  const version=game.versions.find(v=>v.platform===chosen)??game.versions.find(v=>v.platform===preferred)??game.versions[0];
  const detailId=`ps-detail-${game.id}`;
  return <article className={`ps-catalog-game${expanded?' expanded':''}`}>
    <button className="ps-game-toggle" aria-expanded={expanded} aria-controls={detailId} onClick={toggle}>
      <GameCover game={game} version={version}/><span className="ps-game-title">{game.title}<span className="ps-chevron" aria-hidden="true">⌄</span></span>
    </button>
    <div className="ps-game-detail" id={detailId} hidden={!expanded}>
      <div className="ps-version-picker" aria-label={`Версия ${game.title}`}>{game.versions.map(v=><button key={v.platform} aria-pressed={version.platform===v.platform} onClick={()=>setChosen(v.platform)}>{v.platform}</button>)}</div>
      {version.progress===null?<p>Прогресс трофеев пока неизвестен.</p>:<><div className="ps-progress-caption"><span>Прогресс трофеев</span><strong>{version.progress}%</strong></div><div className="ps-progress-rail" role="progressbar" aria-label={`Трофеи ${game.title}, ${version.platform}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={version.progress}><i style={{width:`${version.progress}%`}}/></div></>}
      <p className="ps-detail-note">Детальные трофеи пока не загружены.</p>
    </div>
  </article>;
}

export function PlayStationCatalog({initialGame}:{initialGame:string}){
  const {psnProfile,loading}=useLiveData();
  const [query,setQuery]=useState('');
  const [platform,setPlatform]=useState('all');
  const [expanded,setExpanded]=useState(initialGame);
  const deferredQuery=useDeferredValue(query);
  const games=useMemo(()=>{
    const filtered=filterPsnGames(psnProfile.games,deferredQuery,platform);
    return initialGame?[...filtered].sort((a,b)=>Number(b.id===initialGame)-Number(a.id===initialGame)):filtered;
  },[psnProfile.games,deferredQuery,platform,initialGame]);
  return <div className="ps-catalog">
    <TrophySummary profile={psnProfile}/><SnapshotNote profile={psnProfile}/>
    <div className="ps-catalog-controls"><label className="ps-search"><span>Найти игру</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Название игры"/></label><fieldset><legend>Платформа</legend>{[['all','Все'],['PS5','PS5'],['PS4','PS4']].map(([value,label])=><button type="button" key={value} aria-pressed={platform===value} onClick={()=>setPlatform(value)}>{label}</button>)}</fieldset></div>
    <p className="ps-results" role="status">{loading?'Загружаю библиотеку…':`Игр: ${games.length} · версии PS4 и PS5 объединены`}</p>
    {games.length?<div className="ps-catalog-grid">{games.map(game=><CatalogGame key={`${game.id}-${platform}`} game={game} preferred={platform} expanded={expanded===game.id} toggle={()=>setExpanded(expanded===game.id?'':game.id)}/>)}</div>:!loading&&<div className="ps-empty"><span aria-hidden="true">♠</span><h3>{psnProfile.games.length?'Игра не найдена':'Библиотека пока недоступна'}</h3><p>{psnProfile.games.length?'Попробуй другое название или выбери все платформы.':'Сохранённые данные появятся после успешной синхронизации PSN.'}</p>{psnProfile.games.length>0&&<button className="outline" onClick={()=>{setQuery('');setPlatform('all')}}>Сбросить поиск <span>↗</span></button>}</div>}
  </div>;
}
