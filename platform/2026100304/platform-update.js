/* Web/Windows updates: never reload an active operation. */
(function(){
 'use strict';
 window.LP_PLATFORM_BUILD='V46 / base Android V42';
 if(location.protocol==='https:'&&'serviceWorker' in navigator){
   navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(reg=>{
     function offer(){
       if(!reg.waiting||document.getElementById('lp-platform-update'))return;
       const b=document.createElement('button');b.id='lp-platform-update';
       b.textContent='Nouvelle version disponible';b.style.cssText='position:fixed;bottom:64px;right:16px;z-index:99999;padding:12px;background:#0b6b4f;color:white;border-radius:10px';
       b.onclick=()=>{if(confirm('Terminez et enregistrez vos opérations. Recharger maintenant ?')){
         let once=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!once){once=true;location.reload();}});
         reg.waiting.postMessage({type:'ACTIVATE'});
       }};document.body.append(b);
     }
     offer();reg.addEventListener('updatefound',()=>{const w=reg.installing;if(w)w.addEventListener('statechange',offer);});
     setInterval(()=>reg.update().catch(()=>{}),300000);
   }).catch(()=>{});
 }
 // Intercept platform updates before legacy Android download handlers.
 window.addEventListener('click',async e=>{
   const b=e.target.closest('button,a');if(!b)return;
   if(!/Vérifier maintenant|Vérifier les mises à jour|Mettre à jour maintenant/i.test(b.textContent))return;
   e.preventDefault();e.stopImmediatePropagation();
   if(location.protocol==='file:'){
     if(window.leaderPlatform)window.leaderPlatform.checkUpdates();
     else alert('Mise à jour du moteur Windows requise.');
   }else{
     const reg=await navigator.serviceWorker?.getRegistration();
     if(reg){await reg.update();if(reg.waiting)reg.waiting.postMessage({type:'SHOW'});}
     alert(reg?.waiting?'Une nouvelle version est disponible. Utilisez le bouton de mise à jour.':'Vérification terminée. Les mises à jour seront proposées ici.');
   }
 },true);
})();

/* V46 archive gate: preserve global script scope and execute in original order. */
(async function(){
 try{
  if(!localStorage.getItem('lp_data_generation_v39')){
   const raw=localStorage.getItem('lpmp_v13')||localStorage.getItem('lpmp_v12');
   if(raw){
    await new Promise((resolve,reject)=>{
     const open=indexedDB.open('lp_platform_archives',1);
     open.onupgradeneeded=()=>open.result.createObjectStore('backups');
     open.onerror=()=>reject(open.error);
     open.onblocked=()=>reject(new Error('Archive verrouillée. Fermez les autres onglets.'));
     open.onsuccess=()=>{
      const db=open.result,tx=db.transaction('backups','readwrite');
      tx.objectStore('backups').put({raw,date:new Date().toISOString()},'pre-generation-v46');
      tx.onerror=()=>{db.close();reject(tx.error)};
      tx.onabort=()=>{db.close();reject(tx.error)};
      tx.oncomplete=()=>{
       const read=db.transaction('backups','readonly'),get=read.objectStore('backups').get('pre-generation-v46');
       read.onerror=()=>{db.close();reject(read.error)};
       read.oncomplete=()=>{db.close();if(get.result?.raw===raw)resolve();else reject(new Error('Archive non confirmée.'))};
      };
     };
    });
   }
  }
  window.lpArchiveReadyV46=true;
  for(const old of document.querySelectorAll('script[type="application/lp-deferred"]')){
   const script=document.createElement('script');
   if(old.src){script.src=old.src;await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(new Error('Chargement application impossible.'));old.replaceWith(script)});}
   else{script.textContent=old.textContent;old.replaceWith(script);}
  }
 }catch(e){
  const box=document.createElement('p');box.style.cssText='padding:16px;background:#fff3cd;color:#662200';
  box.textContent='Démarrage interrompu : la sauvegarde locale reste à confirmer. Vos données sont conservées. '+(e.message||'');document.getElementById('loginView')?.prepend(box);
 }
})();
