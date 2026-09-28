import test from 'node:test';
import assert from 'node:assert/strict';
let w={};
try { w=await import('../extension/workflow.js'); } catch(e) {if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('script failure still closes the temporary thread tab',async()=>{
  assert.equal(typeof w.resolveThreadPage,'function');
  const url='https://forum.example/threads/example.12/';const removed=[];
  const api={tabs:{create:async()=>({id:9}),get:async()=>({status:'complete',url}),remove:async id=>removed.push(id)},scripting:{executeScript:async()=>{throw Error('permission');}}};
  await assert.rejects(w.resolveThreadPage(url,api),/permission/);
  assert.deepEqual(removed,[9]);
});
test('thread reader never opens non-thread or non-HTTPS URLs',async()=>{
  await assert.rejects(w.resolveThreadPage('http://forum.example/threads/example.12/',{}),/帖子/);
  await assert.rejects(w.resolveThreadPage('https://forum.example/img/abc',{}),/帖子/);
  assert.equal(w.resolveHost,undefined);assert.equal(w.resolveAlbum,undefined);
});
test('interrupted downloads are not reported as complete',async()=>{
  assert.equal(typeof w.waitForDownload,'function');
  await assert.rejects(w.waitForDownload(5,{downloads:{search:async()=>[{state:'interrupted',error:'SERVER_FORBIDDEN'}]}}),/SERVER_FORBIDDEN/);
  assert.equal(await w.waitForDownload(5,{downloads:{search:async()=>[{state:'complete'}]}}),true);
});
test('a redirect to a different page stops scanning and closes the tab',async()=>{
  let closed=false;
  const api={tabs:{create:async()=>({id:9}),get:async()=>({status:'complete',url:'https://forum.example/threads/other.99/'}),remove:async()=>{closed=true;}},scripting:{executeScript:async()=>[{result:{ready:true,posts:1,items:[]}}]}};
  await assert.rejects(w.resolveThreadPage('https://forum.example/threads/example.12/',api),/跳转/);
  assert.equal(closed,true);
});

test('thread page reader returns body data and closes its own background tab',async()=>{
  assert.equal(typeof w.resolveThreadPage,'function');
  const url='https://forum.example/threads/example.12/page-2';const closed=[];
  const api={tabs:{create:async opts=>{assert.deepEqual(opts,{url,active:false});return {id:12};},get:async()=>({status:'complete',url}),remove:async id=>closed.push(id)},scripting:{executeScript:async opts=>{assert.deepEqual(opts.args,[null,url]);return [{result:{ready:true,posts:20,items:[]}}];}}};
  assert.equal((await w.resolveThreadPage(url,api)).posts,20);assert.deepEqual(closed,[12]);
  await assert.rejects(w.resolveThreadPage('http://forum.example/threads/example.12/',api),/帖子/);
});

test('thread login/error page stops scanning and closes the temporary tab',async()=>{
  assert.equal(typeof w.resolveThreadPage,'function');
  const url='https://forum.example/threads/example.12/';let closed=false;
  const api={tabs:{create:async()=>({id:12}),get:async()=>({status:'complete',url}),remove:async()=>{closed=true;}},scripting:{executeScript:async()=>[{result:{ready:false,posts:0,items:[]}}]}};
  await assert.rejects(w.resolveThreadPage(url,api),/正文|登录|验证/);assert.equal(closed,true);
});
