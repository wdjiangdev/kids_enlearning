const V='kids-v15';
const SHELL=['./','index.html','assets/app.css','assets/app.js','data/index.json','data/grammar.json','manifest.webmanifest','assets/icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!=='kids-media').map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/api/'))return;
  if(u.pathname.includes('/media/')){ if(e.request.headers.get('range'))return; // 课文音频按段播放，交给浏览器
    e.respondWith(caches.open('kids-media').then(async c=>{const hit=await c.match(e.request);if(hit)return hit;const r=await fetch(e.request);if(r.ok&&!u.pathname.includes('/lesson/'))c.put(e.request,r.clone());return r;}));return;}
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp));}return r;}).catch(()=>caches.match(e.request)));
});
