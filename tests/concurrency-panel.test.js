import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

for(const limit of [1,4])test(`configurable concurrency: ${limit} concurrent download${limit===1?'':'s'}, stop drains active work`,async()=>{
  const dom=new JSDOM(await readFile(new URL('../extension/panel.html',import.meta.url),'utf8'),{url:'https://extension.example/panel.html?tab=42'});
  const keys=['window','document','location','chrome','fetch','createImageBitmap'];const old=new Map(keys.map(key=>[key,globalThis[key]]));
  const url='https://forum.example/threads/example.12/';
  const items=Array.from({length:6},(_,i)=>({id:i+1,post:'1',kind:'direct',source:`https://media.image-cdn.example/images4/file${i}.jpg`,original:`https://media.image-cdn.example/images4/file${i}.jpg`,preview:''}));
  let fetching=0,fetchPeak=0,fetchCount=0,saved=0,release;
  const gate=new Promise(resolve=>{release=resolve;});
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,
    chrome:{tabs:{get:async()=>({url})},scripting:{executeScript:async()=>[{result:{url,title:'Concurrency test',posts:1,items}}]},runtime:{sendMessage:async()=>{throw Error('no background resolution is expected');}},downloads:{download:async()=>++saved,search:async()=>[{state:'complete'}]}},
    fetch:async imageUrl=>{fetchCount++;fetching++;fetchPeak=Math.max(fetchPeak,fetching);await gate;fetching--;return {ok:true,url:imageUrl,blob:async()=>new Blob([imageUrl],{type:'image/jpeg'})};},
    createImageBitmap:async()=>({width:800,height:1000,close(){}})});
  const $=id=>dom.window.document.getElementById(id);
  const until=async condition=>{for(let i=0;i<150;i++){if(condition())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('UI did not settle: '+$('status').textContent);};
  try{
    globalThis.chrome.permissions={request:async()=>true,contains:async()=>true};
    dom.window.localStorage.setItem('fic.language','zh');
    await import(`../extension/panel.js?concurrency=${limit}`);await until(()=>$('grid').children.length===6);
    assert.ok($('concurrency'),'concurrency setting exists');assert.equal($('concurrency').value,'2');
    assert.equal($('resolve'),null,'there is no separate resolve step');
    $('concurrency').value=String(limit);
    $('download').click();assert.equal($('concurrency').disabled,true);await until(()=>fetchCount===limit);
    $('stop').click();release();await until(()=>!$('rescan').disabled);
    assert.equal(fetchPeak,limit);assert.equal(saved,limit);
    assert.equal(fetching,0);assert.equal($('concurrency').disabled,false);
    $('download').click();await until(()=>!$('rescan').disabled);assert.equal(saved,6,'remaining images retry without repeating successful saves');
  }finally{release();await new Promise(resolve=>setTimeout(resolve,50));for(const key of keys){if(old.get(key)===undefined)delete globalThis[key];else globalThis[key]=old.get(key);}dom.window.close();}
});
