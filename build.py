import json, datetime, os

summary = json.load(open('/tmp/summary.json'))
recent1 = json.load(open('/tmp/recent1.json'))
recent2 = json.load(open('/tmp/recent2.json'))
owned1  = json.load(open('/tmp/owned1.json'))
owned2  = json.load(open('/tmp/owned2.json'))
faceit  = json.load(open('/tmp/faceit.json'))
apex    = json.load(open('/tmp/apex.json'))

players = {p['steamid']: p for p in summary.get('response',{}).get('players',[])}
steam_id1 = os.environ.get('STEAM_ID1', '76561199770575251')
steam_id2 = os.environ.get('STEAM_ID2', '76561198165374024')
p1 = players.get(steam_id1, {})
p2 = players.get(steam_id2, {})

def acc_info(p):
    return {
        'name': p.get('personaname',''),
        'avatar': p.get('avatarfull',''),
        'online': p.get('personastate',0) > 0,
        'gameextrainfo': p.get('gameextrainfo',''),
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

faceit_cs2 = faceit.get('games',{}).get('cs2',{})
faceit_card = None
if faceit.get('player_id') and faceit_cs2:
    faceit_card = {
        'service':'FACEIT',
        'account':'b1',
        'name':faceit.get('nickname','b1'),
        'url':faceit.get('faceit_url','').replace('{lang}','en'),
        'level':faceit_cs2.get('skill_level'),
        'elo':faceit_cs2.get('faceit_elo'),
    }

def apex_stat(stats, key):
    value = stats.get(key, {})
    return value.get('value') if isinstance(value, dict) else value

apex_data = apex.get('data',{})
overview = next((s for s in apex_data.get('segments',[]) if s.get('type') == 'overview'), {})
apex_stats = overview.get('stats',{})
rank = apex_stats.get('rankScore',{})
rank_meta = rank.get('metadata',{}) if isinstance(rank, dict) else {}
apex_card = None
if apex_data:
    apex_card = {
        'service':'APEX',
        'account':'b2',
        'name':apex_data.get('platformInfo',{}).get('platformUserHandle','b2'),
        'url':'https://apex.tracker.gg/apex/profile/steam/76561198165374024/overview',
        'rank':rank_meta.get('rankName') or rank_meta.get('rankNameShort') or '',
        'rp':apex_stat(apex_stats,'rankScore'),
        'level':apex_stat(apex_stats,'level'),
        'kills':apex_stat(apex_stats,'kills'),
        'damage':apex_stat(apex_stats,'damage'),
    }

result = {
    'updated': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'accounts': [acc_info(p1), acc_info(p2)],
    'stats': {'total_games':total_games,'total_hours':total_hours,'hours_2weeks':round(total_2w,1)},
    'top3_banners': top3_banners,
    'top': [{'appid':g['appid'],'name':g['name'],'hours':round(g['playtime_forever']/60,1)} for g in top8],
    'profiles': [p for p in (faceit_card, apex_card) if p],
}

with open('steam-data.json','w') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print('Done | Steam:', total_games, 'games')
