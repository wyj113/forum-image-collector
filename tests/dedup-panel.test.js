import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

async function panel(run) {
  const dom=new JSDOM(await readFile(new URL('../extension/panel.html',import.meta.url),'utf8'),{url:'https://extension.example/panel.html?tab=42'});
  const keys=['window','document','location','chrome','fetch','createImageBitmap'];
  const old=new Map(keys.map(key=>[key,globalThis[key]]));
  const url='https://forum.example/threads/test.1/page-9';
  const items=Array.from({length:4},(_,i)=>({id:i+1,post:'169',kind:'direct',source:`https://media.image-cdn.example/images4/${i}.jpg`,original:`https://media.image-cdn.example/images4/${i}.jpg`,preview:'',name:`${i}.jpg`}));
  const state={requests:[],saved:[],fail:false,hold:null};
  Object.assign(globalThis,{
    window:dom.window,document:dom.window.document,location:dom.window.location,
    chrome:{tabs:{get:async()=>({url})},scripting:{executeScript:async()=>[{result:{url,title:'去重测试',posts:1,items:items.map(x=>({...x}))}}]},runtime:{sendMessage:async()=>{throw Error('no background resolution is expected');}},downloads:{download:async options=>{state.saved.push(options.filename);return state.saved.length;},search:async()=>[{state:'complete'}]}},
    fetch:async imageUrl=>{
      state.requests.push(imageUrl);if(state.hold)await state.hold;
      const index=Number(new URL(imageUrl).pathname.match(/(\d)\.jpg$/)[1]);
      if(state.fail && index===1)throw Error('模拟网络失败');
      return {ok:true,url:imageUrl,blob:async()=>new Blob([index<2?'identical original bytes':`different original ${index}`],{type:'image/jpeg'})};
    },createImageBitmap:async()=>({width:800,height:1000,close(){}})
  });
  const $=id=>dom.window.document.getElementById(id);
  const cards=()=>[...$('grid').children];
  const selected=()=>cards().flatMap((card,i)=>card.querySelector('input').checked?[i+1]:[]);
  const until=async condition=>{for(let i=0;i<150;i++){if(condition())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI did not settle: '+$('status').textContent);};
  const dedup=async()=>{$('dedup').click();await until(()=>!$('rescan').disabled&&$('status').textContent.startsWith('去重结束'));};
  try {
    globalThis.chrome.permissions={request:async()=>true,contains:async()=>true};
    dom.window.localStorage.setItem('fic.language','zh');
    await import(`../extension/panel.js?dedup=${Math.random()}`);
    await until(()=>cards().length===4);
    assert.ok($('dedup'),'deduplicate control exists');
    await run({$,cards,selected,until,dedup,state,dom});
  }finally{for(const key of keys){if(old.get(key)===undefined)delete globalThis[key];else globalThis[key]=old.get(key);}dom.window.close();}
}

test('identical bytes at different URLs are excluded; checks cache across rescan; downloads keep only unique files',()=>panel(async({$,cards,selected,until,dedup,state})=>{
  await dedup();
  assert.deepEqual(selected(),[1,3,4]);
  assert.match(cards()[1].textContent,/重复.*1/);
  assert.equal(cards()[1].querySelector('input').disabled,true);
  assert.match($('summary').textContent,/1 张重复/);
  assert.equal(state.requests.length,4);
  $('select').click();assert.deepEqual(selected(),[1,3,4]);
  await dedup();assert.equal(state.requests.length,4,'repeated check reuses hashes');
  $('rescan').click();await until(()=>!$('rescan').disabled);await dedup();
  assert.equal(state.requests.length,4,'rescan in same panel retains fingerprints');
  assert.deepEqual(selected(),[1,3,4]);
  $('download').click();await until(()=>$('status').textContent.startsWith('下载结束'));
  assert.equal(state.saved.length,3);
  assert.ok(!state.saved.some(name=>name.includes('/002_')));
}));

test('failed checks stay selectable and retryable; an unchecked keeper inherits its selected duplicate',()=>panel(async({$,cards,selected,dedup,state})=>{
  state.fail=true;cards()[0].querySelector('input').click();
  await dedup();assert.deepEqual(selected(),[2,3,4]);
  assert.match(cards()[1].textContent,/失败/);
  state.fail=false;await dedup();
  assert.deepEqual(selected(),[1,3,4]);
  assert.equal(state.requests.length,5,'only the failed file is fetched again');
}));

test('stop checks after current image; completed files take priority over unchecked duplicates',()=>panel(async({$,cards,dedup,until,state,selected})=>{
  let release;state.hold=new Promise(resolve=>{release=resolve;});
  $('dedup').click();await until(()=>state.requests.length===1);
  $('stop').click();release();state.hold=null;
  await until(()=>!$('rescan').disabled);
  assert.equal(state.requests.length,1,'check only one file at a time');
  assert.deepEqual(selected(),[1,2,3,4],'unchecked files are not called duplicates');
  $('clear').click();cards()[1].querySelector('input').click();
  $('download').click();await until(()=>$('status').textContent.startsWith('下载结束'));
  await dedup();
  assert.equal(cards()[0].querySelector('input').disabled,true,'saved later file is kept over earlier duplicate');
  assert.match(cards()[1].textContent,/已保存/);
  assert.equal(state.saved.length,1);
}));
