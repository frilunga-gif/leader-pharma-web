/* Web/Windows updates: never reload an active operation. */
(function(){
 'use strict';
 const backupKey='lp_upgrade_backup_config_v43';
 if(!localStorage.getItem('lp_data_generation_v39')&&!localStorage.getItem(backupKey)){
   const raw=localStorage.getItem('lpmp_v13')||localStorage.getItem('lpmp_v12');
   if(raw){
     // Fail closed if an archive cannot fit: do not run the generation reset.
     localStorage.setItem(backupKey,JSON.stringify({date:new Date().toISOString(),raw}));
   }
 }
 window.LP_PLATFORM_BUILD='V43 / base Android V42';
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
