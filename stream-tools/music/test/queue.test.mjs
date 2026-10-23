import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Queue} from '../lib/queue.mjs';
import {parseSource} from '../lib/media.mjs';

test('only supported canonical media links can enter the resolver',()=>{
 assert.deepEqual(parseSource('https://youtu.be/BaW_jenozKc?t=1'),{provider:'youtube',url:'https://www.youtube.com/watch?v=BaW_jenozKc'});
 for(const url of ['http://127.0.0.1/a','https://youtube.com.evil.test/watch?v=BaW_jenozKc','https://evil@youtube.com/watch?v=BaW_jenozKc','file:///etc/passwd','https://www.youtube.com/playlist?list=x','https://vk.com/feed','https://youtube.com:444/watch?v=BaW_jenozKc']) assert.throws(()=>parseSource(url));
 assert.equal(parseSource('https://vkvideo.ru/video-123_456').provider,'vk');
 assert.equal(parseSource('https://open.spotify.com/track/123abc').provider,'spotify');
 assert.equal(parseSource('https://music.yandex.ru/album/12/track/34').provider,'yandex');
});
test('duplicate redemption is persisted once across restart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ankuzo-'));try{
 const file=join(dir,'state.json');const a=new Queue({file});
 const first=a.add({url:'https://youtu.be/BaW_jenozKc',redemptionId:'r1',rewardId:'reward',user:'viewer'});
 const b=new Queue({file});assert.equal(b.add({url:'https://youtu.be/BaW_jenozKc',redemptionId:'r1',rewardId:'reward',user:'viewer'}).id,first.id);
 assert.equal(b.snapshot().items.length,1);
 assert.equal(JSON.parse(readFileSync(file)).items.length,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('stale player events cannot skip a newer track or duplicate completion',()=>{
 let now=1000;const q=new Queue({now:()=>now});
 const a=q.add({url:'https://youtu.be/BaW_jenozKc',user:'a'});const b=q.add({url:'https://youtu.be/BaW_jenozKc',user:'b'});
 for(const x of [a,b])q.ready(x.id,{title:'Test',duration:15,filename:x.id+'.mp4'});
 q.play();assert.equal(q.snapshot().current.id,a.id);
 const lease=q.heartbeat('player-1');assert.equal(lease.owner,true);
 assert.equal(q.heartbeat('player-2').owner,false);
 q.playerEvent('player-1',{type:'ended',id:a.id});assert.equal(q.snapshot().current.id,b.id);
 q.playerEvent('player-1',{type:'ended',id:a.id});assert.equal(q.snapshot().current.id,b.id);
 q.playerEvent('player-2',{type:'ended',id:b.id});assert.equal(q.snapshot().current.id,b.id);
 now+=9000;assert.equal(q.heartbeat('player-2').owner,true);
});
test('restart pauses playback and preserves queue/settings',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ankuzo-'));try{
 const file=join(dir,'state.json');const q=new Queue({file});const a=q.add({url:'https://youtu.be/BaW_jenozKc'});q.ready(a.id,{title:'Track',duration:90,filename:a.id+'.mp4'});q.settings({showVideo:false,volume:0.4});q.play();
 const restored=new Queue({file});assert.equal(restored.snapshot().playing,false);assert.equal(restored.snapshot().current.id,a.id);assert.equal(restored.snapshot().settings.showVideo,false);assert.equal(restored.snapshot().settings.volume,0.4);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('a refund is an idempotent durable operation and failed refunds remain retryable',async()=>{
 const q=new Queue();const a=q.add({url:'https://youtu.be/BaW_jenozKc',redemptionId:'r2',rewardId:'rw'});let calls=0;
 await assert.rejects(q.refund(a.id,async()=>{calls++;throw Error('network');}));
 assert.equal(q.snapshot().items[0].refund,'retry');
 await q.refund(a.id,async()=>{calls++;});await q.refund(a.id,async()=>{calls++;});
 assert.equal(calls,2);assert.equal(q.snapshot().items[0].refund,'returned');assert.equal(q.snapshot().items[0].status,'rejected');
});
test('out of order resolution does not move a later order ahead',()=>{
 const q=new Queue();const a=q.add({url:'https://youtu.be/BaW_jenozKc'});const b=q.add({url:'https://youtu.be/BaW_jenozKc'});
 q.ready(b.id,{title:'B',duration:20,filename:b.id+'.mp4'});q.play();assert.equal(q.snapshot().current,null);
 q.ready(a.id,{title:'A',duration:20,filename:a.id+'.mp4'});assert.equal(q.snapshot().current.id,a.id);
});
test('invalid settings and manual refunds do not mutate state',async()=>{
 const q=new Queue();assert.throws(()=>q.settings({volume:2}));assert.throws(()=>q.settings({maxDuration:-1}));assert.throws(()=>q.settings({showVideo:'false'}));
 const a=q.add({url:'https://youtu.be/BaW_jenozKc'});await assert.rejects(q.refund(a.id,async()=>{}));assert.equal(q.snapshot().items[0].status,'resolving');
});
test('album and playlist links are rejected instead of silently taking the first track',()=>{
 for(const url of ['https://open.spotify.com/album/abc123','https://open.spotify.com/playlist/abc123','https://music.yandex.ru/album/123','https://music.yandex.ru/users/user/playlists/1','https://www.youtube.com/watch?v=BaW_jenozKc&list=PL123','https://www.youtube.com/playlist?list=PL123'])assert.throws(()=>parseSource(url));
});
test('waiting for OBS does not consume a track and stale progress does not undo a seek',()=>{
 let now=0;const q=new Queue({now:()=>now});const item=q.add({url:'https://youtu.be/BaW_jenozKc'});q.ready(item.id,{title:'Track',duration:90,filename:item.id+'.mp4'});q.play();now=30000;assert.equal(q.snapshot().position,0);
 q.heartbeat('player-1');const previous=q.snapshot().epoch;q.seek(45);q.playerEvent('player-1',{type:'progress',id:item.id,position:2,epoch:previous});assert.equal(q.snapshot().position,45);
});


test('OBS preempts site playback, and the site cannot overwrite its progress',()=>{
 let now=1000;const q=new Queue({now:()=>now});const a=q.add({url:'https://youtu.be/BaW_jenozKc'});q.ready(a.id,{title:'Track',duration:90});q.play();
 assert.equal(q.heartbeat('preview-1','preview').owner,true);assert.equal(q.snapshot().playerKind,'preview');
 assert.equal(q.heartbeat('obs-player','obs').owner,true);assert.equal(q.heartbeat('preview-1','preview').owner,false);
 q.playerEvent('preview-1',{type:'progress',id:a.id,position:50,epoch:q.snapshot().epoch});assert.equal(q.snapshot().position,0);
 q.playerEvent('obs-player',{type:'progress',id:a.id,position:20,epoch:q.snapshot().epoch});assert.equal(q.snapshot().position,20);
 q.release('obs-player');assert.equal(q.heartbeat('preview-1','preview').owner,true);
 now+=8000;assert.equal(q.heartbeat('preview-2','preview').owner,true);
});

test('turning autoplay off waits for play after a track ends; manual skip still works',()=>{
 const q=new Queue();const add=()=>{const x=q.add({url:'https://youtu.be/BaW_jenozKc'});q.ready(x.id,{title:'Track',duration:20});return x;};const a=add(),b=add();
 q.settings({autoPlay:false});q.play();q.heartbeat('preview-1','preview');q.playerEvent('preview-1',{type:'ended',id:a.id,epoch:q.snapshot().epoch});assert.equal(q.snapshot().playing,false);assert.equal(q.snapshot().current,null);assert.equal(q.item(b.id).status,'ready');
 q.play();assert.equal(q.snapshot().current.id,b.id);const c=add();q.skip();assert.equal(q.snapshot().current.id,c.id);assert.equal(q.snapshot().playing,true);
 q.settings({autoPlay:true});const d=add();q.playerEvent('preview-1',{type:'ended',id:c.id,epoch:q.snapshot().epoch});assert.equal(q.snapshot().current.id,d.id);assert.equal(q.snapshot().playing,true);assert.throws(()=>q.settings({autoPlay:'false'}));
});
