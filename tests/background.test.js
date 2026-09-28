import test from 'node:test';
import assert from 'node:assert/strict';

test('background supports four concurrent readers, rejects a fifth, releases capacity before replying',async()=>{
  const previous=globalThis.chrome;const gates=[],removed=[];let listener,nextId=0;
  const origin='chrome-extension://test/';
  globalThis.chrome={
    action:{onClicked:{addListener(){}}},runtime:{id:'test',getURL:path=>origin+path,onMessage:{addListener:fn=>{listener=fn;}}},
    tabs:{create:async()=>({id:++nextId}),get:async()=>({url:'https://forum.example/threads/example.12/',status:'complete'}),remove:async id=>removed.push(id)},
    scripting:{executeScript:async()=>new Promise(resolve=>gates.push(()=>resolve([{result:{ready:true,posts:1,items:[]}}])))}
  };
  try{
    globalThis.chrome.permissions={request:async()=>true,contains:async()=>true};
    await import('../extension/background.js?concurrency');
    const replies=[];const sender={id:'test',url:origin+'panel.html?tab=1'};
    const send=reply=>listener({type:'threadPage',url:'https://forum.example/threads/example.12/'},sender,reply);
    for(let i=0;i<4;i++)assert.equal(send(response=>replies.push(response)),true);
    let overflow;send(response=>{overflow=response;});assert.match(overflow.error,/4/);
    await new Promise(resolve=>setImmediate(resolve));assert.equal(gates.length,4);
    gates.splice(0).forEach(release=>release());
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(replies.length,4);assert.ok(replies.every(reply=>reply.page?.ready));assert.equal(removed.length,4);
    // Sending from a response callback must see the slot just released.
    let nestedReturn;
    send(()=>{nestedReturn=send(response=>replies.push(response));});
    await new Promise(resolve=>setImmediate(resolve));gates.shift()();
    await new Promise(resolve=>setImmediate(resolve));assert.equal(nestedReturn,true);gates.shift()();
    await new Promise(resolve=>setImmediate(resolve));
  }finally{globalThis.chrome=previous;}
});

test('background ignores retired message types',async()=>{
  const previous=globalThis.chrome;let listener;const origin='chrome-extension://test/';
  globalThis.chrome={action:{onClicked:{addListener(){}}},runtime:{id:'test',getURL:path=>origin+path,onMessage:{addListener:fn=>{listener=fn;}}},permissions:{contains:async()=>true}};
  try{
    await import('../extension/background.js?retired');
    const sender={id:'test',url:origin+'panel.html?tab=1'};
    for(const type of ['resolve','album'])assert.equal(listener({type,url:'https://example.org/x'},sender,()=>{throw Error('must not reply');}),undefined);
  }finally{globalThis.chrome=previous;}
});
