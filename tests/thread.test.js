import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {scanPage} from '../extension/core.js';
const base='https://forum.example/threads/example.12/';
const post='<article class="message--post" id="js-post-9"><div class="message-body"><div class="bbWrapper"><img class="bbImage" src="https://media.image-cdn.example/images4/a.jpg"></div></div></article>';
const nav='<div class="pageNav"><ul class="pageNav-main"><li><a href="./">1</a></li><li><a href="page-26">26</a></li></ul><a class="pageNav-jump--next" href="page-17">Next</a></div>';

test('pagination uses same-thread page navigation only; source metadata is attached to images',()=>{
  const dom=new JSDOM(post+nav+'<div class="message-body"><a href="page-999">999</a></div>',{url:base+'page-16'});
  const data=scanPage(dom.window.document);
  assert.deepEqual(data.thread,{baseUrl:base,page:16,total:26,nextUrl:base+'page-17',error:''});
  assert.equal(data.items[0].page,16);
  assert.equal(data.items[0].pageUrl,base+'page-16');
  dom.window.close();
});

test('one page thread is valid; bad pagination and wrong documents are not silently accepted',()=>{
  for(const [html,url,expected] of [
    [post,base,'single'],
    [post+nav.replace('href="page-17"','href="https://evil.test/page-17"'),base+'page-16','error'],
    [post+nav.replace('href="page-17"','href="page-16"'),base+'page-16','error'],
    ['<h1>Log in</h1>',base,'unready']
  ]){
    const dom=new JSDOM(html,{url});const data=scanPage(dom.window.document);
    if(expected==='single'){assert.equal(data.thread.total,1);assert.equal(data.thread.nextUrl,'');}
    if(expected==='error')assert.ok(data.thread.error);
    if(expected==='unready')assert.equal(data.ready,false);
    assert.equal(scanPage(dom.window.document,base+'page-2').ready,false);
    dom.window.close();
  }
});

let thread={};try{thread=await import('../extension/thread.js');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const result=(page,total=3)=>({ready:true,url:base+(page===1?'':`page-${page}`),posts:1,items:[],thread:{baseUrl:base,page,total,nextUrl:page<total?base+`page-${page+1}`:'',error:''}});
test('whole thread collection starts at page one, is sequential, stops and resumes without rescanning',async()=>{
  assert.equal(typeof thread.collectThread,'function');
  const state={baseUrl:base,nextPage:1,total:3};const read=[],merged=[];let stop=false;
  const options={readPage:async url=>{const page=Number(url.match(/page-(\d+)$/)?.[1]||1);read.push(page);return result(page);},onPage:async data=>{merged.push(data.thread.page);if(merged.length===2)stop=true;},shouldStop:()=>stop,pause:async()=>{}};
  await thread.collectThread(state,options);assert.deepEqual(read,[1,2]);assert.equal(state.nextPage,3);
  stop=false;await thread.collectThread(state,options);assert.deepEqual(read,[1,2,3]);assert.deepEqual(merged,[1,2,3]);
  assert.equal(state.complete,true);
});
test('failed, redirected and mismatched pages never advance the cursor or claim complete',async()=>{
  assert.equal(typeof thread.collectThread,'function');
  for(const data of [{...result(1),ready:false},{...result(1),thread:{...result(1).thread,baseUrl:base.replace('12','13')}},result(2),{...result(1),thread:{...result(1).thread,nextUrl:'',error:'分页异常'}}]){
    const state={baseUrl:base,nextPage:1,total:3};let merged=0;
    await assert.rejects(thread.collectThread(state,{readPage:async()=>data,onPage:()=>merged++,pause:async()=>{}}));
    assert.equal(state.nextPage,1);assert.ok(!state.complete);assert.equal(merged,0);
  }
});

test('concurrent pages overlap within the limit but merge in page order',async()=>{
  const state={baseUrl:base,nextPage:1,total:6};const merged=[],finished=[];let active=0,peak=0;
  await thread.collectThread(state,{concurrency:3,pause:async()=>{},readPage:async url=>{
    const page=Number(url.match(/page-(\d+)$/)?.[1]||1);active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,page===1?35:5));
    finished.push(page);active--;return result(page,6);
  },onPage:data=>merged.push(data.thread.page)});
  assert.equal(peak,3,'three actual overlapping page reads');assert.equal(active,0);
  assert.notEqual(finished[0],1);assert.deepEqual(merged,[1,2,3,4,5,6]);assert.equal(state.complete,true);
});

test('failed parallel page keeps later successes cached and resumes only missing pages',async()=>{
  const state={baseUrl:base,nextPage:1,total:5};const reads=[],merged=[];let fail=true;
  const options={concurrency:3,pause:async()=>{},readPage:async url=>{
    const page=Number(url.match(/page-(\d+)$/)?.[1]||1);reads.push(page);
    if(page===2&&fail)throw Error('需要验证');return result(page,5);
  },onPage:data=>merged.push(data.thread.page)};
  await assert.rejects(thread.collectThread(state,options),/第 2 页.*验证/);
  assert.deepEqual(reads,[1,2,3]);assert.deepEqual(merged,[1]);assert.equal(state.nextPage,2);assert.ok(!state.complete);
  fail=false;await thread.collectThread(state,options);
  assert.deepEqual(reads,[1,2,3,2,4,5],'page 3 must not be fetched again');
  assert.deepEqual(merged,[1,2,3,4,5]);assert.equal(state.complete,true);
});

test('stop waits for active pages, schedules no next window, and caps concurrency at four',async()=>{
  const state={baseUrl:base,nextPage:1,total:8};const reads=[],merged=[];let stop=false,active=0;
  await thread.collectThread(state,{concurrency:99,pause:async()=>{},shouldStop:()=>stop,readPage:async url=>{
    const page=Number(url.match(/page-(\d+)$/)?.[1]||1);reads.push(page);active++;
    await new Promise(resolve=>setTimeout(resolve,5));stop=true;active--;return result(page,8);
  },onPage:data=>merged.push(data.thread.page)});
  assert.deepEqual(reads,[1,2,3,4]);assert.deepEqual(merged,[1,2,3,4]);assert.equal(active,0);
  assert.equal(state.nextPage,5);assert.ok(!state.complete);
});
