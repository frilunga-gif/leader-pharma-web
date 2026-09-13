(function(){
  'use strict';

  const STORE='lpmp_dg_security_v14';
  const SESSION='lpmp_dg_session_v14';

  function now(){
    return new Date().toISOString();
  }

  function load(){
    try{
      const x=
        JSON.parse(
          localStorage.getItem(STORE)||'null'
        );

      if(x&&typeof x==='object'){
        if(!Array.isArray(x.accounts)){
          x.accounts=[];
        }

        if(!Array.isArray(x.audit)){
          x.audit=[];
        }

        return x;
      }
    }catch(e){}

    return {
      dgPassword:'1234',
      locked:false,
      accounts:[],
      audit:[{
        at:now(),
        action:
          'Initialisation sécurité DG V1.4'
      }]
    };
  }

  function save(x){
    localStorage.setItem(
      STORE,
      JSON.stringify(x)
    );
  }

  function audit(action,user){
    const x=load();

    x.audit.unshift({
      at:now(),
      action,
      user:user||'DG'
    });

    x.audit=
      x.audit.slice(0,200);

    save(x);
  }

  function esc(v){
    return String(v??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;');
  }

  function askDG(){
    const x=load();

    const p=
      prompt(
        'SECURITE DG\n\nEntrez le mot de passe DG :'
      );

    if(p===null){
      return false;
    }

    if(p!==x.dgPassword){
      alert(
        'Mot de passe DG incorrect.'
      );

      audit(
        'Tentative accès DG refusée',
        'inconnu'
      );

      return false;
    }

    return true;
  }

  function accountLogin(){
  /* Leader Pharma 17.9.9 : bypass DG uniquement */
  try{
    var lp1799Role = '';
    var lp1799User = '';

    if(typeof currentUser !== 'undefined' && currentUser){
      lp1799Role = String(currentUser.role || '').trim().toLowerCase();
      lp1799User = String(currentUser.username || currentUser.user || '').trim().toLowerCase();
    }

    if(lp1799Role === 'dg' || lp1799User === 'leader.fr'){
      return true;
    }
  }catch(e){}

  /* Leader Pharma 17.9.9 correction Stock DG active */

    const x=load();

    if(!x.accounts.length){
      alert(
        'Aucun compte agent enregistré.\n\nLe DG doit d’abord créer les comptes dans Paramètres.'
      );

      return false;
    }

    const username=
      prompt(
        'AUTORISATION STOCK\n\nIdentifiant agent :'
      );

    if(!username){
      return false;
    }

    const password=
      prompt(
        'Mot de passe de '+username+' :'
      );

    if(password===null){
      return false;
    }

    const acc=
      x.accounts.find(
        a=>
          a.enabled!==false &&
          a.username===username &&
          a.password===password
      );

    if(!acc){
      alert(
        'Identifiants incorrects ou compte désactivé.'
      );

      audit(
        'Accès Stock refusé',
        username
      );

      return false;
    }

    sessionStorage.setItem(
      SESSION,
      JSON.stringify({
        username:acc.username,
        role:acc.role,
        agency:acc.agency,
        at:Date.now()
      })
    );

    audit(
      'Accès Stock autorisé',
      acc.username
    );

    return true;
  }

  function currentSession(){
    try{
      const s=
        JSON.parse(
          sessionStorage.getItem(SESSION)||'null'
        );

      if(
        s &&
        Date.now()-s.at < 10*60*1000
      ){
        return s;
      }
    }catch(e){}

    return null;
  }

  function style(){
    if(
      document.getElementById(
        'lp-dg-style'
      )
    ){
      return;
    }

    const s=
      document.createElement('style');

    s.id='lp-dg-style';

    s.textContent=`
    .lpdg-mask{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.72);
      z-index:999999;
      overflow:auto;
      padding:18px;
      box-sizing:border-box
    }
    .lpdg-box{
      max-width:760px;
      margin:20px auto;
      background:white;
      border-radius:18px;
      padding:20px;
      color:#17212b;
      font-family:Arial,sans-serif
    }
    .lpdg-title{
      font-size:26px;
      font-weight:800;
      margin-bottom:8px
    }
    .lpdg-sub{
      color:#667085;
      margin-bottom:18px
    }
    .lpdg-grid{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px
    }
    .lpdg-box input,
    .lpdg-box select{
      width:100%;
      box-sizing:border-box;
      padding:12px;
      border:1px solid #cfd6dd;
      border-radius:10px;
      margin:5px 0 10px
    }
    .lpdg-box button{
      padding:12px 15px;
      border:0;
      border-radius:10px;
      font-weight:700;
      cursor:pointer
    }
    .lpdg-primary{
      background:#08785e;
      color:#fff
    }
    .lpdg-danger{
      background:#b42318;
      color:#fff
    }
    .lpdg-muted{
      background:#e9eef2;
      color:#17212b
    }
    .lpdg-card{
      border:1px solid #e4e7ec;
      border-radius:12px;
      padding:12px;
      margin:10px 0
    }
    .lpdg-row{
      display:flex;
      justify-content:space-between;
      gap:10px;
      align-items:center
    }
    .lpdg-audit{
      font-size:12px;
      max-height:180px;
      overflow:auto;
      background:#f8fafc;
      padding:10px;
      border-radius:10px
    }
    @media(max-width:600px){
      .lpdg-grid{
        grid-template-columns:1fr
      }
    }`;

    document.head.appendChild(s);
  }

  function openPanel(){
    if(!askDG()){
      return;
    }

    style();

    const old=
      document.getElementById(
        'lpdg-mask'
      );

    if(old){
      old.remove();
    }

    const x=load();

    const mask=
      document.createElement('div');

    mask.id='lpdg-mask';
    mask.className='lpdg-mask';

    mask.innerHTML=`
      <div class="lpdg-box">
        <div class="lpdg-title">
          🔐 Sécurité & Autorisations DG
        </div>

        <div class="lpdg-sub">
          Comptes agents, agences, rôles et verrouillage des paramètres.
        </div>

        <div class="lpdg-card">
          <b>Mot de passe DG</b>

          <div class="lpdg-grid">
            <input
              id="lpdg-newdg"
              type="password"
              placeholder="Nouveau mot de passe DG"
            >

            <button
              id="lpdg-changedg"
              class="lpdg-primary"
            >
              Modifier
            </button>
          </div>

          <label>
            <input
              id="lpdg-lock"
              type="checkbox"
              ${x.locked?'checked':''}
              style="width:auto"
            >
            Verrouiller les paramètres agents
          </label>
        </div>

        <div class="lpdg-card">
          <b>Créer un compte agent</b>

          <div class="lpdg-grid">
            <input
              id="lpdg-user"
              placeholder="Identifiant"
            >

            <input
              id="lpdg-pass"
              type="password"
              placeholder="Mot de passe"
            >

            <input
              id="lpdg-agency"
              placeholder="Agence"
            >

            <select id="lpdg-role">
              <option value="vendeur">
                Vendeur
              </option>
              <option value="stock">
                Gestionnaire Stock
              </option>
              <option value="gerant">
                Gérant
              </option>
              <option value="dg">
                DG
              </option>
            </select>
          </div>

          <button
            id="lpdg-add"
            class="lpdg-primary"
          >
            Enregistrer le compte
          </button>
        </div>

        <div class="lpdg-card">
          <b>Comptes enregistrés</b>
          <div id="lpdg-accounts"></div>
        </div>

        <div class="lpdg-card">
          <b>Journal de sécurité</b>
          <div
            id="lpdg-audit"
            class="lpdg-audit"
          ></div>
        </div>

        <div class="lpdg-row">
          <button
            id="lpdg-close"
            class="lpdg-muted"
          >
            Fermer
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(mask);

    function refresh(){
      const state=load();

      const list=
        mask.querySelector(
          '#lpdg-accounts'
        );

      list.innerHTML=
        state.accounts.length
        ?state.accounts.map(
          (a,i)=>`
          <div class="lpdg-card">
            <div class="lpdg-row">
              <div>
                <b>${esc(a.username)}</b><br>
                ${esc(a.role)} • ${esc(a.agency)}
                ${a.enabled===false?' • DÉSACTIVÉ':''}
              </div>

              <div>
                <button
                  data-toggle="${i}"
                  class="lpdg-muted"
                >
                  ${a.enabled===false?'Activer':'Désactiver'}
                </button>

                <button
                  data-delete="${i}"
                  class="lpdg-danger"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
          `
        ).join('')
        :'<p>Aucun compte agent.</p>';

      const log=
        mask.querySelector(
          '#lpdg-audit'
        );

      log.innerHTML=
        state.audit
          .slice(0,50)
          .map(
            e=>
              `<div>${esc(e.at)} — ${esc(e.user)} — ${esc(e.action)}</div>`
          )
          .join('');

      list.querySelectorAll(
        '[data-toggle]'
      ).forEach(btn=>{
        btn.onclick=()=>{
          const z=load();
          const i=
            Number(
              btn.dataset.toggle
            );

          z.accounts[i].enabled=
            z.accounts[i].enabled===false
            ?true
            :false;

          save(z);

          audit(
            'Statut compte modifié',
            z.accounts[i].username
          );

          refresh();
        };
      });

      list.querySelectorAll(
        '[data-delete]'
      ).forEach(btn=>{
        btn.onclick=()=>{
          if(
            !confirm(
              'Supprimer ce compte ?'
            )
          ){
            return;
          }

          const z=load();

          const i=
            Number(
              btn.dataset.delete
            );

          const name=
            z.accounts[i]?.username||
            '';

          z.accounts.splice(i,1);

          save(z);

          audit(
            'Compte supprimé',
            name
          );

          refresh();
        };
      });
    }

    mask.querySelector(
      '#lpdg-close'
    ).onclick=()=>{
      mask.remove();
    };

    mask.querySelector(
      '#lpdg-lock'
    ).onchange=e=>{
      const z=load();

      z.locked=
        !!e.target.checked;

      save(z);

      audit(
        z.locked
        ?'Paramètres agents verrouillés'
        :'Paramètres agents déverrouillés'
      );
    };

    mask.querySelector(
      '#lpdg-changedg'
    ).onclick=()=>{
      const p=
        mask.querySelector(
          '#lpdg-newdg'
        ).value.trim();

      if(p.length<6){
        alert(
          'Minimum 6 caractères.'
        );
        return;
      }

      const z=load();

      z.dgPassword=p;

    /* LEADER PHARMA SECURITE 15 - PASSWORD DG UNIQUE */
    try{
      const mainRaw =
        localStorage.getItem('lpmp_v13');

      if(mainRaw){
        const main =
          JSON.parse(mainRaw);

        if(
          main &&
          Array.isArray(main.users)
        ){
          let dgUser =
            main.users.find(
              u =>
                String(
                  u.username||''
                )
                .trim()
                .toLowerCase() ===
                'leader.fr'
            );

          if(!dgUser){
            dgUser =
              main.users.find(
                u =>
                  String(
                    u.role||''
                  )
                  .trim()
                  .toLowerCase() ===
                  'dg'
              );
          }

          if(dgUser){
            dgUser.username =
              'leader.fr';

            dgUser.password =
              String(p);

            dgUser.role =
              'DG';

            dgUser.active =
              true;

            localStorage.setItem(
              'lpmp_v13',
              JSON.stringify(main)
            );
          }
        }
      }

      if(
        typeof db !==
        'undefined' &&
        db &&
        Array.isArray(db.users)
      ){
        let liveDG =
          db.users.find(
            u =>
              String(
                u.username||''
              )
              .trim()
              .toLowerCase() ===
              'leader.fr'
          );

        if(!liveDG){
          liveDG =
            db.users.find(
              u =>
                String(
                  u.role||''
                )
                .trim()
                .toLowerCase() ===
                'dg'
            );
        }

        if(liveDG){
          liveDG.username =
            'leader.fr';

          liveDG.password =
            String(p);

          liveDG.role =
            'DG';

          liveDG.active =
            true;
        }
      }

    }catch(lpDGSyncError){
      console.error(
        'SECURITE 15 DG sync',
        lpDGSyncError
      );
    }

      save(z);

      mask.querySelector(
        '#lpdg-newdg'
      ).value='';

      audit(
        'Mot de passe DG modifié'
      );

      alert(
        'Mot de passe DG enregistré.'
      );
    };

    mask.querySelector(
      '#lpdg-add'
    ).onclick=()=>{
      const user=
        mask.querySelector(
          '#lpdg-user'
        ).value.trim();

      const pass=
        mask.querySelector(
          '#lpdg-pass'
        ).value;

      const agency=
        mask.querySelector(
          '#lpdg-agency'
        ).value.trim();

      const role=
        mask.querySelector(
          '#lpdg-role'
        ).value;

      if(
        !user ||
        pass.length<4 ||
        !agency
      ){
        alert(
          'Identifiant, agence et mot de passe sont obligatoires.'
        );
        return;
      }

      const z=load();

      const old=
        z.accounts.find(
          a=>a.username===user
        );

      if(old){
        old.password=pass;
        old.agency=agency;
        old.role=role;
        old.enabled=true;
      }else{
        z.accounts.push({
          username:user,
          password:pass,
          agency,
          role,
          enabled:true,
          createdAt:now()
        });
      }

      save(z);

      audit(
        old
        ?'Compte agent modifié'
        :'Compte agent créé',
        user
      );

      mask.querySelector(
        '#lpdg-user'
      ).value='';

      mask.querySelector(
        '#lpdg-pass'
      ).value='';

      refresh();

      alert(
        'Compte enregistré.'
      );
    };

    refresh();
  }

  function clickable(el){
    return el.closest(
      'button,a,[role="button"],.menu-item,.nav-item'
    )||el;
  }

  let bypass=false;

  document.addEventListener(
    'click',
    function(e){
      if(bypass){
        return;
      }

      const target=
        clickable(e.target);

      const text=
        (target.innerText||
         target.textContent||
         '')
          .trim()
          .toLowerCase();

      if(!text){
        return;
      }

      if(
        text.includes('paramètres') ||
        text.includes('parametres')
      ){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        openPanel();

        return;
      }

      if(
        text.includes('stock') &&
        text.includes('lots')
      ){
        const session=
          currentSession();

        if(session){
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if(accountLogin()){
          bypass=true;
          target.click();

          setTimeout(
            ()=>bypass=false,
            100
          );
        }
      }
    },
    true
  );

  window.LP_DG_SECURITY={
    open:openPanel,
    logout:function(){
      sessionStorage.removeItem(
        SESSION
      );

      audit(
        'Session Stock fermée'
      );
    }
  };

  console.log(
    'Leader Pharma V1.4 Sécurité DG active'
  );
})();
