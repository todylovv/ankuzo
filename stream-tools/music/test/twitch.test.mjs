import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Twitch} from '../lib/twitch.mjs';
const token={access_token:'test-token',refresh_token:'test-refresh',expiresAt:Date.now()+7200000,userId:'123',login:'ankuzo',validatedAt:Date.now()};
test('refund reconciles a canceled redemption after a lost response',async()=>{
 const twitch=new Twitch({config:{clientId:'client',expectedLogin:'ankuzo'},fetcher:async(url,options)=>{
  if(options.method==='PATCH')return new Response(JSON.stringify({message:'already processed'}),{status:400});
  return new Response(JSON.stringify({data:[{id:'r1',status:'CANCELED'}]}));
 }});twitch.tokens=token;
 await twitch.settle({redemptionId:'r1',rewardId:'reward'},'CANCELED');
});
test('a finished Twitch redemption is not falsely reported as refunded',async()=>{
 const twitch=new Twitch({config:{clientId:'client',expectedLogin:'ankuzo'},fetcher:async(url,options)=>new Response(JSON.stringify(options.method==='PATCH'?{message:'bad status'}:{data:[{status:'FULFILLED'}]}),{status:options.method==='PATCH'?400:200})});twitch.tokens=token;
 await assert.rejects(twitch.settle({redemptionId:'r1',rewardId:'reward'},'CANCELED'));
});
test('a token for a different broadcaster cannot connect to the widget',async()=>{
 const twitch=new Twitch({config:{clientId:'client',expectedLogin:'ankuzo'},fetcher:async()=>new Response(JSON.stringify({client_id:'client',login:'someone_else',user_id:'999',scopes:['channel:manage:redemptions']}))});
 await assert.rejects(twitch.acceptToken(token));assert.equal(twitch.status().connected,false);
});
test('refund checks Twitch after a transport failure instead of blindly reporting failure',async()=>{
 const twitch=new Twitch({config:{clientId:'client',expectedLogin:'ankuzo'},fetcher:async(url,options)=>{
  if(options.method==='PATCH')throw Error('connection closed after commit');return new Response(JSON.stringify({data:[{status:'CANCELED'}]}));
 }});twitch.tokens=token;await twitch.settle({redemptionId:'r1',rewardId:'reward'},'CANCELED');
});
