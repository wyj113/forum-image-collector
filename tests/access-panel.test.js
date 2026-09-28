import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('denied access does not fetch or save; a later explicit click retries without losing selection',async()=>{
  const dom=new JSDOM(await readFile(new URL('../extension/panel.html',import.meta.url),'utf8'),{url:'https://extension.example/panel.html?tab=42'});
  const keys=['window','document','location','chrome','fetch','createImageBitmap'];const old=new Map(keys.map(key=>[key,globalThis[key]]));
  let granted=false,reads=0,saved=0;const requests=[];
  const source='https://community.example.net/topics/one';const original='https://assets.example.net/photo.jpg';
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,
    chrome:{permissions:{request:async options=>{requests.push(options);return granted;},contains:async()=>granted},tabs:{get:async()=>({url:source})},scripting:{executeScript:async()=>[{result:{url:source,title:'Example',posts:1,items:[{id:1,post:'1',kind:'direct',source:original,original,preview:''}]}}]},downloads:{download:async()=>++saved,search:async()=>[{state:'complete'}]}},
    fetch:async(url,options)=>{reads++;assert.equal(options.redirect,'error');return {ok:true,url,blob:async()=>new Blob(['file'],{type:'image/jpeg'})};},createImageBitmap:async()=>({width:800,height:1000,close(){}})});
  const $=id=>dom.window.document.getElementById(id);
  const until=async condition=>{for(let i=0;i<100;i++){if(condition())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('UI did not settle');};
  try{
    dom.window.localStorage.setItem('fic.language','zh');
    await import('../extension/panel.js?permission-denied');await until(()=>$('grid').children.length===1);
    $('download').click();await until(()=>!$('rescan').disabled);
    assert.equal(reads,0);assert.equal(saved,0);assert.match($('status').textContent,/未获得/);
    assert.equal($('grid').querySelector('input').checked,true);
    granted=true;$('download').click();await until(()=>!$('rescan').disabled);
    assert.equal(saved,1);assert.deepEqual(requests,[{origins:['https://assets.example.net/*']},{origins:['https://assets.example.net/*']}]);
  }finally{for(const key of keys){if(old.get(key)===undefined)delete globalThis[key];else globalThis[key]=old.get(key);}dom.window.close();}
});
