import {test} from 'node:test';import assert from 'node:assert/strict';
import {assertFullTrack,parseSource} from '../lib/media.mjs';
test('VK individual audio share links are accepted while music albums stay forbidden',()=>{
 const source=parseSource('https://vk.ru/audio443361774_456240011_cbc4ce7dab17be5d76');assert.equal(source.provider,'vkAudio');
 assert.throws(()=>parseSource('https://vk.ru/music/album/-2000980518_17980518_a231c1486b21c1c2df'));
 assert.throws(()=>parseSource('https://vk.ru/audio443361774_456240011_cbc4ce7dab17be5d76/anything'));
});
test('a thirty second provider preview is never accepted as a full track',()=>{
 assert.throws(()=>assertFullTrack(135,31));assert.doesNotThrow(()=>assertFullTrack(135,134.7));assert.throws(()=>assertFullTrack(135,NaN));
});
