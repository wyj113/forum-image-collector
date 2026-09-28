import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('panel selection: modifiers, checkboxes, ranges, disabled items, anchors and download queue',async()=>{
  const dom=new JSDOM(await readFile(new URL('../extension/panel.html',import.meta.url),'utf8'),{url:'https://extension.example/panel.html?tab=42'});
  const globals=['window','document','location','chrome','fetch','createImageBitmap'];
  const previous=new Map(globals.map(key=>[key,globalThis[key]]));
  const url='https://forum.example/threads/test.1/page-9';
  const source=Array.from({length:6},(_,i)=>({id:i+1,post:'169',kind:i===3?'unsupported':'direct',source:`https://media.image-cdn.example/images4/${i}.jpg`,preview:'',original:i===3?'':`https://media.image-cdn.example/images4/${i}.jpg`}));
  let releaseFetch;
  const gate=new Promise(resolve=>{releaseFetch=resolve;});
  const saved=[];
  Object.assign(globalThis,{
    window:dom.window,document:dom.window.document,location:dom.window.location,
    chrome:{tabs:{get:async()=>({url})},scripting:{executeScript:async()=>[{result:{url,title:'Selection test',posts:1,items:source.map(x=>({...x}))}}]},downloads:{download:async options=>{saved.push(options.filename);return saved.length;},search:async()=>[{state:'complete'}]}},
    fetch:async imageUrl=>{await gate;return {ok:true,url:imageUrl,blob:async()=>new Blob(['fixture'],{type:'image/jpeg'})};},
    createImageBitmap:async()=>({width:800,height:1000,close(){}})
  });
  const $=id=>dom.window.document.getElementById(id);
  const cards=()=>[...$('grid').children];
  const selected=()=>cards().flatMap((card,i)=>card.querySelector('input').checked?[i+1]:[]);
  const click=(n,modifiers={},selector='.picture')=>cards()[n-1].querySelector(selector).dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,...modifiers}));
  const until=async condition=>{for(let i=0;i<100;i++){if(condition())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI did not settle');};
  try{
    globalThis.chrome.permissions={request:async()=>true,contains:async()=>true};
    dom.window.localStorage.setItem('fic.language','zh');
    await import('../extension/panel.js');
    await until(()=>cards().length===6);
    $('clear').click();
    click(2);assert.deepEqual(selected(),[2],'plain preview click selects one');
    click(5,{ctrlKey:true});assert.deepEqual(selected(),[2,5]);
    click(2,{ctrlKey:true});assert.deepEqual(selected(),[5],'Ctrl toggles off');
    click(6,{shiftKey:true});assert.deepEqual(selected(),[2,3,5,6],'range starts at last click and skips unsupported');
    click(1,{shiftKey:true});assert.deepEqual(selected(),[1,2],'reverse and shrink range keep anchor');
    click(6,{shiftKey:true,ctrlKey:true});assert.deepEqual(selected(),[1,2,3,5,6],'Ctrl+Shift adds range');
    click(5,{metaKey:true});assert.deepEqual(selected(),[1,2,3,6],'Command also toggles');
    click(3,{},'input');assert.deepEqual(selected(),[1,2,6],'ordinary checkbox keeps others');
    click(6,{shiftKey:true},'input');assert.deepEqual(selected(),[3,5,6],'Shift works on checkbox');
    click(4,{ctrlKey:true});assert.deepEqual(selected(),[3,5,6],'unavailable target is ignored');
    click(1,{ctrlKey:true},'.origin');assert.deepEqual(selected(),[3,5,6],'source link does not select');
    $('clear').click();click(5,{shiftKey:true});assert.deepEqual(selected(),[5],'clear resets anchor');
    $('select').click();click(2,{shiftKey:true});assert.deepEqual(selected(),[2],'select all resets anchor');
    $('rescan').click();await until(()=>!$('rescan').disabled);
    click(3,{shiftKey:true});assert.deepEqual(selected(),[3],'rescan resets anchor');
    click(6,{ctrlKey:true});
    $('download').click();
    click(1);assert.deepEqual(selected(),[3,6],'selection stays fixed while downloading');
    releaseFetch();await until(()=>$('status').textContent.startsWith('下载结束'));
    assert.equal(saved.length,2);
    assert.ok(saved.some(name=>name.includes('/003_')));
    assert.ok(saved.some(name=>name.includes('/006_')));
    click(1);click(6,{shiftKey:true});assert.deepEqual(selected(),[1],'completed target is ignored');
    click(5,{shiftKey:true});assert.deepEqual(selected(),[1,2,5],'range skips completed and unsupported images');
  }finally{
    releaseFetch();
    for(const key of globals){if(previous.get(key)===undefined)delete globalThis[key];else globalThis[key]=previous.get(key);}
    dom.window.close();
  }
});
