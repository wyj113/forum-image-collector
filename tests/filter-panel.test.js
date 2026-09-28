import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

// A hidden selected card must never leak into a visible-only download queue.
test('filters scope selection, Shift ranges and downloads without losing hidden selections', async () => {
  const dom = new JSDOM(await readFile(new URL('../extension/panel.html', import.meta.url), 'utf8'), {url:'https://extension.example/panel.html?tab=42'});
  const globals = ['window','document','location','chrome','fetch','createImageBitmap'];
  const previous = new Map(globals.map(key => [key, globalThis[key]]));
  const url = 'https://forum.example/threads/travel.1/';
  const source = [
    {name:'Lake one.jpg',post:'1',page:1,kind:'direct'},
    {name:'Forest.jpg',post:'2',page:1,kind:'direct'},
    {name:'LAKE two.jpg',post:'3',page:2,kind:'direct'},
    {name:'Lake linked page',post:'4',page:2,kind:'unsupported'},
    {name:'Lake unsupported',post:'5',page:3,kind:'unsupported'}
  ].map((item,i) => ({...item,id:i+1,source:`https://photos.example/${i}.jpg`,preview:'',original:item.kind==='direct'?`https://photos.example/${i}.jpg`:''}));
  const saved = [];
  let releaseFetch;
  const gate = new Promise(resolve => {releaseFetch=resolve;});
  Object.assign(globalThis, {
    window:dom.window,document:dom.window.document,location:dom.window.location,
    chrome:{permissions:{request:async()=>true,contains:async()=>true},tabs:{get:async()=>({url})},scripting:{executeScript:async()=>[{result:{url,title:'Travel',posts:5,items:source}}]},downloads:{download:async options=>{saved.push(options.filename);return saved.length;},search:async()=>[{state:'complete'}]}},
    fetch:async imageUrl=>{await gate;return {ok:true,url:imageUrl,blob:async()=>new Blob([imageUrl],{type:'image/jpeg'})};},
    createImageBitmap:async()=>({width:800,height:1000,close(){}})
  });
  const $ = id=>dom.window.document.getElementById(id);
  const cards = ()=>[...$('grid').children];
  const visible = ()=>cards().flatMap((card,i)=>card.hidden?[]:[i+1]);
  const selected = ()=>cards().flatMap((card,i)=>card.querySelector('input').checked?[i+1]:[]);
  const change = (id,value,event='change')=>{$(id).value=value;$(id).dispatchEvent(new dom.window.Event(event,{bubbles:true}));};
  const until = async condition=>{for(let i=0;i<100;i++){if(condition())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI did not settle');};
  try {
    dom.window.localStorage.setItem('fic.language','zh');
    await import('../extension/panel.js?filters');
    await until(()=>cards().length===5);
    assert.ok($('search'), 'preview keyword filter is available');
    assert.ok($('filter'), 'preview status filter is available');
    change('search','  lAkE  ','input');
    assert.deepEqual(visible(),[1,3,4,5]);
    change('filter','ready');
    assert.deepEqual(visible(),[1,3]);
    $('clear').click();
    assert.deepEqual(selected(),[2], 'hidden selection survives clearing visible cards');
    cards()[0].querySelector('.picture').click();
    cards()[2].querySelector('.picture').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,shiftKey:true}));
    assert.deepEqual(selected(),[1,2,3], 'range selects visible cards and preserves hidden selection');
    assert.equal([...$('filter').options].some(option=>option.value==='unresolved'),false,'no unresolved state without a resolve step');
    change('filter','unsupported');assert.deepEqual(visible(),[4,5]);
    change('filter','ready');
    change('search','not present','input');
    assert.deepEqual(visible(),[]);
    assert.equal($('empty').hidden,false);
    assert.equal($('download').disabled,true);
    change('search','lake','input');
    $('download').click();
    assert.equal($('search').disabled,true,'filters are fixed for the running queue');
    assert.equal($('filter').disabled,true);
    releaseFetch();
    await until(()=>$('status').textContent.startsWith('下载结束'));
    assert.equal(saved.length,2);
    assert.ok(saved.some(name=>name.includes('/001_')));
    assert.ok(saved.some(name=>name.includes('/003_')));
    assert.equal(saved.some(name=>name.includes('/002_')),false);
    change('filter','done');assert.deepEqual(visible(),[1,3]);
    $('resetFilters').click();
    assert.deepEqual(visible(),[1,2,3,4,5]);
    assert.deepEqual(selected(),[2]);
    change('search','Forest','input');
    $('rescan').click();await until(()=>!$('rescan').disabled);
    assert.deepEqual(visible(),[1,2,3,4,5],'new scan starts with clear filters');
  } finally {
    releaseFetch();
    for(const key of globals){if(previous.get(key)===undefined)delete globalThis[key];else globalThis[key]=previous.get(key);}
    dom.window.close();
  }
});
