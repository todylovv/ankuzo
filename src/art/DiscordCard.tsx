import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { DiscordProfile } from '../data/discordProfile';
import { safeExternalUrl } from '../data/artFacts';

const statusLabels = {online:'В сети',idle:'Не активен',dnd:'Не беспокоить',offline:'Не в сети',unknown:''};
function Badge({name}:{name:string}) {
  const bravery = name === 'HOUSE_BRAVERY' || name === 'HYPESQUAD_ONLINE_HOUSE_1';
  const nitro = name === 'NITRO';
  const label = bravery ? 'HypeSquad · Bravery' : nitro ? 'Nitro' : name.replaceAll('_',' ');
  return <li title={label}><svg viewBox="0 0 24 24" aria-hidden="true">{bravery ? <><path fill="#a58aef" d="M12 2 22 7l-3 11-7 4-7-4L2 7Z"/><path fill="#eee8ff" d="m8 7 8 0-2 4 3 0-7 7 1-6H7Z"/></> : nitro ? <><path fill="#ee95c1" d="m6 5 12 0 5 7-11 10L1 12Z"/><path fill="none" stroke="#fff0f8" strokeWidth="1.5" d="M1 12h22M6 5l6 17 6-17"/></> : <path fill="#b99acc" d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>}</svg><span>{label}</span></li>;
}
export function DiscordCard({profile,copy}:{profile:DiscordProfile;copy:()=>void}) {
  const card=useRef<HTMLElement>(null);
  const [animated,setAnimated]=useState(false);
  const [videoFailed,setVideoFailed]=useState(false);
  useEffect(()=>{
    const el=card.current, root=el?.closest<HTMLElement>('.art-root'), scene=el?.closest<HTMLElement>('.scene');
    if(!el || !root || !scene)return;
    let visible=false,last=false;
    const update=()=>{
      const next=visible && !document.hidden && root.dataset.quality!=='off' && scene.getAttribute('aria-hidden')!=='true';
      el.dataset.animationVisible=String(visible); el.dataset.animationActive=String(next);
      if(next!==last){last=next;setAnimated(next);}
    };
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();}); intersection.observe(el);
    const observer=new MutationObserver(update); observer.observe(scene,{attributes:true,attributeFilter:['aria-hidden']});
    root.addEventListener('ankuzo:quality-change',update); document.addEventListener('visibilitychange',update);update();
    return ()=>{intersection.disconnect();observer.disconnect();root.removeEventListener('ankuzo:quality-change',update);document.removeEventListener('visibilitychange',update);};
  },[]);
  const colors=profile.nameStyle.colors;
  const style={'--discord-name-1':colors[0] || '#eee7f1','--discord-name-2':colors[1] || colors[0] || '#eee7f1'} as CSSProperties;
  const joined=new Date(profile.createdAt);
  const joinedLabel=Number.isNaN(joined.getTime())?'':joined.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  return <article className="discord-profile" aria-label="Мой профиль Discord" ref={card} style={style}>
    <div className="discord-banner">{profile.bannerUrl && <img src={safeExternalUrl(profile.bannerUrl)} alt="Баннер моего профиля Discord" width="600" height="210" onError={event=>{event.currentTarget.style.visibility='hidden';}} />}</div>
    <div className="discord-body">
      <div className="discord-avatar"><span aria-hidden="true">{profile.displayName.slice(0,1)}</span>{profile.avatarUrl && <img className="avatar-image" src={safeExternalUrl(profile.avatarUrl)} alt={`Аватар ${profile.username}`} width="80" height="80" onError={event=>{event.currentTarget.style.visibility='hidden';}} />}{profile.decorationUrl && <img className="avatar-decoration" src={safeExternalUrl(profile.decorationUrl)} alt="Декорация аватара Discord" width="96" height="96" onError={event=>{event.currentTarget.style.visibility='hidden';}} />}{profile.presence!=='unknown' && <span className={`discord-presence ${profile.presence}`} title={statusLabels[profile.presence]} aria-label={statusLabels[profile.presence]} />}</div>
      <button className="discord-copy" onClick={copy} aria-label={`Скопировать Discord ${profile.username}`}>Скопировать имя <span>↗</span></button>
      <div className={`discord-heading ${profile.nameplate?'has-nameplate':''}`}>
        {profile.nameplate && <div className="discord-nameplate" aria-hidden="true"><img src={safeExternalUrl(profile.nameplate.imageUrl)} alt="" />{animated && !videoFailed && <video src={safeExternalUrl(profile.nameplate.videoUrl)} autoPlay muted playsInline loop onError={event=>{if(card.current)card.current.dataset.videoError=String(event.currentTarget.error?.code || 'media');setVideoFailed(true);}} />}</div>}
        <span className="discord-service">Discord</span><h3 className={colors.length?'discord-styled-name':''} data-effect={profile.nameStyle.effectId}>{profile.displayName}</h3><p>@{profile.username}</p>
      </div>
      {profile.customStatus && <p className="discord-custom-status">{profile.customStatus}</p>}
      {profile.bio && <p className="discord-bio">{profile.bio}</p>}
      {profile.badges.length>0 && <ul className="discord-badges" aria-label="Значки профиля">{profile.badges.map(badge=><Badge name={badge} key={badge}/>)}</ul>}
      {joinedLabel && <p className="discord-joined">В Discord с <time dateTime={profile.createdAt}>{joinedLabel}</time></p>}
    </div>
  </article>;
}
