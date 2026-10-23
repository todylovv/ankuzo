const {test}=require('node:test'),assert=require('node:assert/strict');
test('IRC feed keeps bounded literal messages and honors message deletion, user clear and whole-room clear',()=>{
 const {createChatBuffer}=require('../app/twitch-chat.cjs');let now=1000;const b=createChatBuffer({channel:'ankuzo',now:()=>now});
 const line=(id,user,text)=>`@id=${id};display-name=${user};color=#AABBCC;user-id=${user} :${user.toLowerCase()}!x@x PRIVMSG #ankuzo :${text}`;
 b.ingest(line('a','Alice','<img src=x onerror=1>'));b.ingest(line('a','Alice','duplicate'));b.ingest(line('b','Bob','Привет'));
 b.ingest('@id=other :outside!x@x PRIVMSG #other :wrong channel');let s=b.snapshot();assert.equal(s.messages.length,2);assert.equal(s.messages[0].text,'<img src=x onerror=1>');assert.equal(s.messages[0].color,'#AABBCC');
 b.ingest('@target-msg-id=a :tmi.twitch.tv CLEARMSG #ankuzo :deleted');assert.equal(b.snapshot().messages.length,1);
 b.ingest(line('c','Alice','Again'));b.ingest('@target-user-id=Alice :tmi.twitch.tv CLEARCHAT #ankuzo :alice');assert.deepEqual(b.snapshot().messages.map(m=>m.id),['b']);
 b.ingest(':tmi.twitch.tv CLEARCHAT #ankuzo');assert.equal(b.snapshot().messages.length,0);
 for(let i=0;i<100;i++)b.ingest(line(String(i),'Bob','x'.repeat(900)));s=b.snapshot();assert.ok(s.messages.length<=20);assert.equal(s.messages.at(-1).text.length,400);
 now+=61000;assert.equal(b.snapshot().messages.length,0);
});
test('IRC tags are decoded safely and malformed input cannot create markup, colors or unbounded state',()=>{
 const {createChatBuffer}=require('../app/twitch-chat.cjs');const b=createChatBuffer({channel:'ankuzo'});
 for(const line of ['',null,'x'.repeat(100000),'PING :server','@bad','@id=x;color=url(evil);display-name=Alice\\sA :alice!a@a PRIVMSG #ankuzo :hello'])b.ingest(line);
 const s=b.snapshot();assert.equal(s.messages.length,1);assert.equal(s.messages[0].name,'Alice A');assert.equal(s.messages[0].color,'#f0a4c0');assert.ok(!('userId' in s.messages[0]));
});
