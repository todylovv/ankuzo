'use strict';
const tls=require('node:tls');
function parseLine(line){
 if(typeof line!=='string'||line.length>8192)return null;
 const tags={};let rest=line;
 if(rest.startsWith('@')){
  const end=rest.indexOf(' ');if(end<0)return null;
  for(const pair of rest.slice(1,end).split(';')){const eq=pair.indexOf('=');if(eq<0)continue;const k=pair.slice(0,eq);tags[k]=pair.slice(eq+1).replace(/\\([:snr\\])/g,(_,c)=>({':':';',s:' ',n:'\n',r:'\r','\\':'\\'})[c]);}
  rest=rest.slice(end+1);
 }
 let prefix='';if(rest.startsWith(':')){const end=rest.indexOf(' ');if(end<0)return null;prefix=rest.slice(1,end);rest=rest.slice(end+1);}
 const trail=rest.indexOf(' :'),text=trail<0?'':rest.slice(trail+2),parts=(trail<0?rest:rest.slice(0,trail)).split(' ');
 return{tags,prefix,command:parts[0],params:parts.slice(1),text};
}
function createChatBuffer({channel='ankuzo',now=Date.now}={}){
 let messages=[];const seen=new Map();
 const clean=(s,n)=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,n);
 function prune(){const cutoff=now()-60000;messages=messages.filter(m=>m.receivedAt>cutoff);for(const [id,at]of seen)if(at<cutoff)seen.delete(id);while(seen.size>200)seen.delete(seen.keys().next().value);}
 return{
  ingest(line){
   const m=parseLine(line);if(!m||m.params[0]!==`#${channel}`)return;prune();
   if(m.command==='CLEARMSG'){messages=messages.filter(x=>x.id!==m.tags['target-msg-id']);return;}
   if(m.command==='CLEARCHAT'){
    messages=m.text?messages.filter(x=>x.userId!==m.tags['target-user-id']&&x.login!==m.text.toLowerCase()):[];return;
   }
   if(m.command!=='PRIVMSG')return;
   const login=m.prefix.split('!')[0].toLowerCase();if(!/^[a-z0-9_]{1,32}$/.test(login))return;
   const id=clean(m.tags.id,100);if(!id||seen.has(id))return;
   const text=clean(m.text.replace(/^\x01ACTION /,'').replace(/\x01$/,''),400);if(!text)return;
   seen.set(id,now());messages.push({id,name:clean(m.tags['display-name']||login,40),login,userId:clean(m.tags['user-id'],40),text,color:/^#[\da-f]{6}$/i.test(m.tags.color||'')?m.tags.color:'#f0a4c0',receivedAt:now()});messages=messages.slice(-20);
  },
  snapshot(){prune();return{channel,serverNow:now(),messages:messages.map(({userId,login,...publicMessage})=>publicMessage)};}
 };
}
function createTwitchChat({channel='ankuzo',now=Date.now}={}){
 const buffer=createChatBuffer({channel,now});let status='idle',socket,retry,heartbeat,stopped=false,started=false,attempt=0;
 function connect(){
  if(stopped)return;status=attempt?'reconnecting':'connecting';let pending='';
  socket=tls.connect({host:'irc.chat.twitch.tv',port:6697,servername:'irc.chat.twitch.tv',rejectUnauthorized:true});socket.setEncoding('utf8');socket.setTimeout(150000);socket.on('timeout',()=>socket.destroy());
  socket.on('secureConnect',()=>{
   const nick='justinfan'+String(Math.floor(Math.random()*900000000)+100000000);
   socket.write(`CAP REQ :twitch.tv/tags twitch.tv/commands\r\nPASS SCHMOOPIIE\r\nNICK ${nick}\r\nJOIN #${channel}\r\n`);
   heartbeat=setInterval(()=>{if(socket&&!socket.destroyed)socket.write('PING :ankuzo-obs\r\n');},60000);heartbeat.unref();
  });
  socket.on('data',chunk=>{
   pending+=chunk;if(pending.length>65536){socket.destroy();return;}
   let end;while((end=pending.indexOf('\r\n'))!==-1){const line=pending.slice(0,end);pending=pending.slice(end+2);const m=parseLine(line);if(!m)continue;
    if(m.command==='PING')socket.write('PONG :'+m.text.slice(0,200)+'\r\n');
    if(m.command==='366'&&m.params.includes('#'+channel)){status='connected';attempt=0;}
    if(m.command==='RECONNECT')socket.destroy();
    buffer.ingest(line);
   }
  });
  socket.on('error',()=>{});
  socket.on('close',()=>{clearInterval(heartbeat);if(stopped)return;status='reconnecting';retry=setTimeout(connect,Math.min(60000,1000*2**Math.min(attempt++,6))+Math.floor(Math.random()*500));retry.unref();});
 }
 return{start(){if(!started){started=true;connect();}},snapshot(){return{...buffer.snapshot(),status};},close(){stopped=true;clearTimeout(retry);clearInterval(heartbeat);socket?.destroy();}};
}
module.exports={createChatBuffer,createTwitchChat};
