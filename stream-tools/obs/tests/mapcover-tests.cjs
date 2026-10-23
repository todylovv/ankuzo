const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createServer}=require('../app/server.cjs');
async function setup(t,options={}){
 const server=createServer({persist:false,...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`,headers={'Content-Type':'application/json','X-Ankuzo-Control':'1',Origin:base,...(options.controlKey?{Authorization:'Bearer '+options.controlKey}:{})};
 return {base,headers,state:async scene=>(await fetch(base+'/api/state?scene='+scene,{headers})).json(),post:body=>fetch(base+'/api/control',{method:'POST',headers,body:JSON.stringify(body)})};
}
test('minimap cover has an independent opaque always-on profile and bounded final-canvas geometry',async t=>{
 const {state,post}=await setup(t);const initial=await state('mapcover');assert.equal(initial.scene,'mapcover');assert.equal(initial.settings.coverVisible,true);assert.equal(initial.settings.width,360);assert.equal(initial.settings.height,360);assert.equal(initial.settings.shape,'square');assert.equal(initial.settings.chatEnabled,true);
 const response=await post({scene:'mapcover',action:'settings',settings:{shape:'rectangle',width:9999,height:-1,x:1900,y:1079,opacity:0,appearanceMode:'periodic',chatDuration:999,chatLines:99,title:'x'.repeat(100)}});assert.equal(response.status,200);const s=(await response.json()).settings;
 assert.equal(s.width,800);assert.equal(s.height,120);assert.equal(s.x,1120);assert.equal(s.y,960);assert.equal(s.title.length,24);assert.equal(s.opacity,undefined);assert.equal(s.appearanceMode,undefined);assert.equal(s.chatDuration,60);assert.equal(s.chatLines,2);
 assert.equal((await post({scene:'mapcover',action:'start'})).status,400);assert.equal((await state('overlay')).settings.title,'Ankuzo');
});
test('all four profile settings survive edits and service restart',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ankuzo-mapcover-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const settingsFile=path.join(dir,'settings.json');
 const a=await setup(t,{persist:true,settingsFile});
 await a.post({scene:'mapcover',action:'settings',settings:{shape:'rectangle',width:420,height:350,x:40,y:22,chatEnabled:false}});
 for(const scene of ['starting','break','overlay'])await a.post({scene,action:'settings',settings:{title:scene}});
 const b=await setup(t,{persist:true,settingsFile});const s=(await b.state('mapcover')).settings;assert.equal(s.width,420);assert.equal(s.height,350);assert.equal(s.x,40);assert.equal(s.chatEnabled,false);
 for(const scene of ['starting','break','overlay'])assert.equal((await b.state(scene)).settings.title,scene);
});
test('square and circle lock equal sides; rectangular covers keep independent height',async t=>{
 const {post,state}=await setup(t);
 for(const shape of ['square','circle']){await post({scene:'mapcover',action:'settings',settings:{shape,width:390,height:180,x:1900,y:1080}});const s=(await state('mapcover')).settings;assert.equal(s.shape,shape);assert.equal(s.width,390);assert.equal(s.height,390);assert.equal(s.x,1530);assert.equal(s.y,690);}
 await post({scene:'mapcover',action:'settings',settings:{shape:'rectangle',height:250}});assert.equal((await state('mapcover')).settings.height,250);
 await post({scene:'mapcover',action:'settings',settings:{shape:'bad'}});assert.equal((await state('mapcover')).settings.shape,'square');assert.equal((await state('mapcover')).settings.height,390);
});
test('viewer mapcover and chat are read-only; chat history is bounded and administrator access stays private',async t=>{
 const chatFeed={start(){},close(){},snapshot(){return {channel:'ankuzo',status:'connected',serverNow:100,messages:[{id:'one',name:'Viewer',text:'Привет',color:'#abcdff',receivedAt:99}]};}};
 const {base,headers}=await setup(t,{controlKey:'admin-test-key',edgeAuth:true,chatFeed});const r=await fetch(base+'/api/obs-link?scene=mapcover',{headers});assert.equal(r.status,200);const {url}=await r.json();assert.ok(url.endsWith('/mapcover.html'));
 for(const name of ['mapcover.html','mapcover.css','mapcover.js','assets/mapcover-seal-v1.png','api/chat'])assert.equal((await fetch(new URL(name,url))).status,200,name);
 assert.equal((await fetch(new URL('api/chat',url),{method:'POST'})).status,403);assert.equal((await fetch(new URL('control.html',url))).status,403);assert.equal((await fetch(base+'/api/chat')).status,401);assert.equal((await fetch(new URL('api/chat',url))).headers.get('cache-control'),'no-store');
 assert.equal((await(await fetch(new URL('api/chat',url))).json()).messages[0].text,'Привет');
});
