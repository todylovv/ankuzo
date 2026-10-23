import {test} from 'node:test';import assert from 'node:assert/strict';import {Queue} from '../lib/queue.mjs';import {Background} from '../lib/background.mjs';
const track=n=>({url:'https://music.yandex.ru/album/12/track/'+n,title:'Track '+n,trackId:String(n),duration:30});
test('background source generations ignore an earlier slow selection',async()=>{
 const q=new Queue();let release;const yandex={catalog:async s=>s.key==='1:12'?new Promise(r=>{release=r;}):{title:'Fast',tracks:[track(2)]}};const bg=new Background({queue:q,yandex,media:{work:async()=>{}}});const old=bg.configure({kind:'track',key:'1:12'});await bg.configure({kind:'track',key:'2:12'});release({title:'Slow',tracks:[track(1)]});await assert.rejects(old);assert.equal(q.state.background.title,'Fast');
});
test('background prefetch prepares only current and next and keeps requests separate',async()=>{
 const q=new Queue();const prepared=[];const bg=new Background({queue:q,yandex:{catalog:async()=>({title:'Likes',tracks:[track(1),track(2),track(3)]})},media:{work:async queue=>{for(const i of queue.allItems().filter(i=>i.status==='resolving')){prepared.push(i.backgroundIndex);queue.ready(i.id,{title:i.title,duration:30,filename:i.id+'.mp3'});}}}});await bg.configure({kind:'likes'});await bg.tick();assert.deepEqual(prepared,[0,1]);assert.equal(q.snapshot().items.length,0);assert.equal(q.snapshot().current.lane,'background');
});
