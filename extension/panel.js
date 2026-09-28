import {scanPage,allowedImage,safeFolder,validateBlob} from './core.js';
import {waitForDownload} from './workflow.js';
import {FingerprintCache,fingerprintKey} from './dedup.js';
import {collectThread} from './thread.js';
import {requestAccess,requireAccess} from './permissions.js';
import {message as m,translate,initialLanguage,rememberLanguage,localizeDocument} from './i18n.js';
const fingerprints=new FingerprintCache();
let language=initialLanguage(window);
const tr=(key,values)=>translate(m(key,values),language);
const operationMessage=kind=>m({download:'opDownload',dedup:'opDedup'}[kind]);
let statusMessage=m('initialStatus');
const $ = id=>document.getElementById(id);
let items=[], busy=false, stop=false, snapshot;
let selectionAnchor=null;
let threadState=null;
const sourceId = Number(new URLSearchParams(location.search).get('tab'));
const status = descriptor=>{statusMessage=descriptor;$('status').textContent=translate(descriptor,language);};
const eligible = item=>Boolean(item.original)&&allowedImage(item.original)&&!['done','duplicate'].includes(item.phase);
const taskConcurrency=()=>Math.min(4,Math.max(1,Math.floor(Number($('concurrency').value))||2));

function matchesFilter(item) {
  const query=$('search').value.trim().toLowerCase();
  const text=[item.name,item.post,item.page,item.source].filter(x=>x!=null).join(' ').toLowerCase();
  if(query&&!text.includes(query))return false;
  switch($('filter').value){
    case 'ready': return eligible(item);
    case 'error': return item.phase==='error';
    case 'done': return item.phase==='done';
    case 'duplicate': return item.phase==='duplicate';
    case 'unsupported': return item.kind==='unsupported';
    default: return true;
  }
}
const visibleItems=()=>items.filter(matchesFilter);
const selectedDownloads=()=>visibleItems().filter(x=>x.selected&&eligible(x));
const failedDownloads=()=>selectedDownloads().filter(x=>x.phase==='error'&&x.failedAction==='download');

function resetFilters() {
  $('search').value='';$('filter').value='all';selectionAnchor=null;
}

async function authorize(urls,action){
  if(busy)return;
  busy=true;stop=false;sync();items.forEach(paint);
  try{
    const granted=await requestAccess(urls);
    if(!granted){status(m('noPermission'));return;}
    if(stop){status(m('cancelled'));return;}
    busy=false;
    await action();
  }catch(error){status(error.message);}
  finally{busy=false;items.forEach(paint);sync();}
}
const accessFor=queue=>queue.map(item=>item.original).filter(Boolean);

function sync() {
  const ready=items.filter(eligible), visible=visibleItems(), chosen=selectedDownloads();
  $('count').textContent=items.length;
  $('summary').textContent=tr('summary',{posts:snapshot?.posts||0,images:items.length,ready:ready.length,done:items.filter(x=>x.phase==='done').length,duplicates:items.filter(x=>x.phase==='duplicate').length});
  $('dedup').disabled=busy || items.filter(x=>x.original&&allowedImage(x.original)&&x.phase!=='duplicate').length<2;
  $('download').disabled=busy || !chosen.length;
  $('download').textContent=tr('download',{count:chosen.length?m('count',{n:chosen.length}):''});
  const failed=failedDownloads();
  $('retryDownloads').disabled=busy||!failed.length;
  $('retryDownloads').textContent=tr('retryDownloads',{count:failed.length?m('count',{n:failed.length}):''});
  for(const id of ['rescan','select','clear','folder','concurrency','search','filter','resetFilters']) $(id).disabled=busy;
  $('filterSummary').textContent=tr('filterSummary',{visible:visible.length,total:items.length,chosen:chosen.length,hidden:items.filter(x=>!matchesFilter(x)&&x.selected&&eligible(x)).length});
  items.forEach(item=>{if(item.card)item.card.hidden=!matchesFilter(item);});
  $('scanThread').hidden=!snapshot?.thread;
  $('scanThread').disabled=busy || !snapshot?.thread;
  $('scanThread').textContent=threadState&&!threadState.complete?tr('resumeThread',{done:threadState.nextPage-1,total:threadState.total}):tr('scanThread');
  $('threadRetry').hidden=busy || !threadState || threadState.complete;
  if(threadState)$('threadRetry').href=threadState.baseUrl+(threadState.nextPage===1?'':`page-${threadState.nextPage}`);
  $('stop').hidden=!busy;
  $('empty').hidden=visible.length>0;
  $('empty').textContent=tr(items.length?'noMatches':'empty');
}

function paintSelection(item) {
  const card=item.card;
  card.classList.toggle('duplicate',item.phase==='duplicate');
  card.classList.toggle('chosen',item.selected&&eligible(item));
  card.classList.toggle('selectable',!busy&&eligible(item));
  const input=card.querySelector('input');
  input.checked=Boolean(item.selected&&eligible(item));
  input.disabled=busy || !eligible(item);
}

function refreshSelection() {
  items.forEach(paintSelection);
  sync();
}

function choose(item,event,checkbox) {
  if(busy || !eligible(item))return;
  const additive=event.ctrlKey || event.metaKey;
  const visible=visibleItems();
  const anchorIndex=visible.indexOf(selectionAnchor), targetIndex=visible.indexOf(item);
  if(event.shiftKey && anchorIndex>=0) {
    if(!additive)visible.forEach(x=>{x.selected=false;});
    const start=Math.min(anchorIndex,targetIndex), end=Math.max(anchorIndex,targetIndex);
    for(let index=start;index<=end;index++)if(eligible(visible[index]))visible[index].selected=true;
  } else {
    if(!event.shiftKey && (additive || checkbox))item.selected=!item.selected;
    else {
      if(!additive)visible.forEach(x=>{x.selected=false;});
      item.selected=true;
    }
    selectionAnchor=item;
  }
  refreshSelection();
}

function update(item) {
  paint(item);
  sync();
}

function paint(item) {
  const card=item.card;
  paintSelection(item);
  const state=card.querySelector('.state');
  state.textContent=translate(item.note,language);
  const post=item.post;
  card.querySelector('img').alt=tr('imageAlt',{post,id:item.id});
  card.querySelector('input').setAttribute('aria-label',tr('selectImage',{post,id:item.id}));
  card.querySelector('.post').textContent=item.name||`${item.page?tr('page',{page:item.page}):''}#${post} · ${item.id}`;
  card.querySelector('.type').textContent=tr(item.kind==='direct'?'directImage':'otherHost');
  card.querySelector('.origin').textContent=tr('viewSource');
  card.querySelector('.original').textContent=tr('viewOriginal');
  state.className=`state ${item.phase==='error'?'error':item.phase==='done'?'done':''}`;
  const original=card.querySelector('.original');
  original.hidden=!item.original;
  if(item.original)original.href=item.original;
}

function render(start=0) {
  if(!start)$('grid').replaceChildren();
  for(const item of items.slice(start)) {
    const card=document.createElement('article');card.className='card';
    // Fixed markup only. All website strings are assigned with textContent.
    card.innerHTML='<div class="picture"><img loading="lazy" referrerpolicy="no-referrer"><input type="checkbox"></div><div class="details"><div class="row"><span class="post"></span><span class="type"></span></div><p class="state"></p><div class="links"><a class="origin" target="_blank" rel="noreferrer"></a><a class="original" target="_blank" rel="noreferrer" hidden></a></div></div>';
    card.querySelector('img').src=item.preview;
    card.querySelector('img').draggable=false;
    card.querySelector('.origin').href=item.source;
    const check=card.querySelector('input');
    card.querySelector('.picture').addEventListener('click',event=>choose(item,event,event.target===check));
    item.card=card;$('grid').append(card);paint(item);
  }
  sync();
}

function prepare(item) {
  if(item.kind==='direct'&&!allowedImage(item.original)){item.kind='unsupported';item.original='';}
  return {...item,selected:Boolean(item.original),phase:'pending',note:m(item.kind==='direct'?'pendingDirect':'unsupportedNote')};
}

async function scan() {
  resetFilters();
  selectionAnchor=null;
  threadState=null;
  busy=true;sync();status(m('scanning'));
  try {
    if(!Number.isInteger(sourceId)||sourceId<=0)throw Error('请先打开论坛帖子，再点击扩展图标');
    const tab=await chrome.tabs.get(sourceId);
    const source=new URL(tab.url || '');
    if(source.protocol!=='https:'||source.username||source.password)throw Error('请在 HTTPS 论坛帖子页面点击扩展图标');
    const [result]=await chrome.scripting.executeScript({target:{tabId:sourceId},func:scanPage});
    snapshot=result.result;
    $('title').textContent=snapshot.title;
    $('source').href=snapshot.url;
    const thread=new URL(snapshot.url).pathname.split('/').filter(Boolean);
    $('folder').value=safeFolder(`${thread[1] || '帖子'}_${thread[2] || 'page-1'}`);
    items=snapshot.items.map(prepare);
    status(items.length?m('found',{images:items.length}):m('noneFound'));
  } catch(e) { items=[];status(e.message); }
  finally {busy=false;render();}
}

async function scanThread() {
  if(busy || !snapshot?.thread)return;
  selectionAnchor=null;busy=true;stop=false;
  if(!threadState || threadState.complete){
    resetFilters();
    threadState={baseUrl:snapshot.thread.baseUrl,nextPage:1,total:snapshot.thread.total,complete:false};
    items=[];snapshot={...snapshot,posts:0};
    $('source').href=threadState.baseUrl;
    $('folder').value=safeFolder(new URL(threadState.baseUrl).pathname.split('/')[2]+'_全部页');
  }
  render();
  const seen=new Set(items.map(x=>x.source));
  let error='';
  try{
    await collectThread(threadState,{
      concurrency:taskConcurrency(),
      shouldStop:()=>stop,
      onProgress:(page,total,pages)=>{
        $('progress').hidden=false;$('progress').max=total;$('progress').value=page-1;
        status(m('threadProgress',{pages:pages.join(', ')||page,total,concurrency:taskConcurrency(),images:items.length}));
      },
      readPage:async url=>{
        const result=await chrome.runtime.sendMessage({type:'threadPage',url});
        if(result?.error)throw Error(result.error);
        return result?.page;
      },
      onPage:data=>{
        const start=items.length;
        for(const item of data.items){
          if(seen.has(item.source))continue;
          seen.add(item.source);items.push(prepare({...item,id:items.length+1}));
        }
        snapshot.posts+=data.posts;
        render(start);
        $('progress').max=Math.max(threadState.total,data.thread.total);$('progress').value=data.thread.page;
      }
    });
  }catch(e){error=e.message;}
  finally{
    busy=false;items.forEach(paint);sync();
    status(m('threadResult',{label:m(threadState.complete?'threadComplete':error?'threadPaused':'threadStopped'),done:threadState.nextPage-1,total:threadState.total,images:items.length,next:error?m('threadErrorNext',{error:m('error',{detail:error})}):m(threadState.complete?'threadReadyNext':'threadResumeNext')}));
  }
}

async function batch(queue,action,kind) {
  busy=true;stop=false;sync();items.forEach(paint);
  status(m('batchProgress',{label:operationMessage(kind),finished:0,total:queue.length,errors:''}));
  let cursor=0,finished=0,errors=0;
  $('progress').hidden=false;$('progress').max=queue.length||1;$('progress').value=0;
  async function worker() {
    while(!stop && cursor<queue.length) {
      const item=queue[cursor++];
      try{await action(item);item.failedAction='';}catch(e){item.phase='error';item.failedAction=kind;item.note=e.message;errors++;}
      finally{finished++;$('progress').value=finished;update(item);status(m('batchProgress',{label:operationMessage(kind),finished,total:queue.length,errors:errors?m('batchErrors',{count:errors}):''}));}
    }
  }
  const limit=kind==='dedup' ? 1 : taskConcurrency();
  try{await Promise.all(Array.from({length:Math.min(limit,queue.length)},()=>worker()));}
  finally{busy=false;items.forEach(paint);sync();status(m('batchResult',{label:stop?m('batchStopped'):m('batchFinished',{label:operationMessage(kind)}),finished,total:queue.length,errors,next:m(kind==='download'?'downloadNext':'batchNext')}));}
}

async function deduplicate() {
  const seen=new Map();
  // Prefer a successfully saved copy even when it occurs later in the list.
  const queue=items.filter(x=>x.original&&allowedImage(x.original)&&x.phase!=='duplicate').sort((a,b)=>Number(b.phase==='done')-Number(a.phase==='done'));
  await batch(queue,async item=>{
    const done=item.phase==='done';
    if(!done){item.note=m('checkingDuplicates');update(item);}
    const hash=await fingerprints.get(fingerprintKey(item),async()=>(await loadImage(item)).blob);
    const keeper=seen.get(hash);
    if(keeper && !done){
      if(item.selected&&eligible(keeper)){keeper.selected=true;update(keeper);}
      item.selected=false;item.phase='duplicate';item.note=m('duplicateNote',{id:keeper.id});
    } else {
      if(!keeper)seen.set(hash,item);
      if(!done){item.phase='ready';item.note=m('uniqueNote');}
    }
  },'dedup');
}

// Share the actual saving promise: duplicates must observe its success or failure.
const originalSaves=new Map();
async function save(item) {
  const key=item.original;
  const existing=originalSaves.get(key);
  if(existing){
    item.note=m('waitingSave');update(item);
    await existing;
    item.phase='done';item.selected=false;item.note=m('alreadySaved');return;
  }
  const promise=saveFile(item);
  originalSaves.set(key,promise);
  try{await promise;}catch(e){originalSaves.delete(key);throw e;}
}

async function saveFile(item) {
  item.note=m('validating');update(item);
  let objectUrl;
  try {
    const {blob,info}=await loadImage(item);
    await fingerprints.get(fingerprintKey(item),async()=>blob);
    const name=`帖子图片/${safeFolder($('folder').value)}/${String(item.id).padStart(3,'0')}_post-${safeFolder(item.post)}.${info.ext}`;
    objectUrl=URL.createObjectURL(blob);
    item.note=m('saving',{width:info.width,height:info.height});update(item);
    const id=await chrome.downloads.download({url:objectUrl,filename:name,saveAs:false,conflictAction:'uniquify'});
    await waitForDownload(id,chrome);
    item.phase='done';item.selected=false;item.note=m('saved',{width:info.width,height:info.height});
  } finally {if(objectUrl)URL.revokeObjectURL(objectUrl);}
}

async function loadImage(item) {
    await requireAccess(item.original);
    const response=await fetch(item.original,{credentials:'include',redirect:'error',signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw Error(`图片请求失败（HTTP ${response.status}），可打开来源检查后重试`);
    if(!allowedImage(response.url))throw Error('图片跳转到未支持的地址，已跳过');
    const blob=await response.blob();
    const info=await validateBlob(blob);
    return {blob,info};
}

function applyLanguage() {
  // Static copy, existing cards and the current status update without restarting work.
  const title=$('title').textContent;
  localizeDocument(document,language);
  if(snapshot)$('title').textContent=title;
  $('language').value=language;
  items.forEach(paint);
  sync();
  status(statusMessage);
}
$('language').addEventListener('change',()=>{
  language=$('language').value==='zh'?'zh':'en';
  rememberLanguage(window,language);
  applyLanguage();
});
applyLanguage();
$('rescan').addEventListener('click',scan);
$('scanThread').addEventListener('click',()=>authorize([snapshot?.thread?.baseUrl],scanThread));
$('download').addEventListener('click',()=>{const queue=selectedDownloads();return authorize(accessFor(queue),()=>batch(queue,save,'download'));});
$('retryDownloads').addEventListener('click',()=>{const queue=failedDownloads();return authorize(accessFor(queue),()=>batch(queue,save,'download'));});
$('dedup').addEventListener('click',()=>authorize(accessFor(items.filter(x=>x.original)),deduplicate));
$('stop').addEventListener('click',()=>{stop=true;status(m('stopping'));});
$('select').addEventListener('click',()=>{selectionAnchor=null;visibleItems().forEach(x=>{x.selected=eligible(x);});refreshSelection();});
$('clear').addEventListener('click',()=>{selectionAnchor=null;visibleItems().forEach(x=>{x.selected=false;});refreshSelection();});
for(const [id,event] of [['search','input'],['filter','change']])$(id).addEventListener(event,()=>{selectionAnchor=null;sync();});
$('resetFilters').addEventListener('click',()=>{resetFilters();sync();});
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
scan();
