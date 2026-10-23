"""Authenticated catalog/radio operations. Tokens remain in the private data folder."""
import sys,json,re,math
from pathlib import Path
from yandex_music import Client
command,directory=sys.argv[1:3]
class PublicError(Exception): pass

def packed(track,session=None,batch=None):
    if not track or not track.albums or not track.duration_ms:return None
    track_id=str(track.id).split(':')[0];album_id=str(track.albums[0].id)
    if not track_id.isdigit() or not album_id.isdigit() or not 0<track.duration_ms<=1800000:return None
    item={'trackId':track_id,'albumId':album_id,'url':f'https://music.yandex.ru/album/{album_id}/track/{track_id}','title':', '.join(a.name for a in track.artists)+' — '+(track.title or 'Без названия'),'duration':math.ceil(track.duration_ms/1000)}
    if session:item.update(radioSessionId=session,batchId=batch)
    return item

def checked_key(value):
    if not isinstance(value,str) or not re.fullmatch(r'\d+:\d+',value):raise PublicError('Нужен выбранный трек или плейлист Яндекса')
    return value.split(':')

def fetch_short(client,shorts):
    ids=[]
    for item in list(shorts or [])[:500]:
        item_id=str(item.id).split(':')[0];album=getattr(item,'album_id',None)
        if item_id.isdigit():ids.append(item_id+(':'+str(album) if album else ''))
    tracks=[]
    for start in range(0,len(ids),100):tracks.extend(client.tracks(ids[start:start+100],timeout=20))
    return [p for t in tracks if (p:=packed(t))]

try:
    auth_file=Path(directory)/'yandex-auth.json'
    if not auth_file.exists():raise PublicError('Сначала подключите Яндекс Музыку')
    auth=json.loads(auth_file.read_text());client=Client(auth['access_token']).init();result={}
    if command=='library':
        own=client.users_playlists_list(timeout=20);saved=client.users_likes_playlists(timeout=20);values=[];seen=set()
        for p,group in [(p,'own') for p in own]+[(v.playlist,'saved') for v in saved if v.playlist]:
            uid=getattr(p.owner,'uid',None) if p.owner else getattr(p,'uid',None)
            if not uid or p.kind is None:continue
            key=f'{uid}:{p.kind}'
            if key in seen:continue
            seen.add(key);values.append({'key':key,'title':p.title,'count':p.track_count,'group':group})
        likes=client.users_likes_tracks(timeout=20);result={'playlists':values[:100],'likesCount':len(likes.tracks) if likes else 0}
    elif command=='search':
        query=sys.argv[3].strip()
        if not 1<=len(query)<=120:raise PublicError('Введите запрос длиной до 120 символов')
        response=client.search(query,type_='track',timeout=20);tracks=response.tracks.results if response and response.tracks else []
        result={'tracks':[p for t in tracks[:20] if (p:=packed(t))]}
    elif command=='catalog':
        spec=json.loads(sys.argv[3]);kind=spec.get('kind')
        if kind=='likes':
            response=client.users_likes_tracks(timeout=20);tracks=fetch_short(client,response.tracks if response else []);title='Любимые треки'
        elif kind=='playlist':
            owner,key=checked_key(spec.get('key'));p=client.users_playlists(key,user_id=owner,timeout=20)
            if not p:raise PublicError('Плейлист недоступен')
            tracks=fetch_short(client,p.tracks);title=p.title
        elif kind=='track':
            track_id,album_id=checked_key(spec.get('key'));values=client.tracks([track_id+':'+album_id],timeout=20);tracks=[p for t in values if (p:=packed(t))];title=tracks[0]['title'] if tracks else 'Трек'
        else:raise PublicError('Выберите Мою волну, коллекцию или трек')
        if not tracks:raise PublicError('В этом источнике пока нет доступных треков')
        result={'tracks':tracks,'title':title}
    elif command=='wave':
        spec=json.loads(sys.argv[3]);session=spec.get('session');queue=[str(x) for x in spec.get('queue',[]) if re.fullmatch(r'\d+(?::\d+)?',str(x))][-50:]
        response=client.rotor_session_tracks(session,queue=queue,timeout=20) if session else client.rotor_session_new('user:onyourwave',queue=queue,timeout=20)
        if not response or not response.sequence:raise PublicError('Моя волна пока не отдала треки. Повторите попытку')
        session_id=session or response.radio_session_id;batch=response.batch_id
        tracks=[p for v in response.sequence if (p:=packed(v.track,session_id,batch))]
        if not tracks:raise PublicError('Моя волна не отдала доступных треков')
        result={'tracks':tracks,'title':'Моя волна','radioSession':{'id':session_id,'batchId':batch}}
    elif command=='feedback':
        value=json.loads(sys.argv[3]);session=value['radioSessionId'];track=value['trackId'];batch=value.get('batchId');seconds=float(value.get('seconds',0));type_=value['type']
        if not isinstance(session,str) or not 1<=len(session)<=300 or not str(track).isdigit() or not 0<=seconds<=1800:raise PublicError('Некорректное событие воспроизведения')
        if type_=='radio-started':client.rotor_session_feedback_radio_started(session,batch,timeout=15)
        elif type_=='started':client.rotor_session_feedback_track_started(session,track,batch,timeout=15)
        elif type_=='finished':client.rotor_session_feedback_track_finished(session,track,seconds,batch,timeout=15)
        elif type_=='skip':client.rotor_session_feedback_skip(session,track,seconds,batch,timeout=15)
        else:raise PublicError('Неизвестное событие воспроизведения')
        result={'sent':True}
    else:raise PublicError('Неизвестная операция Яндекс Музыки')
    print(json.dumps({'ok':True,**result},ensure_ascii=False))
except Exception as error:
    print(json.dumps({'ok':False,'error':str(error) if isinstance(error,PublicError) else 'Яндекс Музыка временно не ответила. Повторите попытку','category':type(error).__name__},ensure_ascii=False));sys.exit(1)
