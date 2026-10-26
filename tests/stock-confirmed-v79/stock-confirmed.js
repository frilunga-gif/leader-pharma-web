/* LP_WEB_WINDOWS_STOCK_CONFIRMED_V79_1
 * Platform adapter: isolated product RPCs; never restamp or send old business snapshots.
 */
(function(){
 'use strict';
 const rawFetch=window.fetch.bind(window),s=v=>String(v??'').trim(),n=v=>s(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
 const fields=['name','barcode','ean','lot','price','retailPrice','wholesalePrice','cost','min','expiry'];
 let draft=null,busy=false,reading=null,lastRead=0,lastAgency='',lastActor='';
 const actor=()=>typeof currentUser!=='undefined'?currentUser:null;
 const agency=()=>typeof currentAgency!=='undefined'?s(currentAgency):'';
 const dg=()=>n(actor()?.role)==='dg';
 const key=r=>n(r.agency)+'|'+s(r.id);
 const get=id=>document.getElementById(id);
 const tell=t=>{if(typeof toast==='function')toast(t);};
 function status(t){const el=get('lpStockConfirmedStatus');if(el)el.textContent=t;}
 function persist(){localStorage.setItem('lpmp_v13',JSON.stringify(db));}
 async function rpc(name,body,who){
  if(navigator.onLine===false)throw Error('Hors ligne. Saisie conservée.');
  const token=await window.lpGetSessionTokenV16();
  if(actor()!==who)throw Error('Le compte a changé. Rouvrez la fiche.');
  const base=SUPABASE.url.replace(/\/$/,'');
  async function call(path,payload,epoch){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
   try{
    const headers={apikey:SUPABASE.key,Authorization:'Bearer '+token,'Content-Type':'application/json'};
    if(epoch!=null)headers['x-lp-data-generation']=String(epoch);
    const r=await rawFetch(base+'/rest/v1/rpc/'+path,{method:'POST',headers,body:JSON.stringify(payload),signal:controller.signal});
    const data=await r.json();if(!r.ok)throw Error(data.message||'Réception serveur non confirmée.');return data;
   }finally{clearTimeout(timer);}
  }
  // Read the generation for this isolated operation, not for a bulk snapshot.
  const epoch=await call('lp_data_generation_v39',{});
  if(!Number.isSafeInteger(Number(epoch))||Number(epoch)<1)throw Error('Vérification serveur impossible.');
  if(actor()!==who)throw Error('Le compte a changé.');
  return call(name,body,epoch);
 }
 function installRows(rows,a){
  const incoming=new Map(rows.filter(r=>n(r.agency)===n(a)).map(r=>[key(r),r]));
  // Keep local-only records intact. No automatic deletion or stock addition.
  db.products=(db.products||[]).map(r=>incoming.get(key(r))||r);
  const existing=new Set(db.products.map(key));
  for(const r of incoming.values())if(!existing.has(key(r))){db.products.push(r);existing.add(key(r));}
  persist();
 }
 async function read(force=false){
  if(reading)return reading;
  const who=actor(),a=agency();if(!who||!a)return false;
  if(!force&&lastActor===s(who.id||who.username)&&lastAgency===a&&Date.now()-lastRead<60000)return true;
  reading=(async()=>{
   status('Réception du stock…');
   try{
    const data=await rpc('lp_read_state_v32',{},who);
    if(actor()!==who||agency()!==a)return false;
    const state=Array.isArray(data)?data[0]?.contenu:null;
    if(!state||!Array.isArray(state.products))throw Error('Catalogue non confirmé.');
    installRows(state.products,a);lastRead=Date.now();lastAgency=a;lastActor=s(who.id||who.username);
    if(typeof page!=='undefined'&&page==='stock'&&!get('pname')&&typeof drawStock==='function')drawStock(get('stockSearch')?.value||'');
    status('Stock reçu du serveur.');return true;
   }catch(e){status('Stock local conservé. Réception non confirmée.');return false;}
  })();try{return await reading;}finally{reading=null;}
 }
 function open(id){
  if(!dg()){tell('Modification réservée au DG.');return;}
  const p=(db.products||[]).find(r=>s(r.id)===s(id)&&n(r.agency)===n(agency()));
  draft={id:p?.id??uid(),agency:agency(),prior:p?structuredClone(p):null,attempted:false};
 }
 function product(){
  const value=id=>s(get(id)?.value),num=id=>Number(value(id));
  if(!draft||draft.agency!==agency())throw Error('Rouvrez la fiche du produit.');
  const r={id:draft.id,agency:draft.agency,name:value('pname'),lot:value('plot'),barcode:value('pbarcode'),ean:value('pbarcode'),price:num('pprice'),retailPrice:num('pprice'),wholesalePrice:num('pwholesale'),cost:num('pcost'),stock:num('pstock'),min:num('pmin'),expiry:value('pexp')||draft.prior?.expiry||''};
  if(!r.name||!Number.isSafeInteger(r.stock)||r.stock<0||['price','wholesalePrice','cost','min'].some(k=>!Number.isFinite(r[k])||r[k]<0))throw Error('Vérifiez le nom, les quantités et les prix.');
  return r;
 }
 function duplicate(r,rows){return rows.find(x=>n(x.agency)===n(r.agency)&&s(x.id)!==s(r.id)&&((r.barcode&&s(x.barcode||x.ean)===r.barcode)||(n(x.name)===n(r.name)&&n(x.lot)===n(r.lot)&&s(x.expiry)===s(r.expiry))));}
 async function saveProduct(button){
  if(busy)return false;if(!dg()){tell('Modification réservée au DG.');return false;}
  let p;try{p=product();}catch(e){tell(e.message);return false;}
  const formDraft=draft,who=actor();busy=true;button.disabled=true;const label=button.textContent;button.textContent='Confirmation serveur…';
  try{
   // Preflight uses the server catalogue, not a potentially stale local list.
   const data=await rpc('lp_read_state_v32',{},who),rows=data?.[0]?.contenu?.products;
   if(!Array.isArray(rows))throw Error('Catalogue non confirmé. Saisie conservée.');
   if(actor()!==who||draft!==formDraft||agency()!==p.agency)throw Error('La fiche ou le compte a changé.');
   const previous=rows.find(x=>key(x)===key(p));
   if(!formDraft.prior&&duplicate(p,rows))throw Error('Ce produit et ce lot existent déjà. Utilisez Modifier ou Réception de stock.');
   let result;
   // A new-product retry keeps its original ID after a lost HTTP response.
   if(!formDraft.prior&&previous){
    if(!formDraft.attempted||fields.some(k=>s(previous[k])!==s(p[k])))throw Error('Produit déjà présent. Actualisez avant de modifier.');
    result=previous;
   }else{
    const expected=formDraft.prior?.stock??null;
    formDraft.attempted=true;
    result=await rpc('lp_save_product_dg_v41',{p_product:p,p_expected_stock:expected,p_change_stock:!formDraft.prior||p.stock!==Number(expected)},who);
   }
   if(key(result)!==key(p)||!Number.isSafeInteger(Number(result.stock)))throw Error('Produit non confirmé. Saisie conservée.');
   if(actor()!==who||draft!==formDraft||agency()!==p.agency)throw Error('Produit reçu au serveur. Rouvrez le stock du compte concerné.');
   installRows([result],p.agency);draft=null;lastRead=0;
   const form=get('stockForm');if(form)form.replaceChildren();
   if(typeof drawStock==='function')drawStock(get('stockSearch')?.value||'');
   status('Produit confirmé au serveur.');tell('Produit confirmé au serveur.');return true;
  }catch(e){
   const message=s(e.message).includes('STOCK_CHANGED_REFRESH')?'Une vente a modifié ce stock. Saisie conservée : actualisez et rouvrez la fiche.':'Enregistrement non confirmé. '+(e.name==='AbortError'?'Délai dépassé. Réessayez : le même identifiant sera conservé.':e.message);
   status(message);tell(message);return false;
  }finally{busy=false;button.disabled=false;button.textContent=label;}
 }
 function click(e){
  if(typeof page==='undefined'||page!=='stock')return false;
  const b=e.target?.closest?.('#saveProduct,[data-edit],#newProduct,#lpStockConfirmedRefresh');if(!b)return false;
  if(b.id==='lpStockConfirmedRefresh'){e.preventDefault();e.stopImmediatePropagation();if(!get('pname'))read(true);else tell('Terminez la fiche avant d’actualiser.');return true;}
  if(b.id==='saveProduct'){
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();saveProduct(b);return true;
  }
  return false;
 }
 // Registered before app.js and all legacy click observers.
 window.addEventListener('click',click,true);
 function mount(){
  if(typeof page==='undefined'||page!=='stock'||!actor())return;
  const table=get('stockTable');if(!table||get('lpStockConfirmedRefresh'))return;
  const box=document.createElement('div');box.innerHTML='<button type="button" class="secondary" id="lpStockConfirmedRefresh">↻ Actualiser le stock</button><p class="muted" id="lpStockConfirmedStatus" role="status">Stock local disponible.</p>';table.before(box);
 }
 function boot(){
  if(typeof productForm!=='function'||typeof stock!=='function')return;
  const baseForm=productForm;productForm=function(id){open(id);const result=baseForm.apply(this,arguments);const button=get('saveProduct');if(button)button.onclick=()=>saveProduct(button);return result;};window.productForm=productForm;
  const baseStock=stock;stock=function(){const r=baseStock.apply(this,arguments);mount();if(!get('pname'))read(false);return r;};window.stock=stock;
  window.lpV41StockClick=click;window.lpV41SaveProduct=saveProduct;
  mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 window.lpStockConfirmedV79={read,saveProduct,duplicate,installRows,boot,open};
})();

