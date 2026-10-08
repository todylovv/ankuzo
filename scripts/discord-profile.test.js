import assert from 'node:assert/strict';
import test from 'node:test';
import { toDiscordProfile } from '../src/data/discordProfile.ts';

test('Discord cosmetics survive the public snapshot adapter', () => {
  const profile=toDiscordProfile({ username:'ankuz0', nameplate:{imageUrl:'https://cdn.discordapp.com/static.png',videoUrl:'https://cdn.discordapp.com/asset.webm'}, nameStyle:{colors:['#dd71ab','#faf1fa'],fontId:3,effectId:2}, createdAt:'2018-11-21T17:20:38.345Z' });
  assert.equal(profile.nameplate.videoUrl,'https://cdn.discordapp.com/asset.webm');
  assert.deepEqual(profile.nameStyle.colors,['#dd71ab','#faf1fa']);
  assert.equal(profile.createdAt,'2018-11-21T17:20:38.345Z');
});
test('missing presence and bio are unknown rather than offline or invented prose',()=>{
  const profile=toDiscordProfile({username:'ankuz0'});
  assert.equal(profile.presence,'unknown');
  assert.equal(profile.bio,'');
  assert.equal(profile.customStatus,'');
});
test('stale presence is not presented as current and malformed style data is harmless',()=>{
  const profile=toDiscordProfile({presence:'online',updatedAt:'2000-01-01T00:00:00Z',nameStyle:{colors:['url(bad)','#ffffff'],fontId:3,effectId:2}});
  assert.equal(profile.presence,'unknown');
  assert.deepEqual(profile.nameStyle.colors,['#ffffff']);
});
import { discordSnapshot } from './discord-profile.js';

test('the updater retains active cosmetics and distinguishes an unmonitored account',()=>{
  const data=discordSnapshot({data:{id:'123',username:'me',avatar:'a_hash',accent_color:0,collectibles:{nameplate:{asset:'nameplates/collection/item/'}},display_name_styles:{colors:[14512299,16445946],font_id:3,effect_id:2}},presence:{error:'not monitored'}},{success:false});
  assert.equal(data.presence,'unknown');
  assert.equal(data.bio,'');
  assert.equal(data.accentColor,'#000000');
  assert.match(data.avatarUrl,/a_hash\.gif/);
  assert.equal(data.nameplate.videoUrl,'https://cdn.discordapp.com/assets/collectibles/nameplates/collection/item/asset.webm');
  assert.deepEqual(data.nameStyle.colors,['#dd70ab','#faf1fa']);
});
test('confirmed presence and empty cosmetics override old snapshots without retaining stale assets',()=>{
  const data=discordSnapshot({data:{id:'123',username:'me',collectibles:null}},{success:true,data:{discord_status:'dnd',activities:[{type:4,state:'Writing'}]}},{nameplate:{videoUrl:'old'}});
  assert.equal(data.presence,'dnd');
  assert.equal(data.customStatus,'Writing');
  assert.equal(data.nameplate,null);
});
test('untrusted cosmetic paths cannot escape the Discord collectible directory',()=>{
  assert.equal(discordSnapshot({data:{collectibles:{nameplate:{asset:'nameplates/../other'}}}}).nameplate,null);
});
test('temporary profile-provider failure retains known cosmetics while updating confirmed presence',()=>{
  const plate={imageUrl:'https://cdn.discordapp.com/previous.png',videoUrl:'https://cdn.discordapp.com/previous.webm'};
  const data=discordSnapshot({}, {success:true,data:{discord_user:{id:'123',username:'me'},discord_status:'online'}}, {nameplate:plate,createdAt:'2018-11-21T17:20:38.345Z'});
  assert.deepEqual(data.nameplate,plate);
  assert.equal(data.presence,'online');
});
