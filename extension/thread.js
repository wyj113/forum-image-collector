const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// State belongs to the panel so completed pages survive stop/retry within it.
export async function collectThread(state,{readPage,onPage,concurrency=1,shouldStop=()=>false,onProgress=()=>{},pause=()=>delay(1200)}) {
  if(!/^https:\/\/[^/?#]+\/threads\/[^/?#]+\/$/.test(state.baseUrl))throw Error('无效的帖子地址');
  const limit=Math.min(4,Math.max(1,Math.floor(Number(concurrency))||1));
  const pending=state.pendingPages ||= new Map();
  function validate(data,page,total){
    const thread=data?.thread;
    if(!data?.ready||!data.posts||!thread)throw Error('未能读取正文，请检查登录或验证页面');
    if(thread.baseUrl!==state.baseUrl||thread.page!==page)throw Error('跳转到了其他页面，已停止');
    if(thread.error)throw Error(thread.error);
    if(!Number.isSafeInteger(thread.total)||thread.total<page)throw Error('页码异常');
    if(page<Math.max(total,thread.total)&&thread.nextUrl!==state.baseUrl+`page-${page+1}`)throw Error('缺少正确的下一页链接');
  }
  while(!state.complete && !shouldStop()){
    const pages=[];
    for(let page=state.nextPage;page<=Math.min(state.total,state.nextPage+limit-1);page++)if(!pending.has(page))pages.push(page);
    onProgress(state.nextPage,state.total,pages);
    // A bounded window keeps out-of-order results small and waits for every
    // active tab to finish/close before exposing stop or failure to the panel.
    const results=await Promise.all(pages.map(async page=>{
      try{
        const data=await readPage(state.baseUrl+(page===1?'':`page-${page}`));
        validate(data,page,state.total);pending.set(page,data);return null;
      }catch(error){return Error(`第 ${page} 页：${error.message}`);}
    }));
    for(const data of pending.values())state.total=Math.max(state.total,data.thread.total);
    while(pending.has(state.nextPage)){
      const page=state.nextPage,data=pending.get(page);
      try{validate(data,page,state.total);}catch(error){pending.delete(page);throw Error(`第 ${page} 页：${error.message}`);}
      await onPage(data);
      pending.delete(page);state.nextPage=page+1;
    }
    state.complete=state.nextPage>state.total;
    const error=results.find(Boolean);if(error)throw error;
    if(!state.complete&&!shouldStop())await pause();
  }
  return state;
}
