// Locale-independent message descriptors keep in-flight progress re-renderable.
export const message=(key,values={})=>({key,values});
export const LANGUAGE_KEY='fic.language';
export function initialLanguage(browserWindow) {
  try {
    const saved=browserWindow.localStorage.getItem(LANGUAGE_KEY);
    if(['zh','en'].includes(saved))return saved;
  }catch{/* Storage may be unavailable; language selection still works. */}
  return /^zh(?:-|$)/i.test(browserWindow.navigator.language||'')?'zh':'en';
}
export function rememberLanguage(browserWindow,language) {
  try {browserWindow.localStorage.setItem(LANGUAGE_KEY,language);}catch{/* Best effort only. */}
}

// Each key has Chinese and English text; insert values with textContent, never HTML.
export const catalog={
  tagline:['论坛帖子正文图片','Images from forum posts'],
  source:['返回来源 ↗','Back to source ↗'],
  language:['界面语言','Language'],
  headline:['帖子里的图片，一次收好。','All the images. One place.'],
  intro:['默认读取当前页，也可收集整帖所有页再筛选。头像、签名、表情、引用和视频区域不进入列表。','Start with this page or collect an entire supported thread, then choose what to keep. Avatars, signatures, emoji, quotes and video areas are excluded.'],
  loadingTitle:['正在读取帖子…','Reading the page…'],
  waiting:['请稍候','Please wait'],
  rescan:['重新扫描当前页','Rescan this page'],
  scanThread:['扫描整帖全部页','Scan entire thread'],
  resumeThread:['继续扫描整帖（{done}/{total} 页）','Resume thread ({done}/{total} pages)'],
  concurrency:['并发任务数','Concurrent tasks'],
  sequential:['1 · 逐个处理','1 · One at a time'],
  defaultConcurrency:['2 · 默认','2 · Default'],
  concurrencyHint:['用于整帖扫描和下载；内容去重逐张检查。','Used for thread scanning and downloads; deduplication checks one file at a time.'],
  dedup:['筛除重复图片','Remove exact duplicates'],
  download:['下载已选图片{count}','Download selected{count}'],
  retryDownloads:['重试失败下载{count}','Retry failed downloads{count}'],
  count:['（{n}）',' ({n})'],
  stop:['停止排队','Stop queue'],
  select:['全选当前可下载','Select visible downloads'],
  clear:['取消当前选择','Clear visible selection'],
  dedupHint:['去重会读取图片文件，只排除文件内容完全相同的图片。同一面板内重复检查会使用缓存；之后下载仍需读取文件。','Deduplication reads the image files and removes only byte-identical ones. Results are cached in this panel; downloading reads the files again.'],
  folder:['保存子文件夹','Save subfolder'],
  folderHint:['位于 Chrome 默认下载目录内','Inside Chrome’s default download location'],
  initialStatus:['读取当前页后，可筛选、去重，再挑选下载。','After scanning, filter and check duplicates, then choose images to download.'],
  threadRetry:['打开待扫描页 ↗','Open the pending page ↗'],
  previews:['图片预览','Image previews'],
  previewsHint:['预览为帖子中的图片；下载前会验证文件','Previews come from the post; each file is validated before download.'],
  filterLabel:['筛选图片','Filter images'],
  search:['查找图片','Find images'],
  searchPlaceholder:['文件名、楼层、页码或来源地址','Filename, post, page or source URL'],
  filter:['图片状态','Image status'],
  all:['全部图片','All images'],
  ready:['可下载','Downloadable'],
  errorFilter:['处理失败','Failed'],
  done:['已完成','Completed'],
  duplicate:['重复图片','Duplicates'],
  unsupported:['暂不支持','Unsupported'],
  resetFilters:['清除筛选','Reset filters'],
  filterHint:['选择和下载只作用于当前显示的图片；隐藏图片保留勾选。去重处理整个列表。','Selection and downloads apply to visible images. Hidden selections are retained. Deduplication processes the whole list.'],
  selectionHint:['点击预览单选 · Ctrl＋点击增减选择 · Shift＋点击选择连续区间 · Ctrl＋Shift＋点击追加区间。复选框可单独勾选；Mac 可用 ⌘ 代替 Ctrl。','Click a preview to select one · Ctrl-click to toggle · Shift-click for a range · Ctrl+Shift-click to add a range. Checkboxes toggle individually. On Mac, use ⌘ instead of Ctrl.'],
  empty:['当前列表没有图片。请在兼容的论坛帖子页点击插件。','No images yet. Open the extension on a supported forum thread.'],
  noMatches:['没有匹配的图片。可清除筛选查看全部图片。','No matching images. Reset filters to see the full list.'],
  footer:['整帖扫描时会按并发设置打开后台标签，完成后自动关闭。处理期间请保持本面板打开。','Thread scanning opens temporary background tabs and closes them when finished. Keep this panel open while work is running.'],
  footerLimit:['只收集正文中直接链接的图片；指向其他页面或图床的图片会标为暂不支持，不会用缩略图代替。','Only images linked directly in posts are collected. Images that link to other pages or hosts are marked unsupported and never replaced with thumbnails.'],
  summary:['{posts} 个楼层 · {images} 张图片 · {ready} 张可下载 · {done} 张已完成 · {duplicates} 张重复','{posts} post{posts:s} · {images} image{images:s} · {ready} downloadable · {done} completed · {duplicates} duplicate{duplicates:s}'],
  filterSummary:['显示 {visible} / {total} 张 · 当前可下载已选 {chosen} 张 · 隐藏已选 {hidden} 张','Showing {visible} / {total} · Selected for download: {chosen} · Hidden selections: {hidden}'],
  noPermission:['未获得站点访问权限，操作未开始。','Site access was not granted. The operation did not start.'],
  cancelled:['已取消操作。','Operation cancelled.'],
  imageAlt:['第 {post} 楼，图片 {id}','Post {post}, image {id}'],
  selectImage:['选择第 {post} 楼图片 {id}','Select image {id} from post {post}'],
  page:['第 {page} 页 · ','Page {page} · '],
  directImage:['正文直链','Direct image'],
  otherHost:['其他链接','Other link'],
  viewSource:['查看来源 ↗','View source ↗'],
  viewOriginal:['查看原图 ↗','View original ↗'],
  pendingDirect:['正文直接图片 · 下载前验证文件','Direct image · File checked before download'],
  unsupportedNote:['链接指向其他页面或图床，暂不支持，已跳过','Links to another page or host · Unsupported · Skipped'],
  scanning:['正在读取当前页的帖子正文…','Reading post bodies on this page…'],
  found:['发现 {images} 张图片。可筛选、去重后勾选下载。','Found {images} image{images:s}. Filter and check duplicates, then select images to download.'],
  noneFound:['未找到图片；请确认页面已经加载、登录状态正常。','No images found. Check that the page has loaded and you are signed in.'],
  threadProgress:['正在扫描第 {pages} 页 / 共 {total} 页 · {concurrency} 路并发 · 已收集 {images} 张图片','Scanning page(s) {pages} / {total} · {concurrency} concurrent tasks · {images} image{images:s} collected'],
  threadComplete:['整帖扫描完成','Thread scan complete'],
  threadPaused:['整帖扫描暂停','Thread scan paused'],
  threadStopped:['已停止整帖扫描','Thread scan stopped'],
  threadResult:['{label}：已收集 {done}/{total} 页，{images} 张图片。{next}','{label}: {done}/{total} pages, {images} image{images:s}. {next}'],
  threadErrorNext:['{error}。可打开待扫描页检查后继续。','{error} Open the pending page to check it, then resume.'],
  threadReadyNext:['可筛除重复并选择下载。','Check duplicates and select downloads.'],
  threadResumeNext:['已保留结果，可继续扫描剩余页。','Results are retained. Resume to scan the remaining pages.'],
  opDownload:['下载','Download'],
  opDedup:['去重','Deduplication'],
  batchProgress:['{label} {finished}/{total}{errors}','{label} {finished}/{total}{errors}'],
  batchErrors:[' · {count} 张失败，可重试',' · {count} failed; retry available'],
  batchFinished:['{label}结束','{label} finished'],
  batchStopped:['已停止排队','Queue stopped'],
  batchResult:['{label}：处理 {finished}/{total} 张，{errors} 张失败。{next}','{label}: processed {finished}/{total}, {errors} failed. {next}'],
  downloadNext:['已完成的图片不会重复下载。','Completed images will not be downloaded again.'],
  batchNext:['可检查预览后下载已选图片。','Review the previews, then download selected images.'],
  checkingDuplicates:['正在读取图片并检查重复…','Reading image and checking for duplicates…'],
  duplicateNote:['重复图片 · 与第 {id} 张文件完全相同，已排除','Duplicate · Identical to image {id}; excluded'],
  uniqueNote:['已检查文件内容 · 未发现重复','File checked · No duplicate found'],
  waitingSave:['等待相同图片保存完成…','Waiting for the identical image to finish saving…'],
  alreadySaved:['相同图片已保存，跳过重复','Identical image already saved · Skipped'],
  validating:['获取并验证图片文件…','Fetching and validating image…'],
  saving:['正在保存 · {width} × {height}','Saving · {width} × {height}'],
  saved:['已保存 · {width} × {height}','Saved · {width} × {height}'],
  stopping:['停止安排新任务；当前正在处理的页面或图片结束后停止。','No new tasks will start. Active pages and images will finish first.'],
};

const errors={
  '只支持不含登录凭据和通配符的 HTTPS 地址':'Only HTTPS URLs without embedded credentials or wildcards are supported.',
  '页面跳转到其他地址，已停止扫描，请打开待扫描页检查':'The page redirected to another address. Scanning stopped; open the pending page to check.',
  '读取帖子页超时：可能需要登录、验证，或页面已删除。请打开待扫描页检查后继续':'Timed out reading the thread page. Sign-in or verification may be required, or the page may have been removed. Open the pending page before resuming.',
  '请先打开论坛帖子，再点击扩展图标':'Open a forum thread, then click the extension icon.',
  '请在 HTTPS 论坛帖子页面点击扩展图标':'Click the extension icon on an HTTPS forum thread.',
  '无效的帖子页地址':'Invalid thread page URL.',
  '未能读取帖子正文，可能需要登录、验证或页面已删除；请打开待扫描页检查后继续':'Could not read the post body. Sign-in or verification may be required, or the page may have been removed. Open the pending page before resuming.',
  '下载记录丢失':'The download record is missing.',
  '下载超时，已取消，可重试':'Download timed out and was cancelled. You can retry.',
  '无效的帖子地址':'Invalid thread URL.',
  '未能读取正文，请检查登录或验证页面':'Could not read the post body. Check for sign-in or verification.',
  '跳转到了其他页面，已停止':'Redirected to another page; stopped.',
  '页码异常':'Invalid page number.',
  '缺少正确的下一页链接':'The expected next-page link is missing.',
  '已有 4 个后台读取任务，请稍后重试':'Four background readers are already running. Try again shortly.',
  '下一页链接异常，已停止自动翻页':'The next-page link is invalid. Automatic pagination stopped.',
  '未找到下一页链接，无法确认分页完整':'No next-page link found; pagination completeness could not be confirmed.',
  '服务器返回的不是支持的图片（可能是登录或验证页面）':'The server did not return a supported image. It may be a sign-in or verification page.',
  '图片解码失败，已跳过':'Image decoding failed; skipped.',
  '图片尺寸过小，已跳过':'Image dimensions are too small; skipped.',
  '图片跳转到未支持的地址，已跳过':'The image redirected to an unsupported URL; skipped.',
};

export function translateError(raw,language) {
  const value=String(raw??'');
  if(language==='zh')return value;
  if(Object.hasOwn(errors,value))return errors[value];
  let match=value.match(/^第 (\d+) 页：([\s\S]*)$/);
  if(match)return `Page ${match[1]}: ${translateError(match[2],language)}`;
  match=value.match(/^需要站点权限：([\s\S]+)。请再次点击相应操作并允许访问$/);
  if(match)return `Site permission required: ${match[1]}. Click the action again and allow access.`;
  match=value.match(/^下载中断：([\s\S]*)$/);
  if(match)return `Download interrupted: ${match[1]==='未知原因'?'unknown reason':match[1]}`;
  match=value.match(/^图片请求失败（HTTP (\d+)），可打开来源检查后重试$/);
  if(match)return `Image request failed (HTTP ${match[1]}). Open the source to check, then retry.`;
  // Preserve unknown browser/server diagnostics rather than guessing their meaning.
  return value;
}

export function translate(descriptor,language) {
  if(typeof descriptor==='string')return translateError(descriptor,language);
  if(!descriptor)return '';
  if(descriptor.key==='error')return translateError(descriptor.values.detail,language);
  const template=catalog[descriptor.key]?.[language==='zh'?0:1];
  if(template===undefined)throw Error(`Unknown message key: ${descriptor.key}`);
  return template.replace(/\{(\w+)(:s)?\}/g,(_,name,plural)=>{
    const value=descriptor.values[name];
    if(plural)return Number(value)===1?'':'s';
    return value&&typeof value==='object'?translate(value,language):String(value??'');
  });
}
export function localizeDocument(document,language) {
  document.documentElement.lang=language==='zh'?'zh-CN':'en';
  for(const [attribute,target] of [['data-i18n',null],['data-i18n-placeholder','placeholder'],['data-i18n-label','aria-label']]){
    for(const element of document.querySelectorAll(`[${attribute}]`)){
      const text=translate(message(element.getAttribute(attribute)),language);
      if(target)element.setAttribute(target,text);else element.textContent=text;
    }
  }
}
