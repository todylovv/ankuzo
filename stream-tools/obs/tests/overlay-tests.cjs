const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createServer}=require('../app/server.cjs');
async function setup(t,options={}){
 const server=createServer({persist:false,...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}`;
 const headers={'Content-Type':'application/json','X-Ankuzo-Control':'1',Origin:base,...(options.controlKey?{Authorization:'Bearer '+options.controlKey}:{})};
 const post=body=>fetch(base+'/api/control',{method:'POST',headers,body:JSON.stringify(body)});
 const state=async(scene='overlay')=>(await fetch(base+'/api/state?scene='+scene,{headers})).json();
 return{base,headers,post,state};
}
test('overlay starts as a compact independent webcam-free profile',async t=>{
 const {state}=await setup(t);const s=await state();
 assert.equal(s.scene,'overlay');assert.equal(s.settings.title,'Ankuzo');assert.equal(s.settings.position,'bottom-left');
 assert.equal(s.settings.overlayVisible,true);assert.equal(s.settings.showCards,true);assert.equal(s.settings.showSubtitle,true);
 assert.equal(s.timer.running,false);assert.equal(s.settings.showTimer,false);
});
test('placement and appearance are bounded; overlay cannot start a countdown',async t=>{
 const {post,state}=await setup(t);
 let r=await post({scene:'overlay',action:'settings',settings:{title:'x'.repeat(100),subtitle:'y'.repeat(100),position:'bad',size:'bad',marginX:999,marginY:-2,opacity:300}});
 assert.equal(r.status,200);const s=await r.json();
 assert.equal(s.settings.title.length,24);assert.equal(s.settings.subtitle.length,60);assert.equal(s.settings.position,'bottom-left');
 assert.equal(s.settings.size,'standard');assert.equal(s.settings.marginX,300);assert.equal(s.settings.marginY,0);assert.equal(s.settings.opacity,100);
 r=await post({scene:'overlay',action:'start'});assert.equal(r.status,400);assert.equal((await state()).timer.running,false);
});
test('saving any profile retains all three profiles after restart',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ankuzo-overlay-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const settingsFile=path.join(dir,'settings.json');fs.writeFileSync(settingsFile,JSON.stringify({title:'Мой старт',break:{title:'Мой перерыв'}}));
 const a=await setup(t,{persist:true,settingsFile});
 await a.post({scene:'overlay',action:'settings',settings:{position:'top-right',marginX:110,overlayVisible:false,title:'Мой канал'}});
 await a.post({scene:'break',action:'settings',settings:{subtitle:'Чай'}});
 await a.post({scene:'starting',action:'settings',settings:{minutes:7}});
 const b=await setup(t,{persist:true,settingsFile});
 assert.equal((await b.state()).settings.title,'Мой канал');assert.equal((await b.state()).settings.overlayVisible,false);
 assert.equal((await b.state()).settings.marginX,110);assert.equal((await b.state()).settings.position,'top-right');
 assert.equal((await b.state('starting')).settings.title,'Мой старт');assert.equal((await b.state('break')).settings.title,'Мой перерыв');
});
test('the overlay gets a viewer link while stream layout and administration remain private',async t=>{
 const {base,headers}=await setup(t,{controlKey:'test-admin-key',edgeAuth:true});
 const start=await(await fetch(base+'/api/obs-link',{headers})).json();
 const overlay=await(await fetch(base+'/api/obs-link?scene=overlay',{headers})).json();
 assert.equal(overlay.url,start.url.replace('scene.html','overlay.html'));
 for(const name of ['overlay.html','overlay.css','overlay.js','api/state?scene=overlay'])assert.equal((await fetch(new URL(name,overlay.url))).status,200,name);
 for(const name of ['layout.html','layout.js','control.html','api/obs-link'])assert.equal((await fetch(new URL(name,overlay.url))).status,403,name);
 assert.equal((await fetch(base+'/layout.html')).status,401);
 assert.equal((await fetch(base+'/overlay.html')).status,401);
 assert.equal((await fetch(base+'/layout.html',{headers})).status,200);
});
test('background and repeating appearance settings survive persistence and reject unsafe timing',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ankuzo-repeat-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const settingsFile=path.join(dir,'settings.json');const a=await setup(t,{persist:true,settingsFile});
 await a.post({scene:'overlay',action:'settings',settings:{showBackground:false,appearanceMode:'periodic',intervalSeconds:30,visibleSeconds:999}});
 const b=await setup(t,{persist:true,settingsFile});const s=(await b.state()).settings;
 assert.equal(s.showBackground,false);assert.equal(s.appearanceMode,'periodic');assert.equal(s.intervalSeconds,30);assert.equal(s.visibleSeconds,29);
 await b.post({scene:'overlay',action:'settings',settings:{appearanceMode:'invalid',intervalSeconds:-1,visibleSeconds:-9}});
 const bounded=(await b.state()).settings;assert.equal(bounded.appearanceMode,'always');assert.equal(bounded.intervalSeconds,30);assert.equal(bounded.visibleSeconds,3);
});
test('periodic overlay follows server time, preserves cycle while editing text, and obeys manual hiding',async t=>{
 let time=1000000;const {state,post}=await setup(t,{now:()=>time});
 assert.deepEqual((await state()).appearance,{visible:true,nextChangeAt:null});
 await post({scene:'overlay',action:'settings',settings:{appearanceMode:'periodic',intervalSeconds:300,visibleSeconds:15}});
 assert.deepEqual((await state()).appearance,{visible:true,nextChangeAt:1015000});
 time+=15000;assert.deepEqual((await state()).appearance,{visible:false,nextChangeAt:1300000});
 await post({scene:'overlay',action:'settings',settings:{title:'Новое имя'}});assert.equal((await state()).appearance.visible,false);
 time=1300000;assert.deepEqual((await state()).appearance,{visible:true,nextChangeAt:1315000});
 await post({scene:'overlay',action:'settings',settings:{overlayVisible:false}});time+=400000;assert.deepEqual((await state()).appearance,{visible:false,nextChangeAt:null});
 await post({scene:'overlay',action:'settings',settings:{overlayVisible:true}});assert.deepEqual((await state()).appearance,{visible:true,nextChangeAt:1715000});
 await post({scene:'overlay',action:'settings',settings:{appearanceMode:'always'}});assert.deepEqual((await state()).appearance,{visible:true,nextChangeAt:null});
});
