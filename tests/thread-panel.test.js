import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {scanPage} from '../extension/core.js';
const base='https://forum.example/threads/example.12/';
function page(number){
  const image=id=>`<a href="https://media.image-cdn.example/images4/${id}.jpg"><img class="bbImage" src="https://media.image-cdn.example/thumbs/${id}.jpg"></a>`;
  const body=`<article class="message--post" id="js-post-${number}"><div class="message-body"><div class="bbWrapper">${image('shared')}${image('page'+number)}</div></div></article>`;
  const nav=`<div class="pageNav"><ul class="pageNav-main"><a href="${base}">1</a><a href="${base}page-3">3</a></ul>${number<3?`<a class="pageNav-jump--next" href="${base}page-${number+1}">Next</a>`:''}</div>`;
  const dom=new JSDOM(body+nav,{url:base+(number===1?'':`page-${number}`)});
  const result=scanPage(dom.window.document);dom.window.close();return result;
}

test('whole-thread panel preserves partial results, resumes, deduplicates and keeps filtering controls',async()=>{
  const dom=new JSDOM(await readFile(new URL('../extension/panel.html',import.meta.url),'utf8'),{url:'https://extension.example/panel.html?tab=42'});
  const keys=['window','document','location','chrome'];const old=new Map(keys.map(key=>[key,globalThis[key]]));
  const requests=[];let fail=true;
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,
    chrome:{tabs:{get:async()=>({url:base+'page-2'})},scripting:{executeScript:async()=>[{result:page(2)}]},runtime:{sendMessage:async message=>{
      if(message.type==='threadPage'){
        const number=Number(message.url.match(/page-(\d+)$/)?.[1]||1);requests.push(number);
        if(number===2&&fail)return {error:'需要登录或验证'};
        return {page:page(number)};
      }
      throw Error('unexpected message');
    }}}});
  const $=id=>dom.window.document.getElementById(id);
  const until=async condition=>{for(let i=0;i<600;i++){if(condition())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI did not settle: '+$('status').textContent);};
  try{
    globalThis.chrome.permissions={request:async()=>true,contains:async()=>true};
    dom.window.localStorage.setItem('fic.language','zh');
    await import('../extension/panel.js?threadTest');await until(()=>$('grid').children.length===2);
    assert.ok($('scanThread'),'whole-thread control exists');
    assert.equal($('scanThread').hidden,false);
    assert.equal($('concurrency')?.value,'2');
    $('scanThread').click();assert.equal($('rescan').disabled,true);
    assert.equal($('concurrency').disabled,true);
    await until(()=>!$('rescan').disabled);
    assert.deepEqual(requests,[1,2]);assert.equal($('grid').children.length,2);
    assert.match($('status').textContent,/登录|验证/);assert.match($('scanThread').textContent,/继续/);
    fail=false;$('scanThread').click();await until(()=>!$('rescan').disabled);
    assert.deepEqual(requests,[1,2,2,3],'resume must not re-read completed page 1');
    assert.equal($('grid').children.length,4,'shared link is kept once across pages');
    assert.match($('status').textContent,/3\/3/);assert.match($('folder').value,/全部页/);
    assert.equal($('concurrency').disabled,false);
    assert.match($('grid').textContent,/第 3 页/);
    assert.equal($('grid').querySelectorAll('input:checked').length,4,'direct images are selectable without a resolve step');
    const cards=[...$('grid').children];$('clear').click();cards[0].querySelector('.picture').click();
    cards[3].querySelector('.picture').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,shiftKey:true}));
    assert.equal($('grid').querySelectorAll('input:checked').length,4);
    $('rescan').click();await until(()=>!$('rescan').disabled);assert.equal($('grid').children.length,2);
    assert.doesNotMatch($('scanThread').textContent,/继续/);
  }finally{for(const key of keys){if(old.get(key)===undefined)delete globalThis[key];else globalThis[key]=old.get(key);}dom.window.close();}
});
