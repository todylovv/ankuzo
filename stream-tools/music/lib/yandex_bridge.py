"""Private SDK bridge. OAuth credentials never leave the server-side files."""
import json, sys, os, time, re
from pathlib import Path
from yandex_music import Client

command, directory = sys.argv[1:3]
root = Path(directory)
auth_file = root / 'yandex-auth.json'
device_file = root / 'yandex-device.json'
def read(file):
    try: return json.loads(file.read_text())
    except FileNotFoundError: return {}
def save(file,value):
    temporary=file.with_suffix('.tmp')
    temporary.write_text(json.dumps(value),encoding='utf-8');os.chmod(temporary,0o600);temporary.replace(file)
def public():
    auth=read(auth_file);device=read(device_file)
    return {'connected':bool(auth.get('access_token')),'login':auth.get('login'),'hasPlus':auth.get('hasPlus'), 'pending':{key:device[key] for key in ['userCode','verificationUri','expiresAt'] if key in device} if device.get('expiresAt',0)>time.time()*1000 else None}
try:
    if command=='connect':
        if not public()['pending']:
            code=Client().request_device_code(device_name='Ankuzo OBS music')
            save(device_file,{'deviceCode':code.device_code,'userCode':code.user_code,'verificationUri':code.verification_url,'expiresAt':time.time()*1000+code.expires_in*1000,'interval':code.interval,'nextPoll':0})
        result=public()
    elif command=='poll':
        device=read(device_file)
        if device.get('expiresAt',0)>time.time()*1000 and device.get('nextPoll',0)<time.time()*1000:
            device['nextPoll']=time.time()*1000+max(device.get('interval',5),5)*1000;save(device_file,device)
            token=Client().poll_device_token(device['deviceCode'])
            if token:
                value={'access_token':token.access_token,'refresh_token':token.refresh_token,'expiresAt':time.time()*1000+token.expires_in*1000}
                save(auth_file,value);save(device_file,{})
                client=Client(token.access_token).init()
                value.update({'login':client.me.account.login,'hasPlus':bool(client.me.plus and client.me.plus.has_plus)})
                save(auth_file,value)
        result=public()
    elif command=='cover':
        track_id=sys.argv[3]
        if not re.fullmatch(r'\d+:\d+',track_id):raise ValueError('invalid track')
        auth=read(auth_file)
        if not auth.get('access_token'):raise PermissionError('connect required')
        track=Client(auth['access_token']).init().tracks([track_id])[0]
        result={'coverUrl':track.get_cover_url('600x600') if track.cover_uri else None}
    elif command=='prepare':
        track_id,job_id,max_duration=sys.argv[3:6]
        if not re.fullmatch(r'\d+:\d+',track_id) or not re.fullmatch(r'[a-f0-9-]{36}',job_id):raise ValueError('invalid track')
        auth=read(auth_file)
        if not auth.get('access_token'):raise PermissionError('connect required')
        client=Client(auth['access_token']).init()
        tracks=client.tracks([track_id])
        if len(tracks)!=1:raise ValueError('one track required')
        track=tracks[0];duration=(track.duration_ms or 0)/1000
        if duration<1 or duration>int(max_duration):raise ValueError('duration limit')
        options=[option for option in track.get_download_info() if option.codec=='mp3']
        if not options:raise PermissionError('full track unavailable')
        option=max(options,key=lambda x:x.bitrate_in_kbps)
        filename=job_id+'.mp3';track.download(str(root/'media'/filename),codec='mp3',bitrate_in_kbps=option.bitrate_in_kbps)
        result={'title':', '.join(artist.name for artist in track.artists)+' — '+track.title,'duration':int(duration+0.999),'filename':filename,'resolvedProvider':'yandex','substituted':False,'coverUrl':track.get_cover_url('600x600') if track.cover_uri else None}
    else:result=public()
    print(json.dumps({'ok':True,**result},ensure_ascii=False))
except Exception as error:
    # SDK errors may contain signed download URLs. Return only a safe classification.
    reason='Подключите Яндекс Музыку в настройках' if isinstance(error,PermissionError) else 'Превышен лимит длительности или трек недоступен' if isinstance(error,ValueError) else 'Яндекс не подтвердил доступ. Проверьте вход и подписку Плюс'
    print(json.dumps({'ok':False,'error':reason,'category':type(error).__name__},ensure_ascii=False))
    sys.exit(1)
