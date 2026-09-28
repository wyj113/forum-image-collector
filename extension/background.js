import {resolveThreadPage} from './workflow.js';
import {requireAccess} from './permissions.js';

chrome.action.onClicked.addListener(tab=>{
  chrome.tabs.create({url:chrome.runtime.getURL(`panel.html?tab=${tab.id}`)});
});

// Read thread pages in the worker so temporary tabs are cleaned up even if the panel closes.
let running = 0;
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('panel.html'))) return;
  if (message.type !== 'threadPage') return;
  if (running >= 4) { respond({error:'已有 4 个后台读取任务，请稍后重试'}); return; }
  running++;
  const task=requireAccess(message.url).then(()=>resolveThreadPage(message.url));
  task.then(value=>{running--;respond({page:value});},error=>{running--;respond({error:error.message});});
  return true;
});
