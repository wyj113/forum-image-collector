import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('panel flow: direct images are ready at once; failures stay selected and retryable',async()=>{
  const html=await readFile(new URL('../extension/panel.html',import.meta.url),'utf8');
  const dom=new JSDOM(html,{url:'https://extension.example/panel.html?tab=42'});
  const forum=new JSDOM('<title>Sample photo thread · Page 9</title><article class="message--post" id="js-post-169"><header class="message-attribution"><a>#169</a></header><article class="message-body"><div class="bbWrapper"><a href="https://media.image-cdn.example/images4/one.jpg"><img class="bbImage" src="https://media.image-cdn.example/images4/thumb1.jpg"></a><img class="bbImage" src="https://media.image-cdn.example/images4/two.jpg"><a href="https://unknown.test/view/3"><img class="bbImage" src="https://media.image-cdn.example/images4/thumb3.jpg"></a></div></article></article>',{url:'https://forum.example/threads/example.1/page-9'});
  const globals=['window','document','location','chrome','fetch','createImageBitmap'];
  const previous=new Map(globals.map(key=>[key,globalThis[key]]));
  let fail=true,downloadCount=0,fetchCount=0;
  Object.assign(globalThis,{
    window:dom.window,document:dom.window.document,location:dom.window.location,
    chrome:{tabs:{get:async()=>({url:forum.window.location.href})},scripting:{executeScript:async({func})=>[{result:func(forum.window.document)}]},runtime:{sendMessage:async()=>{throw Error('no background resolution is expected');}},downloads:{download:async opts=>{assert.match(opts.filename,/^帖子图片\/example\.1_page-9\/00[12]_post-169\.jpg$/);downloadCount++;return 10;},search:async()=>[{state:'complete'}]}},
    fetch:async imageUrl=>{fetchCount++;await new Promise(r=>setTimeout(r,20));if(fail)throw Error('模拟网络失败');return {ok:true,url:imageUrl,blob:async()=>new Blob([imageUrl],{type:'image/jpeg'})};},
    createImageBitmap:async()=>({width:1536,height:2048,close(){}})
  });
  const $=id=>dom.window.document.getElementById(id);
  const until=async condition=>{for(let i=0;i<100;i++){if(condition())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI did not settle');};
  try {
    globalThis.chrome.permissions={request:async()=>true,contains:async()=>true};
    dom.window.localStorage.setItem('fic.language','zh');
    await import('../extension/panel.js');
    await until(()=>$('grid').children.length===3);
    assert.equal($('resolve'),null,'direct images need no resolve step');
    assert.equal($('download').disabled,false);
    assert.equal($('grid').querySelectorAll('input:checked').length,2);
    assert.equal($('grid').querySelectorAll('input:disabled').length,1);
    // Produce static, no-network fixtures of the real UI in both languages.
    async function savePreview(filename){
    const preview=dom.window.document.documentElement.cloneNode(true);
    preview.querySelector('script')?.remove();
    // HTML serialization must preserve current input state in the static preview.
    const liveInputs=[...dom.window.document.querySelectorAll('input')];
    preview.querySelectorAll('input').forEach((input,index)=>{
      if(input.type==='checkbox')input.toggleAttribute('checked',liveInputs[index].checked);
      else input.setAttribute('value',liveInputs[index].value);
    });
    preview.querySelector('link').setAttribute('href','../extension/panel.css');
    preview.querySelectorAll('.picture img').forEach((el,index)=>{el.setAttribute('src','data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="250" height="300"><rect width="250" height="300" fill="${['#d7e8de','#e6ddd1','#dce3e9'][index]}"/><circle cx="125" cy="115" r="38" fill="#fff" opacity=".7"/><path d="M30 270L108 165l45 60 30-32 45 77" fill="#668877" opacity=".45"/><text x="125" y="35" text-anchor="middle" fill="#4b6255" font-size="14">${dom.window.document.documentElement.lang==='en'?'Preview sample':'预览示例'} ${index+1}</text></svg>`));});
    const liveOptions=[...dom.window.document.querySelectorAll('option')];
    preview.querySelectorAll('option').forEach((option,index)=>option.toggleAttribute('selected',liveOptions[index].selected));
    await mkdir(new URL('../preview/',import.meta.url),{recursive:true});
    await writeFile(new URL('../preview/'+filename,import.meta.url),'<!doctype html>'+preview.outerHTML);
    }
    await savePreview('index.html');
    $('language').value='en';$('language').dispatchEvent(new dom.window.Event('change'));
    await savePreview('index-en.html');
    $('language').value='zh';$('language').dispatchEvent(new dom.window.Event('change'));
    $('download').click();await until(()=>$('status').textContent.startsWith('下载结束'));
    assert.equal(downloadCount,0);
    assert.equal($('grid').querySelectorAll('.state.error').length,2,'failed downloads must report failure, not falsely claim saved');
    assert.equal($('grid').querySelectorAll('input:checked').length,2,'failed pictures remain selected for retry');
    fail=false;
    $('download').click();await until(()=>$('grid').querySelectorAll('.state.done').length===2);
    assert.equal(downloadCount,2,'each image saved once');
    assert.equal(fetchCount,4,'two failed attempts plus two successful retries');
    assert.equal($('download').disabled,true);
  } finally {for(const key of globals){if(previous.get(key)===undefined)delete globalThis[key];else globalThis[key]=previous.get(key);}dom.window.close();forum.window.close();}
});
