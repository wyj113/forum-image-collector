import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {scanPage,allowedImage} from '../extension/core.js';

test('forum and image extraction works on unrelated HTTPS domains',()=>{
  const dom=new JSDOM('<article class="message--post" id="js-post-1"><div class="message-body"><div class="bbWrapper"><img class="bbImage" src="https://photos.example.net/photo.jpg"><a href="https://pictures.example.org/img/one"><img class="bbImage" src="https://photos.example.net/thumb.jpg"></a></div></div></article>',{url:'https://community.example.org/threads/travel.1/'});
  const data=scanPage(dom.window.document);
  assert.equal(data.thread?.baseUrl,'https://community.example.org/threads/travel.1/');
  assert.deepEqual(data.items.map(x=>x.kind),['direct','unsupported']);
  assert.equal(allowedImage(data.items[0].original),true);
});

test('phpBB and Discourse-style bodies support current-page collection without invented pagination',()=>{
  for(const body of ['<div class="post" id="p1"><div class="postbody"><div class="content"><img src="https://photos.example.net/photo.jpg"></div></div><div class="signature"><img src="https://photos.example.net/signature.jpg"></div></div>', '<article data-post-id="1"><div class="cooked"><img src="https://photos.example.net/photo.jpg"><img class="emoji" src="https://photos.example.net/emoji.png"></div></article>']){
    const dom=new JSDOM(body,{url:'https://community.example.org/topic/1'});
    const data=scanPage(dom.window.document);
    assert.equal(data.items.length,1);assert.equal(data.thread,null);
  }
});
