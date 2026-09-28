import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
let core = {};
try { core = await import('../extension/core.js'); } catch(e) { if(e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
const doc = html => new JSDOM(html,{url:'https://forum.example/threads/example.1/page-9'}).window.document;
const img = (name,attrs='') => `<img class="bbImage" src="https://media.image-cdn.example/images4/${name}.jpg" ${attrs}>`;
const post = body => `<article class="message message--post" id="js-post-123"><header class="message-attribution"><a>#169</a></header><div class="message-user"><img src="https://media.image-cdn.example/data/avatars/user.jpg"></div><article class="message-body"><div class="bbWrapper">${body}</div></article><div class="message-signature">${img('signature')}</div></article>`;
test('only body pictures: excludes avatar, signatures, emoji, quotes, embeds, ads, and reactions',()=>{
  assert.equal(typeof core.scanPage,'function','scanPage must exist');
  const html = img('outside')+post(img('good')+`<blockquote>${img('quote')}</blockquote><div class="bbCodeBlock--quote">${img('quote2')}</div><div class="bbMediaWrapper">${img('poster')}</div><div class="advertisement">${img('ad')}</div><img class="smilie bbImage" src="https://media.image-cdn.example/emoji.jpg"><div class="reactionsBar">${img('reaction')}</div>`);
  const result = core.scanPage(doc(html));
  assert.deepEqual(result.items.map(x=>x.preview),['https://media.image-cdn.example/images4/good.jpg']);
  assert.equal(result.items[0].post,'169');
});
test('images linking to viewer pages are listed as unsupported, never downloaded as thumbnails; duplicates collapse',()=>{
  assert.equal(typeof core.scanPage,'function');
  const picture = `<a href="https://images.example/img/sample-image">${img('thumb')}</a>`;
  const result = core.scanPage(doc(post(picture+picture)));
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].kind,'unsupported');
  assert.equal(result.items[0].source,'https://images.example/img/sample-image');
  assert.equal(result.items[0].original,'');
});
test('linked full-size images and forum attachments are collected directly',()=>{
  const result=core.scanPage(doc(post(`<a href="https://media.image-cdn.example/images4/full.jpg">${img('thumb')}</a><a href="https://forum.example/attachments/photo-jpg.42/">${img('attached')}</a>`)));
  assert.deepEqual(result.items.map(x=>[x.kind,x.original]),[['direct','https://media.image-cdn.example/images4/full.jpg'],['direct','https://forum.example/attachments/photo-jpg.42/']]);
});
test('unknown linked page and video links cannot become downloaded thumbnails',()=>{
  assert.equal(typeof core.scanPage,'function');
  const result=core.scanPage(doc(post(`<a href="https://other.example/view/123">${img('unknown')}</a><a href="https://video.example/v/123">${img('video')}</a>`)));
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].kind,'unsupported');
  assert.equal(result.items[0].original,'');
});
test('lazy body picture is found without loading it, and non-post pages fail closed',()=>{
  assert.equal(typeof core.scanPage,'function');
  const result=core.scanPage(doc(post('<img class="bbImage" src="data:image/gif;base64,AA" data-src="https://media.image-cdn.example/images4/lazy.jpg">')));
  assert.equal(result.items[0].source,'https://media.image-cdn.example/images4/lazy.jpg');
  assert.equal(core.scanPage(doc(img('outside'))).items.length,0);
});
test('the extension exposes only forum-body scanning and file validation',()=>{
  assert.deepEqual(Object.keys(core).sort(),['allowedImage','safeFolder','scanPage','validateBlob']);
  const result=core.scanPage(doc(post(`<a href="https://viewer.example/page/1">link</a><a href="https://viewer.example/page/2">${img('linked')}</a>`)));
  assert.deepEqual(result.items.map(x=>x.kind),['unsupported']);
});
test('rejects credentials, HTTP, avatar, executable and javascript URLs',()=>{
  assert.equal(typeof core.allowedImage,'function');
  for(const u of ['https://name:secret@photos.example/x.jpg','http://photos.example/x.jpg','https://media.image-cdn.example/data/avatars/a.jpg','javascript:alert(1)','https://media.image-cdn.example/x.exe']) assert.equal(core.allowedImage(u),false,u);
  assert.equal(core.allowedImage('https://media.image-cdn.example/images4/a.jpg?key=x'),true);
});
test('HTML or undecodable responses never become saved images',async()=>{
  assert.equal(typeof core.validateBlob,'function');
  await assert.rejects(core.validateBlob(new Blob(['<html>login</html>'],{type:'text/html'}),async()=>({width:1536,height:2048})),/图片/);
  await assert.rejects(core.validateBlob(new Blob(['bad'],{type:'image/jpeg'}),async()=>{throw Error('decode');}),/解码/);
  await assert.rejects(core.validateBlob(new Blob(['small'],{type:'image/jpeg'}),async()=>({width:32,height:32,close(){}})),/过小/);
  assert.deepEqual(await core.validateBlob(new Blob(['fixture'],{type:'image/jpeg'}),async()=>({width:1536,height:2048,close(){}})),{width:1536,height:2048,ext:'jpg'});
});
test('folder names cannot escape the downloads folder',()=>{
  assert.equal(typeof core.safeFolder,'function');
  const value=core.safeFolder('../a\\b:c*?<>|');
  assert.ok(!/[\\/:*?<>|]/.test(value));
  assert.ok(!value.includes('..'));
  assert.ok(core.safeFolder('  '));
});
test('present but rejected image links never fall back to the preview',()=>{
  for(const href of ['http://images.example/img/abc','javascript:alert(1)','http://unknown.test/image']) {
    const [item]=core.scanPage(doc(post(`<a href="${href}">${img('thumb')}</a>`))).items;
    assert.equal(item.kind,'unsupported');
    assert.equal(item.original,'');
  }
});
