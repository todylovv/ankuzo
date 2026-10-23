import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {cacheCover} from '../lib/covers.mjs';
const id='04b10b27-6a1b-40ba-9658-b52f87c847b8';
test('cover cache accepts bounded raster images from provider CDNs only',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'ankuzo-covers-'));let calls=0;
 try{
 const fetcher=async(url,options)=>{calls++;assert.equal(options.redirect,'error');return new Response(Buffer.from([255,216,255,224,1,2,3,4]),{headers:{'Content-Type':'image/jpeg'}});};
 const filename=await cacheCover({directory,id,url:'https://avatars.yandex.net/get-music-content/a/600x600',fetcher});assert.equal(filename,id+'.cover.jpg');assert.equal(readFileSync(join(directory,filename)).length,8);
 for(const url of ['http://i.ytimg.com/a.jpg','https://i.ytimg.com.attacker.test/a.jpg','https://127.0.0.1/a.jpg','https://user:pass@i.ytimg.com/a.jpg'])await assert.rejects(cacheCover({directory,id,url,fetcher}));assert.equal(calls,1);
 await assert.rejects(cacheCover({directory,id,url:'https://i.ytimg.com/a.jpg',fetcher:async()=>new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml'}})}));
 await assert.rejects(cacheCover({directory,id,url:'https://i.ytimg.com/a.jpg',fetcher:async()=>new Response('html',{headers:{'Content-Type':'image/jpeg'}})}));
 await assert.rejects(cacheCover({directory,id,url:'https://i.ytimg.com/a.jpg',fetcher:async()=>new Response('x',{headers:{'Content-Type':'image/jpeg','Content-Length':'9999999'}})}));
 }finally{rmSync(directory,{recursive:true,force:true});}
});
