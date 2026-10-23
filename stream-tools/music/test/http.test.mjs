import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.mjs';

test('viewer token cannot issue administrator commands or read Twitch details',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'ankuzo-http-'));
 const app=createApp({directory,adminKey:'test-admin-key',origin:'http://localhost',startWorkers:false});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
 try{
  assert.equal((await fetch(base+'/api/state')).status,401);
  assert.equal((await fetch(base+'/api/state',{headers:{Authorization:'Bearer test-admin-key'}})).status,200);
  const viewer='/view/'+app.viewerToken;
  const view=await (await fetch(base+viewer+'/api/state')).json();assert.equal('twitch' in view,false);assert.equal('items' in view,false);
  assert.equal((await fetch(base+viewer+'/api/control',{method:'POST',headers:{'Content-Type':'application/json','X-Ankuzo-Music':'1'},body:'{"action":"skip"}'})).status,403);
  assert.equal((await fetch(base+'/view/wrong/api/state')).status,401);
  for(const path of ['/api/vk/qr','/api/yandex/connect','/api/vk/connect','/api/yandex/library','/api/yandex/search?q=test','/api/background','/local-audio.js']){
   assert.equal((await fetch(base+path)).status,401);
   assert.equal((await fetch(base+viewer+path)).status,403);
  }
  assert.equal((await fetch(base+'/api/control',{method:'POST',headers:{Authorization:'Bearer test-admin-key','Content-Type':'application/json',Origin:'https://evil.test','X-Ankuzo-Music':'1'},body:'{"action":"skip"}'})).status,403);
 }finally{app.close();await new Promise(resolve=>app.server.close(resolve));rmSync(directory,{recursive:true,force:true});}
});
test('media ranges stay local, and viewer can only acknowledge its current playback',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'ankuzo-http-'));
 const app=createApp({directory,adminKey:'test-admin-key',origin:'http://localhost',startWorkers:false});
 const item=app.queue.add({url:'https://youtu.be/BaW_jenozKc'});writeFileSync(join(directory,'media',item.id+'.mp4'),'0123456789');app.queue.ready(item.id,{title:'Test',duration:15,filename:item.id+'.mp4'});app.queue.play();
 writeFileSync(join(directory,'media',item.id+'.cover.jpg'),Buffer.from([255,216,255,224]));app.queue.artwork(item.id,item.id+'.cover.jpg');
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;const viewer='/view/'+app.viewerToken;
 try{
  const response=await fetch(base+viewer+'/media/'+item.id,{headers:{Range:'bytes=2-5'}});assert.equal(response.status,206);assert.equal(await response.text(),'2345');assert.equal(response.headers.get('content-range'),'bytes 2-5/10');
  assert.equal((await fetch(base+viewer+'/media/'+item.id,{headers:{Range:'bytes=999-'}})).status,416);
  assert.equal((await fetch(base+viewer+'/api/twitch')).status,403);
  const state=await (await fetch(base+viewer+'/api/state')).json();assert.equal(state.current.hasCover,true);assert.equal('coverFilename' in state.current,false);
  const cover=await fetch(base+viewer+'/cover/'+item.id);assert.equal(cover.status,200);assert.equal(cover.headers.get('content-type'),'image/jpeg');assert.equal((await cover.arrayBuffer()).byteLength,4);
 }finally{app.close();await new Promise(resolve=>app.server.close(resolve));rmSync(directory,{recursive:true,force:true});}
});

test('site player needs administrator access and cannot impersonate OBS',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'ankuzo-site-player-'));const app=createApp({directory,adminKey:'test-admin-key',origin:'http://localhost',startWorkers:false});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 const post=(path,data,admin=true)=>fetch(base+path,{method:'POST',headers:{...(admin?{Authorization:'Bearer test-admin-key'}:{}),'Content-Type':'application/json','X-Ankuzo-Music':'1',Origin:'http://localhost'},body:JSON.stringify(data)});
 try{
  assert.equal((await post('/api/preview-player',{player:'preview-1'},false)).status,401);
  assert.equal((await post('/view/'+app.viewerToken+'/api/preview-player',{player:'preview-1'})).status,403);
  const a=await (await post('/api/preview-player',{player:'preview-1',kind:'obs'})).json();assert.equal(a.owner,true);assert.equal(a.playerKind,'preview');
  const b=await (await post('/view/'+app.viewerToken+'/api/player',{player:'obs-player'})).json();assert.equal(b.owner,true);
  const blocked=await (await post('/api/preview-player',{player:'preview-1',kind:'obs'})).json();assert.equal(blocked.owner,false);assert.equal(blocked.playerKind,'obs');
  await post('/view/'+app.viewerToken+'/api/player',{player:'obs-player',type:'release'});const resumed=await (await post('/api/preview-player',{player:'preview-1'})).json();assert.equal(resumed.owner,true);
 }finally{app.close();await new Promise(r=>app.server.close(r));rmSync(directory,{recursive:true,force:true});}
});
