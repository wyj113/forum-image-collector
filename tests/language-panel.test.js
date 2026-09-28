import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('English UI switches live without changing selection or an active download/retry queue', async () => {
  const dom=new JSDOM(await readFile(new URL('../extension/panel.html',import.meta.url),'utf8'),{url:'https://extension.example/panel.html?tab=42'});
  const globals=['window','document','location','chrome','fetch','createImageBitmap'];
  const previous=new Map(globals.map(key=>[key,globalThis[key]]));
  const url='https://forum.example/threads/travel.1/';
  let grant=false, fail=true, release;
  const gate=new Promise(resolve=>{release=resolve;});
  const fetched=[],saved=[];
  Object.assign(globalThis,{
    window:dom.window,document:dom.window.document,location:dom.window.location,
    chrome:{permissions:{request:async()=>grant,contains:async()=>true},tabs:{get:async()=>({url})},scripting:{executeScript:async()=>[{result:{url,title:'Original 中文 title',posts:1,items:[1,2].map(id=>({id,post:'1',kind:'direct',source:`https://photos.example/${id}.jpg`,original:`https://photos.example/${id}.jpg`,preview:''}))}}]},downloads:{download:async options=>{saved.push(options.filename);return saved.length;},search:async()=>[{state:'complete'}]}},
    fetch:async imageUrl=>{fetched.push(imageUrl);await gate;if(fail)throw Error('图片解码失败，已跳过');return {ok:true,url:imageUrl,blob:async()=>new Blob([imageUrl],{type:'image/jpeg'})};},
    createImageBitmap:async()=>({width:800,height:1000,close(){}})
  });
  const $=id=>dom.window.document.getElementById(id);
  const until=async condition=>{for(let i=0;i<100;i++){if(condition())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI did not settle');};
  const language=value=>{$('language').value=value;$('language').dispatchEvent(new dom.window.Event('change'));};
  try{
    await import('../extension/panel.js?language');
    await until(()=>$('grid').children.length===2);
    assert.ok($('language'),'language switch is present');
    assert.equal(dom.window.document.documentElement.lang,'en');
    assert.equal($('resolve'),null,'no resolve step in the interface');
    assert.match($('download').textContent,/Download selected.*2/);
    assert.match($('status').textContent,/Found 2 images/);
    assert.equal($('title').textContent,'Original 中文 title','source content is not translated');
    const folder=$('folder').value;
    $('search').value='1.jpg';$('search').dispatchEvent(new dom.window.Event('input'));
    language('zh');
    assert.equal(dom.window.document.documentElement.lang,'zh-CN');
    assert.match($('download').textContent,/下载已选图片.*1/);
    assert.equal(dom.window.localStorage.getItem('fic.language'),'zh');
    assert.equal($('search').value,'1.jpg');
    assert.equal($('grid').querySelectorAll('input:checked').length,2);
    assert.equal($('folder').value,folder);
    language('en');
    $('download').click();await until(()=>!$('rescan').disabled);
    assert.match($('status').textContent,/Site access was not granted/);
    assert.equal(fetched.length,0);
    grant=true;
    $('download').click();await until(()=>fetched.length===1);
    language('zh');
    assert.equal($('language').disabled,false,'language can change during work');
    assert.match($('status').textContent,/下载 0\/1/);
    assert.match($('grid').children[0].querySelector('.state').textContent,/获取并验证/);
    release();await until(()=>!$('rescan').disabled);
    language('en');
    assert.match($('status').textContent,/Download finished.*1 failed/);
    assert.match($('grid').children[0].querySelector('.state').textContent,/Image decoding failed/);
    assert.match($('retryDownloads').textContent,/Retry failed downloads.*1/);
    fail=false;
    $('retryDownloads').click();await until(()=>!$('rescan').disabled);
    assert.equal(saved.length,1);
    assert.ok(saved[0].includes('/001_'));
    assert.match($('grid').children[0].querySelector('.state').textContent,/Saved.*800.*1000/);
    language('zh');
    assert.match($('grid').children[0].querySelector('.state').textContent,/已保存/);
    assert.equal($('grid').querySelectorAll('input:checked').length,1);
    assert.equal($('folder').value,folder);
  }finally{
    release();
    for(const key of globals){if(previous.get(key)===undefined)delete globalThis[key];else globalThis[key]=previous.get(key);}
    dom.window.close();
  }
});

test('image type labels translate while original file names and post numbers are preserved',async()=>{
  const dom=new JSDOM(await readFile(new URL('../extension/panel.html',import.meta.url),'utf8'),{url:'https://extension.example/panel.html?tab=42'});
  const keys=['window','document','location','chrome'];
  const previous=new Map(keys.map(key=>[key,globalThis[key]]));
  const url='https://forum.example/threads/travel.1/';
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,
    chrome:{tabs:{get:async()=>({url})},scripting:{executeScript:async()=>[{result:{url,title:'Original thread',posts:1,items:[
      {id:1,post:'7',kind:'direct',name:'camera.jpg',source:'https://photos.example/camera.jpg',preview:'',original:'https://photos.example/camera.jpg'},
      {id:2,post:'8',kind:'unsupported',source:'https://viewer.example/img/one',preview:'',original:''}]}}]}}});
  try{
    dom.window.localStorage.setItem('fic.language','en');
    await import('../extension/panel.js?type-language');
    for(let i=0;i<100&&dom.window.document.querySelectorAll('.card').length<2;i++)await new Promise(r=>setTimeout(r,10));
    const [direct,other]=[...dom.window.document.querySelectorAll('.card')];
    assert.equal(direct.querySelector('.post').textContent,'camera.jpg');
    assert.equal(direct.querySelector('.type').textContent,'Direct image');
    assert.equal(other.querySelector('.type').textContent,'Other link');
    assert.equal(other.querySelector('input').disabled,true,'unsupported links cannot be selected');
    const language=dom.window.document.getElementById('language');
    language.value='zh';language.dispatchEvent(new dom.window.Event('change'));
    assert.equal(direct.querySelector('.type').textContent,'正文直链');
    assert.equal(other.querySelector('.type').textContent,'其他链接');
    assert.equal(direct.querySelector('.post').textContent,'camera.jpg');
  }finally{
    for(const key of keys){if(previous.get(key)===undefined)delete globalThis[key];else globalThis[key]=previous.get(key);}
    dom.window.close();
  }
});
