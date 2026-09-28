export function originPattern(value) {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.hostname.includes('*'))throw Error('只支持不含登录凭据和通配符的 HTTPS 地址');
  return `${url.origin}/*`;
}

// Call directly from a click handler: Chrome requires a user gesture.
export function requestAccess(urls,api=chrome) {
  const origins=[...new Set(urls.filter(Boolean).map(originPattern))];
  return origins.length ? api.permissions.request({origins}) : Promise.resolve(true);
}

export async function requireAccess(url,api=chrome) {
  const origin=originPattern(url);
  if(!await api.permissions.contains({origins:[origin]}))throw Error(`需要站点权限：${new URL(url).origin}。请再次点击相应操作并允许访问`);
}
