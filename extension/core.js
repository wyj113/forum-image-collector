// Self-contained functions: Chrome serializes these into the source tab.
export function scanPage(doc = document, expectedUrl = '') {
  doc ||= document;
  // Kept inside the reader because Chrome serializes this function into the tab.
  const pageInfo = raw => {
    try {
      const u=new URL(raw,doc.baseURI), match=u.pathname.match(/^\/threads\/([^/]+)\/(?:page-([1-9]\d*)\/?)?$/);
      if(u.protocol!=='https:'||u.username||u.password||!match)return null;
      return {baseUrl:`${u.origin}/threads/${match[1]}/`,page:Number(match[2]||1)};
    }catch{return null;}
  };
  const current=pageInfo(doc.location.href), expected=expectedUrl && pageInfo(expectedUrl);
  if(expectedUrl && (!current||!expected||current.baseUrl!==expected.baseUrl||current.page!==expected.page||doc.readyState==='loading'))return {ready:false,items:[]};
  let thread=null;
  if(current){
    thread={...current,total:current.page,nextUrl:'',error:''};
    for(const link of doc.querySelectorAll('.pageNav-main a[href]')){
      const page=pageInfo(link.href);
      if(page?.baseUrl===current.baseUrl && Number.isSafeInteger(page.page))thread.total=Math.max(thread.total,page.page);
    }
    const nextLinks=[...doc.querySelectorAll('a.pageNav-jump--next[href],a.pageNavSimple-el--next[href]')];
    for(const link of nextLinks){
      const next=pageInfo(link.href);
      if(next?.baseUrl!==current.baseUrl || next.page!==current.page+1){thread.error='下一页链接异常，已停止自动翻页';break;}
      thread.nextUrl=`${current.baseUrl}page-${next.page}`;
      thread.total=Math.max(thread.total,next.page);
    }
    if(current.page<thread.total&&!thread.nextUrl)thread.error='未找到下一页链接，无法确认分页完整';
  }
  const absolute = raw => {
    try { const u = new URL(raw, doc.baseURI); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
  };
  const posts = [...doc.querySelectorAll('article.message--post, .post[id], article[data-post-id]')];
  const excluded = 'blockquote,.bbCodeBlock--quote,.message-signature,.signature,.message-user,.avatar,.smilie,.emoji,.reactionsBar,.reaction,.bbMediaWrapper,.bbCodeBlock--video,video,iframe,.advertisement,.adsbygoogle,[data-ad]';
  const items = [], seen = new Set();
  let ignored = 0;
  for (const post of posts) {
    const postNumber = [...post.querySelectorAll('.message-attribution a')].map(a=>a.textContent.trim()).find(t=>/^#\d+$/.test(t))?.slice(1) || post.getAttribute('data-post-id') || post.id.replace('js-post-','');
    for (const img of post.querySelectorAll('.message-body .bbWrapper img, .postbody .content img, .cooked img')) {
      if (img.closest(excluded)) { ignored++; continue; }
      const preview = ['data-src','data-original','data-url','src'].map(a=>img.getAttribute(a)).filter(Boolean).map(absolute).find(Boolean);
      if (!preview || /\/(?:avatars|smilies|emoji|reactions|styles)\//i.test(preview)) { ignored++; continue; }
      const anchor = img.closest('a[href]');
      const href = anchor && absolute(anchor.getAttribute('href'));
      if (href && (/\/(?:v|video|videos|embed)\//i.test(href) || /\.(?:mp4|webm|mov)(?:[?#]|$)/i.test(href))) { ignored++; continue; }
      const source = href || preview;
      // Only images linked directly in the post are collected. Links to viewer
      // pages or other hosts are listed as unsupported, never guessed.
      let kind = 'direct';
      if (anchor && !href) kind = 'unsupported';
      if (href && !/\.(?:jpe?g|png|webp|gif|avif|bmp)(?:[?#]|$)/i.test(href) && !/\/attachments\//i.test(href)) kind = 'unsupported';
      const key = source.split('#')[0];
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({id:items.length + 1, post:postNumber, preview, source:key, kind, original:kind === 'direct' ? key : '',page:current?.page,pageUrl:doc.location.href});
    }
  }
  return {title:doc.title, url:doc.location.href, posts:posts.length, ignored, items, thread, ready:Boolean(posts.length)};
}

// URL shape validation only; runtime access is separately checked per origin.
export function allowedImage(value) {
  try {
    const u=new URL(value);
    return u.protocol==='https:' && !u.username && !u.password &&
      !/\/(?:avatars|smilies|emoji|reactions|styles|thumbs|thumbnails)\//i.test(u.pathname) &&
      (/\.(?:jpe?g|png|webp|gif|avif|bmp)(?:$)/i.test(u.pathname) || /^\/attachments\//.test(u.pathname));
  }catch{return false;}
}

export function safeFolder(value) {
  return String(value).replace(/[\x00-\x1f<>:"/\\|?*]/g,'_').replace(/\.{2,}/g,'_').replace(/^[. ]+|[. ]+$/g,'').slice(0,90) || '帖子图片';
}

export async function validateBlob(blob, decoder = createImageBitmap) {
  const ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','image/bmp':'bmp'}[blob.type.split(';')[0].toLowerCase()];
  if (!ext || !blob.size) throw Error('服务器返回的不是支持的图片（可能是登录或验证页面）');
  let bitmap;
  try { bitmap = await decoder(blob); } catch { throw Error('图片解码失败，已跳过'); }
  const {width,height} = bitmap;
  bitmap.close?.();
  if (width < 80 || height < 80) throw Error('图片尺寸过小，已跳过');
  return {width,height,ext};
}
