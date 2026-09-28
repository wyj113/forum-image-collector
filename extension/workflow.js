import {scanPage} from './core.js';
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));

export async function resolveThreadPage(url, api = chrome) {
  if(!/^https:\/\/[^/?#]+\/threads\/[^/?#]+\/(?:page-[1-9]\d*\/?)?$/.test(url))throw Error('无效的帖子页地址');
  return inspectTemporary(url,scanPage,api);
}

// Reads one thread page in a temporary background tab, then always closes it.
async function inspectTemporary(url, reader, api) {
  let tab;
  try {
    tab = await api.tabs.create({url,active:false});
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const state = await api.tabs.get(tab.id);
      if (state.url && state.url !== 'about:blank') {
        const current = new URL(state.url);
        const expectedPath = new URL(url).pathname.replace(/\/$/,'');
        if (current.protocol !== 'https:' || current.origin !== new URL(url).origin || current.pathname.replace(/\/$/,'') !== expectedPath) throw Error('页面跳转到其他地址，已停止扫描，请打开待扫描页检查');
        try {
          const result = await api.scripting.executeScript({target:{tabId:tab.id},func:reader,args:[null,url],injectImmediately:true});
          const data = result[0]?.result;
          if (data?.ready) return data;
          if (state.status==='complete') throw Error('未能读取帖子正文，可能需要登录、验证或页面已删除；请打开待扫描页检查后继续');
        } catch(error) {
          if (state.status === 'complete') throw error;
          // A just-created or navigating document may not be injectable yet.
        }
      }
      await delay(700);
    }
    throw Error('读取帖子页超时：可能需要登录、验证，或页面已删除。请打开待扫描页检查后继续');
  } finally {
    if (tab?.id !== undefined) await api.tabs.remove(tab.id).catch(()=>{});
  }
}

export async function waitForDownload(id, api = chrome, timeout = 120000) {
  const deadline = Date.now()+timeout;
  while (Date.now()<deadline) {
    const [entry] = await api.downloads.search({id});
    if (!entry) throw Error('下载记录丢失');
    if (entry.state === 'complete') return true;
    if (entry.state === 'interrupted') throw Error(`下载中断：${entry.error || '未知原因'}`);
    await delay(500);
  }
  await api.downloads.cancel(id).catch(()=>{});
  throw Error('下载超时，已取消，可重试');
}
