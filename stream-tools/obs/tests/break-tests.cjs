const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createServer } = require('../app/server.cjs');
async function setup(t, options = {}) {
  const server=createServer({persist:false,...options});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=async data=>{
    const r=await fetch(base+'/api/control',{method:'POST',headers:{'Content-Type':'application/json','X-Ankuzo-Control':'1',Origin:base},body:JSON.stringify(data)});
    assert.equal(r.status,200);return r.json();
  };
  const state=async scene=>(await fetch(base+'/api/state'+(scene?'?scene='+scene:''))).json();
  return {base,post,state};
}
test('break has its own defaults and waits for manual countdown start',async t=>{
  const {state}=await setup(t);
  const s=await state('break');
  assert.equal(s.scene,'break');assert.equal(s.settings.title,'Перерыв');
  assert.equal(s.settings.subtitle,'Скоро вернусь');
  assert.equal(s.settings.timerLabel,'До возвращения');
  assert.equal(s.settings.finishedText,'Возвращаюсь');
  assert.equal(s.timer.running,false);assert.equal(s.settings.showTimer,false);
});
test('break text, duration, visibility and timer never change the starting scene',async t=>{
  const {post,state}=await setup(t);
  await post({action:'settings',settings:{title:'Мой старт',minutes:3}});
  await post({scene:'break',action:'settings',settings:{title:'Отошёл',subtitle:'Скоро буду',minutes:1.5}});
  const b=await post({scene:'break',action:'start'});
  assert.equal(b.timer.running,true);assert.equal(b.settings.showTimer,true);
  assert.equal(b.settings.minutes,1.5);assert.equal(b.settings.subtitle,'Скоро буду');
  const a=await state();assert.equal(a.settings.title,'Мой старт');
  assert.equal(a.settings.minutes,3);assert.equal(a.timer.running,false);assert.equal(a.settings.showTimer,false);
  await post({action:'start'});
  await post({scene:'break',action:'pause'});
  assert.equal((await state()).timer.running,true);
  assert.equal((await state('break')).timer.running,false);
});
test('break subtitle is bounded literal text and unknown scenes fail explicitly',async t=>{
  const {post,base}=await setup(t);
  const s=await post({scene:'break',action:'settings',settings:{subtitle:'<img src=x onerror=alert(1)>'+ 'x'.repeat(90)}});
  assert.equal(s.settings.subtitle.length,80);assert.ok(s.settings.subtitle.startsWith('<img'));
  assert.equal((await fetch(base+'/api/state?scene=typo')).status,400);
  assert.equal((await fetch(base+'/api/control',{method:'POST',headers:{'Content-Type':'application/json','X-Ankuzo-Control':'1',Origin:base},body:JSON.stringify({scene:'typo',action:'start'})})).status,400);
});
test('existing OBS links stay identical and the break link loads protected scene resources',async t=>{
  const key='test-administrator-capability';
  const {base}=await setup(t,{controlKey:key,edgeAuth:true});
  const headers={Authorization:'Bearer '+key};
  const start=await(await fetch(base+'/api/obs-link',{headers})).json();
  const b=await(await fetch(base+'/api/obs-link?scene=break',{headers})).json();
  assert.equal(b.url,start.url.replace('/scene.html','/break.html'));
  assert.equal((await fetch(b.url)).status,200);
  for(const name of ['break.css','assets/card-back-display-v1.webp','assets/backstage.png','api/state?scene=break'])assert.equal((await fetch(new URL(name,b.url))).status,200,name);
  assert.equal((await fetch(new URL('api/control',b.url),{method:'POST'})).status,403);
  assert.equal((await fetch(base+'/break.html')).status,401);
});
test('legacy starting settings migrate without loss and both scene preferences survive restart',async t=>{
  const os=require('node:os'),path=require('node:path');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ankuzo-break-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const settingsFile=path.join(dir,'settings.json');
  fs.writeFileSync(settingsFile,JSON.stringify({title:'Настроенный старт',minutes:7,showTimer:true}));
  const first=await setup(t,{persist:true,settingsFile});
  assert.equal((await first.state()).settings.title,'Настроенный старт');
  await first.post({scene:'break',action:'settings',settings:{title:'Чайная пауза',subtitle:'На 3 минуты',minutes:3}});
  const second=await setup(t,{persist:true,settingsFile});
  assert.equal((await second.state()).settings.title,'Настроенный старт');
  assert.equal((await second.state()).settings.minutes,7);
  assert.equal((await second.state('break')).settings.title,'Чайная пауза');
  assert.equal((await second.state('break')).settings.subtitle,'На 3 минуты');
  assert.equal((await second.state('break')).timer.running,false);
});
