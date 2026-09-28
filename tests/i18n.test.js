import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {message,translate,translateError,initialLanguage,rememberLanguage,localizeDocument} from '../extension/i18n.js';

test('language preference wins over browser locale and storage failures do not block startup',()=>{
  const dom=new JSDOM('',{url:'https://extension.example'});
  Object.defineProperty(dom.window.navigator,'language',{value:'zh-TW',configurable:true});
  assert.equal(initialLanguage(dom.window),'zh');
  rememberLanguage(dom.window,'en');
  assert.equal(initialLanguage(dom.window),'en');
  dom.window.localStorage.setItem('fic.language','unsupported');
  assert.equal(initialLanguage(dom.window),'zh');
  const restricted={navigator:{language:'fr-FR'},get localStorage(){throw Error('Blocked');}};
  assert.equal(initialLanguage(restricted),'en');
  assert.doesNotThrow(()=>rememberLanguage(restricted,'zh'));
  dom.window.close();
});

test('nested progress and application errors re-render while unknown diagnostics are retained',()=>{
  const descriptor=message('threadResult',{label:message('threadPaused'),done:2,total:4,images:1,next:message('threadErrorNext',{error:message('error',{detail:'第 3 页：需要站点权限：https://photos.example。请再次点击相应操作并允许访问'})})});
  const en=translate(descriptor,'en');
  assert.match(en,/Thread scan paused: 2\/4 pages, 1 image\. /);
  assert.match(en,/Page 3: Site permission required: https:\/\/photos.example/);
  assert.doesNotMatch(en,/[\u3400-\u9fff]/);
  assert.match(translate(descriptor,'zh'),/整帖扫描暂停.*第 3 页/);
  assert.equal(translateError('下载中断：NETWORK_FAILED','en'),'Download interrupted: NETWORK_FAILED');
  assert.equal(translateError('下载中断：未知原因','en'),'Download interrupted: unknown reason');
  assert.match(translateError('图片请求失败（HTTP 403），可打开来源检查后重试','en'),/HTTP 403/);
  assert.equal(translateError('Custom server diagnostic','en'),'Custom server diagnostic');
});

test('document localization updates accessible labels and placeholders without interpreting website text as markup',()=>{
  const dom=new JSDOM('<html><body><label data-i18n="search"></label><input data-i18n-placeholder="searchPlaceholder" data-i18n-label="filterLabel"><p id="title"></p></body></html>');
  localizeDocument(dom.window.document,'en');
  assert.equal(dom.window.document.documentElement.lang,'en');
  assert.equal(dom.window.document.querySelector('input').getAttribute('aria-label'),'Filter images');
  assert.match(dom.window.document.querySelector('input').placeholder,/Filename/);
  const title=dom.window.document.getElementById('title');
  title.textContent=translate(message('selectImage',{post:'<img src=x onerror=alert(1)>',id:1}),'en');
  assert.equal(title.children.length,0);
  assert.match(title.textContent,/^Select image 1 from post <img src=x/);
  localizeDocument(dom.window.document,'zh');
  assert.equal(dom.window.document.documentElement.lang,'zh-CN');
  assert.equal(dom.window.document.querySelector('label').textContent,'查找图片');
  dom.window.close();
});

test('message catalog matches the panel: every used key exists in both languages and no key is unused',async()=>{
  const {catalog}=await import('../extension/i18n.js');
  for(const [key,[zh,en]] of Object.entries(catalog)){assert.ok(zh&&en,key);}
  const {readFile}=await import('node:fs/promises');
  const sources=(await Promise.all(['panel.js','panel.html'].map(file=>readFile(new URL('../extension/'+file,import.meta.url),'utf8')))).join('\n');
  for(const match of sources.matchAll(/(?:\bm|\btr)\('([A-Za-z]+)'|data-i18n(?:-placeholder|-label)?="([A-Za-z]+)"/g)){
    const key=match[1]||match[2];
    if(key!=='error')assert.ok(catalog[key],`missing message ${key}`); // 'error' wraps raw diagnostics
  }
  for(const key of Object.keys(catalog))assert.ok(sources.includes(`'${key}'`)||sources.includes(`"${key}"`),`unused message ${key}`);
});
