import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('retry downloads only selected visible download failures, preserves permission denial and skips successes', async () => {
  const dom = new JSDOM(await readFile(new URL('../extension/panel.html',import.meta.url),'utf8'),{url:'https://extension.example/panel.html?tab=42'});
  const globals=['window','document','location','chrome','fetch','createImageBitmap'];
  const previous=new Map(globals.map(key=>[key,globalThis[key]]));
  const url='https://forum.example/threads/retry.1/';
  let fail=true, grant=true;
  const fetched=[], saved=[];
  const source=Array.from({length:3},(_,i)=>({id:i+1,post:String(i+1),kind:'direct',source:`https://photos.example/${i+1}.jpg`,original:`https://photos.example/${i+1}.jpg`,preview:''}));
  Object.assign(globalThis,{
    window:dom.window,document:dom.window.document,location:dom.window.location,
    chrome:{permissions:{request:async()=>grant,contains:async()=>true},tabs:{get:async()=>({url})},scripting:{executeScript:async()=>[{result:{url,title:'Retry',posts:3,items:source}}]},downloads:{download:async options=>{saved.push(options.filename);return saved.length;},search:async()=>[{state:'complete'}]}},
    fetch:async imageUrl=>{fetched.push(imageUrl);if(fail&&!imageUrl.endsWith('/1.jpg'))throw Error('Temporary failure');return {ok:true,url:imageUrl,blob:async()=>new Blob([imageUrl],{type:'image/jpeg'})};},
    createImageBitmap:async()=>({width:800,height:1000,close(){}})
  });
  const $=id=>dom.window.document.getElementById(id);
  const until=async condition=>{for(let i=0;i<100;i++){if(condition())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI did not settle');};
  try {
    dom.window.localStorage.setItem('fic.language','zh');
    await import('../extension/panel.js?retry');
    await until(()=>$('grid').children.length===3);
    assert.ok($('retryDownloads'),'dedicated retry action is available');
    assert.equal($('retryDownloads').disabled,true);
    $('dedup').click();await until(()=>!$('rescan').disabled&&$('status').textContent.startsWith('去重结束'));
    assert.equal($('grid').querySelectorAll('.state.error').length,2);
    assert.equal($('retryDownloads').disabled,true,'dedup failures are not download retries');
    fetched.length=0;
    $('download').click();await until(()=>$('status').textContent.startsWith('下载结束'));
    assert.equal(saved.length,1);
    assert.equal($('retryDownloads').disabled,false);
    grant=false;
    $('retryDownloads').click();await until(()=>!$('rescan').disabled);
    assert.equal(fetched.length,3,'denied retry does not fetch');
    assert.equal($('grid').querySelectorAll('.state.error').length,2);
    grant=true;fail=false;
    const second=$('grid').children[1];
    second.querySelector('input').click();
    $('retryDownloads').click();await until(()=>!$('rescan').disabled&&$('status').textContent.startsWith('下载结束'));
    assert.equal(saved.length,2,'unselected failed image is left alone');
    assert.equal($('retryDownloads').disabled,true);
    assert.equal(second.querySelector('.state').classList.contains('error'),true);
    second.querySelector('input').click();
    $('search').value='3.jpg';$('search').dispatchEvent(new dom.window.Event('input'));
    assert.equal($('retryDownloads').disabled,true,'hidden failure cannot be retried');
    $('resetFilters').click();
    $('retryDownloads').click();await until(()=>!$('rescan').disabled&&$('status').textContent.startsWith('下载结束'));
    assert.equal(saved.length,3);
    assert.deepEqual(fetched.map(x=>x.split('/').pop()),['1.jpg','2.jpg','3.jpg','3.jpg','2.jpg']);
    assert.equal($('grid').querySelectorAll('.state.done').length,3);
    assert.equal($('retryDownloads').disabled,true);
  } finally {
    for(const key of globals){if(previous.get(key)===undefined)delete globalThis[key];else globalThis[key]=previous.get(key);}
    dom.window.close();
  }
});
