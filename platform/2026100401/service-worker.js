const CACHE_NAME='leader-pharma-web-v70';
const FILES=['./index.html','./app.js','./dg-security.js','./platform-update.js','./styles.css','./assets/leader-pharma-logo.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES))));
self.addEventListener('message',e=>{if(e.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('leader-pharma-web-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const url=new URL(e.request.url),base=new URL('./',self.location.href);
 const rel=url.pathname.slice(base.pathname.length);
 if(e.request.mode==='navigate'){e.respondWith(caches.open(CACHE_NAME).then(c=>c.match('./index.html')).then(r=>r||fetch(e.request)));return;}
 if(FILES.includes('./'+rel)){e.respondWith(caches.open(CACHE_NAME).then(c=>c.match('./'+rel)).then(r=>r||fetch(e.request)));}
});
