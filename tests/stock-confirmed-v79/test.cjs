const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/stock-confirmed.js','utf8');
function setup(){
 const nodes={},messages=[],calls=[],server=new Map();let failWrite=false,lostResponse=false;
 const make=(id,value='')=>nodes[id]={id,value,textContent:'Enregistrer',disabled:false,replaceChildren(){delete nodes.pname;},before(){}};
 ['pname','plot','pbarcode','pprice','pwholesale','pcost','pstock','pmin','pexp','saveProduct','stockForm','stockSearch'].forEach(id=>make(id));
 Object.assign(nodes.pname,{value:'Produit neuf'});for(const id of ['pprice','pwholesale','pcost','pstock','pmin'])nodes[id].value='10';nodes.plot.value='lot1';nodes.pexp.value='2028-01-01';
 const ctx={console,structuredClone,AbortController,setTimeout,clearTimeout,Date,Map,Set,Number,JSON,Error,navigator:{onLine:true},localStorage:{setItem(k,v){this[k]=v;}},document:{readyState:'loading',getElementById:id=>nodes[id]||null,addEventListener(){},createElement(){return {innerHTML:''};}},window:{addEventListener(){}},SUPABASE:{url:'https://example.invalid',key:'public'},currentUser:{id:'dg',role:'DG'},currentAgency:'kamina',page:'stock',db:{_lpDataGeneration:1,products:[{id:1,name:'Centre',agency:'centre',stock:7}],sales:[{id:'invoice',total:55000}]},uid:()=>12345,toast:x=>messages.push(x),drawStock(){},stock(){},productForm(){}};
 ctx.window.lpGetSessionTokenV16=async()=> 'test-token';
 ctx.window.fetch=async(url,init)=>{
  const name=url.split('/').pop(),body=JSON.parse(init.body);calls.push({name,body,headers:init.headers});
  let data;if(name==='lp_data_generation_v39')data=3;
  else if(name==='lp_read_state_v32')data=[{contenu:{products:[...server.values()]}}];
  else if(name==='lp_save_product_dg_v41'){
   if(failWrite)throw Error('Network failed');
   const p=body.p_product,old=server.get(String(p.id));
   if(old&&body.p_change_stock&&old.stock!==body.p_expected_stock)return {ok:false,json:async()=>({message:'STOCK_CHANGED_REFRESH'})};
   data={...p,stock:old&&!body.p_change_stock?old.stock:p.stock};server.set(String(p.id),data);
   if(lostResponse){lostResponse=false;throw Error('Response lost');}
  }else throw Error(name);
  return {ok:true,json:async()=>structuredClone(data)};
 };
 vm.createContext(ctx);vm.runInContext(source,ctx);const api=ctx.window.lpStockConfirmedV79;
 return {ctx,nodes,messages,calls,server,api,setFail:v=>failWrite=v,setLost:v=>lostResponse=v};
}
(async()=>{
 let x=setup();x.api.open();assert(await x.api.saveProduct(x.nodes.saveProduct));
 assert.equal(x.server.size,1);assert.equal(x.ctx.db._lpDataGeneration,1);assert.equal(x.ctx.db.sales[0].total,55000);assert.equal(x.ctx.db.products[0].stock,7);
 assert(x.calls.filter(c=>c.name==='lp_save_product_dg_v41').every(c=>c.headers['x-lp-data-generation']==='3'));
 x=setup();x.server.set('9',{id:9,agency:'kamina',name:'Produit neuf',lot:'lot1',expiry:'2028-01-01',stock:5});x.api.open();assert(!await x.api.saveProduct(x.nodes.saveProduct));assert.equal(x.calls.filter(c=>c.name==='lp_save_product_dg_v41').length,0);
 x=setup();x.api.open();x.setLost(true);assert(!await x.api.saveProduct(x.nodes.saveProduct));assert(x.nodes.pname);assert(await x.api.saveProduct(x.nodes.saveProduct));assert.equal(x.server.size,1);assert.equal(x.calls.filter(c=>c.name==='lp_save_product_dg_v41').length,1);
 x=setup();x.api.open();x.setFail(true);assert(!await x.api.saveProduct(x.nodes.saveProduct));assert(x.nodes.pname);x.setFail(false);assert(await x.api.saveProduct(x.nodes.saveProduct));assert.equal(x.server.size,1);
 x=setup();x.ctx.db.products.push({id:8,agency:'kamina',name:'Avant',stock:10});x.server.set('8',{id:8,agency:'kamina',name:'Avant',stock:9});x.api.open(8);x.nodes.pstock.value='11';assert(!await x.api.saveProduct(x.nodes.saveProduct));assert.equal(x.server.get('8').stock,9);assert(x.nodes.pname);
 x=setup();x.ctx.navigator.onLine=false;x.api.open();assert(!await x.api.saveProduct(x.nodes.saveProduct));assert.equal(x.calls.length,0);assert(x.nodes.pname);
 x=setup();x.ctx.currentUser.role='Vendeur';x.api.open();assert(!await x.api.saveProduct(x.nodes.saveProduct));assert.equal(x.calls.length,0);
 x=setup();x.server.set('8',{id:8,agency:'kamina',name:'Serveur',stock:3});assert(await x.api.read(true));assert(x.ctx.db.products.some(p=>p.name==='Centre'));assert.equal(x.ctx.db.products.find(p=>p.id===8).stock,3);assert.equal(x.ctx.db._lpDataGeneration,1);
 x=setup();x.api.boot();x.ctx.productForm();x.setLost(true);await x.nodes.saveProduct.onclick();await x.nodes.saveProduct.onclick();assert.equal(x.server.size,1);
 console.log('PASS: confirmation, offline, retries with stable ID, duplicate prevention, concurrent sales, agency/account isolation, no generation restamp, no financial changes, legacy onclick.');
})().catch(e=>{console.error(e);process.exitCode=1;});

