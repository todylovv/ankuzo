import {test} from 'node:test';import assert from 'node:assert/strict';import {Queue} from '../lib/queue.mjs';
const url='https://youtu.be/BaW_jenozKc';const ya=n=>({url:'https://music.yandex.ru/album/12/track/'+n,title:'Background '+n,duration:30});
const order=(q,user)=>{const x=q.add({url,user,redemptionId:'r-'+user,rewardId:'reward'});q.ready(x.id,{title:user,duration:20,filename:x.id+'.mp4'});return x;};
const background=(q,index)=>{const x=q.backgroundEnsure(index);q.ready(x.id,{title:'Background '+index,duration:30,filename:x.id+'.mp3'});return x;};
test('moving queued orders preserves current playback and settlement data',()=>{
 const q=new Queue();const a=order(q,'a'),b=order(q,'b'),c=order(q,'c');q.play();q.move(c.id,b.id);assert.deepEqual(q.snapshot().items.filter(x=>x.status==='ready').map(x=>x.id),[c.id,b.id]);assert.equal(q.snapshot().current.id,a.id);assert.equal(q.item(c.id).redemptionId,'r-c');assert.throws(()=>q.move(a.id,b.id));assert.throws(()=>q.move(b.id,a.id));q.move(c.id,null);assert.deepEqual(q.snapshot().items.filter(x=>x.status==='ready').map(x=>x.id),[b.id,c.id]);
});
test('orders wait for the background boundary and then return to the following background song',()=>{
 const q=new Queue();q.backgroundSet({kind:'likes',title:'Likes',tracks:[ya(1),ya(2),ya(3)]});const a=background(q,0),b=background(q,1);q.play();assert.equal(q.snapshot().current.id,a.id);const x=order(q,'x'),y=order(q,'y');assert.equal(q.snapshot().current.id,a.id);q.heartbeat('player-1');const end=()=>q.playerEvent('player-1',{type:'ended',id:q.snapshot().current.id,epoch:q.snapshot().epoch});end();assert.equal(q.snapshot().current.id,x.id);end();assert.equal(q.snapshot().current.id,y.id);end();assert.equal(q.snapshot().current.id,b.id);assert.equal(q.snapshot().background.index,1);
});
test('changing background never interrupts a paid order and stale background items disappear',()=>{
 const q=new Queue();const paid=order(q,'paid');q.play();q.backgroundSet({kind:'likes',title:'Likes',tracks:[ya(1),ya(2)]});const old=background(q,0);q.backgroundSet({kind:'track',title:'Other',tracks:[ya(3)]});assert.equal(q.snapshot().current.id,paid.id);assert.equal(q.findItem(old.id),null);assert.equal(q.snapshot().items.length,1);assert.equal(q.item(paid.id).redemptionId,'r-paid');
});
test('background next and previous change selection without interrupting a foreground order',()=>{
 const q=new Queue();q.backgroundSet({kind:'likes',title:'Likes',tracks:[ya(1),ya(2),ya(3)]});background(q,0);background(q,1);q.play();q.backgroundStep(1);assert.equal(q.snapshot().background.index,1);const selected=background(q,1);assert.equal(q.snapshot().current.id,selected.id);const paid=order(q,'paid');q.skip();assert.equal(q.snapshot().current.id,paid.id);const before=q.snapshot().background.index;q.backgroundStep(-1);assert.equal(q.snapshot().current.id,paid.id);assert.notEqual(q.snapshot().background.index,before);
});
