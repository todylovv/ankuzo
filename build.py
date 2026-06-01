import json, datetime, sys

summary = json.load(open('/tmp/summary.json'))
recent1 = json.load(open('/tmp/recent1.json'))
recent2 = json.load(open('/tmp/recent2.json'))
owned1  = json.load(open('/tmp/owned1.json'))
owned2  = json.load(open('/tmp/owned2.json'))

players = {p['steamid']: p for p in summary.get('response',{}).get('players',[])}
p1 = players.get('76561199770575251', {})
p2 = players.get('76561198165374024', {})

def acc_info(p):
    state_map = {0:'offline',1:'online',2:'busy',3:'away',4:'snooze',5:'looking to trade',6:'looking to play'}
    return {
        'name': p.get('personaname',''),
        'avatar': p.get('avatarfull',''),
        'status': state_map.get(p.get('personastate',0),'offline'),
        'online': p.get('personastate',0) > 0,
        'gameextrainfo': p.get('gameextrainfo',''),
        'gameid': p.get('gameid',''),
    }

owned1_games = owned1.get('response',{}).get('games',[])
owned2_games = owned2.get('response',{}).get('games',[])

merged = {}
for g in owned1_games + owned2_games:
    aid = g.get('appid')
    if aid not in merged:
        merged[aid] = {'appid':aid,'name':g.get('name',''),'playtime_forever':0}
    merged[aid]['playtime_forever'] += g.get('playtime_forever',0)

all_games = list(merged.values())
top8 = sorted(all_games, key=lambda g: g['playtime_forever'], reverse=True)[:8]
top3_banners = [
    {'appid':g['appid'],'name':g['name'],'hours':round(g['playtime_forever']/60,1),
     'banner':f"https://cdn.akamai.steamstatic.com/steam/apps/{g['appid']}/header.jpg"}
    for g in top8[:3]
]

total_hours = sum(g['playtime_forever'] for g in all_games) // 60
total_games = len(all_games)
recent1_games = recent1.get('response',{}).get('games',[])
recent2_games = recent2.get('response',{}).get('games',[])
total_2w = sum(g.get('playtime_2weeks',0) for g in recent1_games+recent2_games)/60

# FACEIT через lcrypt.eu прокси
try:
    raw = open('/tmp/faceit.json').read().strip()
    print('FACEIT raw:', raw[:200], file=sys.stderr)
    fp = json.loads(raw)
    faceit = {
        'nickname': fp.get('nickname', 'nuBac'),
        'level':    fp.get('level', 0),
        'elo':      fp.get('elo', 0),
        'kd':       fp.get('lifetime', {}).get('Average K/D Ratio', '—'),
        'winrate':  fp.get('lifetime', {}).get('Win Rate %', '—'),
        'matches':  fp.get('lifetime', {}).get('Matches', '—'),
        'hs':       fp.get('lifetime', {}).get('Average Headshots %', '—'),
    }
    print('FACEIT OK: level', faceit['level'], 'elo', faceit['elo'], file=sys.stderr)
except Exception as e:
    faceit = {'error': str(e)}
    print('FACEIT error:', e, file=sys.stderr)

result = {
    'updated': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'accounts': [acc_info(p1), acc_info(p2)],
    'stats': {'total_games':total_games,'total_hours':total_hours,'hours_2weeks':round(total_2w,1)},
    'top3_banners': top3_banners,
    'top': [{'appid':g['appid'],'name':g['name'],'hours':round(g['playtime_forever']/60,1)} for g in top8],
    'faceit': faceit,
}

with open('steam-data.json','w') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print('Done | Steam:', total_games, 'games | FACEIT:', faceit.get('elo', faceit.get('error','?')))
