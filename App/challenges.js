(function(root){
 'use strict';
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const btn=(text,action)=>{const b=el('button',text,'challenge-btn');b.type='button';b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){alert(e.message||'Não foi possível concluir.');}finally{b.disabled=false;}};return b;};
 const name=u=>u?.customName||u?.name||u?.displayName||'Participante';
 function ui(api){
  let room=null,uid=null,ref=null,state={},info=null,seen=new Map(),dialog=null,listBody=null,mode=null;
  const dock=el('div',undefined,api.host?'challenge-host-dock':'challenge-mobile-dock');
  const launch=btn('Desafios da festa',showList);launch.className='challenge-launch';
  const caption=el('small','Lance uma música ou aceite um desafio.');launch.append(caption);dock.append(launch);
  const announcement=el('div','','challenge-announcement');announcement.hidden=true;announcement.setAttribute('role','status');announcement.setAttribute('aria-live','polite');
  if(api.host){
   launch.classList.add('interaction-chip','host-action-card');
   const icon=el('span',undefined,'interaction-chip-icon');icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2c1 4-2 5-2 8 0 1.5 1 2.5 2.5 2.5 2 0 3.5-1.7 3.5-4.5 3 2.5 4 5.2 3 8a8 8 0 1 1-14-7c0 3 1.5 4.5 3 4.5C7 8 10 6 13 2Z"/></svg>';
   const copy=el('span',undefined,'host-action-copy');copy.append(el('span','Desafios da festa','interaction-chip-label'),caption);launch.replaceChildren(icon,copy);
   let panel=api.mount().querySelector('.host-interaction-panel');
   if(!panel){panel=el('section',undefined,'host-interaction-panel');panel.append(el('h4','INTERAÇÃO DA FESTA'),el('div',undefined,'host-interaction-actions'));api.mount().prepend(panel);}
   dock.append(announcement);panel.querySelector('.host-interaction-actions').prepend(dock);
  }else{
   let shell=api.mount().querySelector('.interaction-section');if(!shell){shell=el('section',undefined,'interaction-section');shell.setAttribute('aria-label','Interação');shell.append(el('h2','INTERAÇÃO'),el('div',undefined,'interaction-track'));api.mount().prepend(shell);}
   launch.classList.add('interaction-chip');launch.innerHTML='<span class="interaction-chip-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2c1 4-2 5-2 8 0 1.5 1 2.5 2.5 2.5 2 0 3.5-1.7 3.5-4.5 3 2.5 4 5.2 3 8a8 8 0 1 1-14-7c0 3 1.5 4.5 3 4.5C7 8 10 6 13 2Z"/></svg></span><span class="interaction-chip-label">Desafios</span>';
   shell.querySelector('.interaction-track').prepend(dock);shell.append(announcement);
  }
  let screenBar=null;
  // O acesso aos desafios permanece no painel lateral. A faixa inferior fica
  // reservada às informações públicas da festa.
  function dialogBox(title){
   if(dialog){dialog.close();dialog.remove();}listBody=null;mode=null;
   dialog=el('dialog',undefined,'challenge-dialog');
   const close=btn('Fechar',()=>dialog.close());close.classList.add('challenge-close');dialog.append(close,el('h2',title));
   const opened=dialog;
   dialog.addEventListener('close',()=>{if(dialog===opened){mode=null;listBody=null;dialog=null;}opened.remove();});
   document.body.append(dialog);dialog.showModal();const body=el('div');dialog.append(body);return body;
  }
  function sync(){
   const u=api.user(),r=api.room();if(r===room&&u?.uid===uid)return;
   ref?.off();room=r;uid=u?.uid||null;state={};seen.clear();announcement.hidden=true;
   if(dialog)dialog.close();dock.hidden=!uid||!room;
   if(!uid||!room)return;
   const capturedRoom=room,capturedUid=uid;ref=api.db.ref(`salas/${room}/challengeState`);
   let initial=true;
   ref.on('value',snap=>{
    if(room!==capturedRoom||uid!==capturedUid)return;
    state=snap.val()||{};
    const items=Object.values(state.items||{}),open=items.filter(ChallengeCore.open);
    caption.textContent=state.available===false?'Cabine desconectada. Aguarde o DJ.':`${open.length} desafio(s) aberto(s) · toque para participar`;
    if(screenBar)screenBar.textContent='🔥 Desafios da festa · '+open.length+' aberto(s)';
    const changes=items.filter(c=>seen.get(c.id)!==c.status && (c.status==='open'||c.status==='forming'||c.status==='queued'));
    if(!initial&&changes.length){
     const c=changes.sort((a,b)=>(b.updatedAt||b.createdAt)-(a.updatedAt||a.createdAt))[0];
     const who=Object.values(c.members||{}).map(m=>m.name).join(' e ');
     const text=c.status==='queued'?`🔥 ${who} aceitou: ${c.title} — ${c.artist}`:c.status==='forming'?`🔥 ${c.authorName}: desafio aguardando confirmação do grupo`:`🔥 ${c.authorName} desafiou a galera: ${c.suspense?'música surpresa de '+c.artist:c.title+' — '+c.artist}`;
     announcement.textContent=text;announcement.hidden=false;
     if(screenBar)screenBar.textContent=text;
     if(!api.host&&document.hidden&&'Notification' in root&&Notification.permission==='granted'){
      if(navigator.serviceWorker)navigator.serviceWorker.getRegistration().then(reg=>reg?.showNotification('Desafios da festa',{body:text,tag:'challenge-'+room,silent:true})).catch(()=>{});
     }
     clearTimeout(info);info=setTimeout(()=>{announcement.hidden=true;},12000);
    }
    initial=false;seen=new Map(items.map(c=>[c.id,c.status]));
    if(mode==='list')renderList();
   },()=>{caption.textContent='Não foi possível carregar os desafios. Confira a conexão.';});
  }
  sync();const timer=setInterval(sync,1000);root.addEventListener('pagehide',()=>{clearInterval(timer);ref?.off();});
  async function send(action,extra={}){
   sync();if(!uid||!room)throw Error('Faça login e entre na sala para participar.');
   if(state.available!==true)throw Error('Aguarde a cabine do DJ se conectar aos desafios.');
   const r=room,u=uid;
   const pending=api.db.ref(`salas/${r}/pedidos`).push();
   const ack=api.db.ref(`salas/${r}/challengeState/receipts/${pending.key}`);
   let callback,timeout;
   const result=new Promise((resolve,reject)=>{
    callback=s=>{const v=s.val();if(v?.uid===u){v.ok?resolve(v):reject(Error(v.message));}};
    ack.on('value',callback,error=>reject(error));
    timeout=setTimeout(()=>reject(Error('A cabine ainda não confirmou. Confira a lista antes de tentar novamente.')),20000);
   });
   // Attach a rejection handler immediately while the inbox write is pending.
   result.catch(()=>{});
   try{
    await pending.set({kind:'challenge',id:'challenge',singer:name(api.user()),singerUid:u,processed:false,timestamp:firebase.database.ServerValue.TIMESTAMP,action,...extra});
    return await result;
   }finally{clearTimeout(timeout);ack.off('value',callback);}
  }
  function renderList(){
   if(!listBody)return;listBody.replaceChildren();
   listBody.append(btn('＋ Lançar um desafio',()=>compose()));
   if(state.available!==true)listBody.append(el('p','A cabine está desconectada. Os desafios ficam disponíveis quando o DJ retornar.','challenge-feedback'));
   const items=Object.values(state.items||{}).filter(c=>!['cancelled','expired'].includes(c.status)).sort((a,b)=>b.createdAt-a.createdAt);
   if(!items.length)listBody.append(el('p','Ainda não há desafios. Escolha uma música e convide a galera!','challenge-muted'));
   for(const c of items){
    const card=el('article',undefined,'challenge-card');
    if(c.status==='forming'&&c.members?.[uid]&&!c.members[uid].confirmed)card.classList.add('challenge-invite');
    card.append(el('h3',`${c.authorName} lançou um desafio`),el('p',c.suspense&&c.status==='open'?'🎁 Música surpresa':c.title,'challenge-hero'),el('p',c.artist));
    if(c.note&&!c.noteHidden)card.append(el('p',c.note,'challenge-note'));
    const actions=el('div',undefined,'challenge-actions');
    if(c.status==='open')actions.append(btn(c.suspense?'Revelar e decidir':'Eu aceito!',()=>accept(c,false)),btn('Aceito, mas quero companhia!',()=>accept(c,true)));
    if(c.status==='forming'){
     card.append(el('p','Grupo: '+Object.values(c.members||{}).map(m=>m.name+(m.confirmed?' ✓':' · aguardando')).join(' / '),'challenge-muted'));
     if(c.members?.[uid]&&!c.members[uid].confirmed)actions.append(btn('Ver música e confirmar convite',()=>confirmInvite(c)));
     if(c.members?.[uid])actions.append(btn(c.leaderUid===uid?'Liberar desafio':'Não vou participar',()=>send('release',{challengeId:c.id})));
    }
    if(['ready','queued','completed'].includes(c.status))card.append(el('p',(c.status==='completed'?'🏅 Desafio concluído por ':c.status==='ready'?'Preparando entrada na fila: ':'🎤 Na fila: ')+Object.values(c.members||{}).map(m=>m.name).join(' e '),'challenge-counter'));
    if(c.status==='skipped')card.append(el('p','Apresentação encerrada.','challenge-muted'));
    if(ChallengeCore.open(c)&&(c.authorUid===uid||api.host))actions.append(btn(api.host?'Remover desafio':'Cancelar desafio',()=>send('cancel',{challengeId:c.id})));
    if(api.host&&c.note&&!c.noteHidden)actions.append(btn('Ocultar recado',()=>send('hideNote',{challengeId:c.id})));
    for(const emoji of ['🔥','👏','😂']){const count=Object.values(c.reactions||{}).filter(v=>v===emoji).length;actions.append(btn(`${emoji} ${count}`,()=>send('react',{challengeId:c.id,emoji})));}
    card.append(actions);listBody.append(card);
   }
  }
  function showList(){sync();if(!uid)return alert('Faça login para participar.');listBody=dialogBox('🔥 Desafios da festa');mode='list';renderList();}
  function songInfo(body,c){body.append(el('p',c.title,'challenge-hero'),el('p',c.artist),el('p','A música só entra na fila depois da confirmação de todos. A ordem normal será respeitada.','challenge-muted'));}
  function confirmInvite(c){const body=dialogBox('Seu convite para cantar');songInfo(body,c);body.append(btn('Confirmar minha participação',async()=>{await send('confirm',{challengeId:c.id,revealed:true});showList();}),btn('Voltar',showList));}
  function accept(c,group){
   const body=dialogBox(group?'Quem vai cantar com você?':'Aceitar desafio');songInfo(body,c);
   const choices=[];
   if(group){body.append(el('p','Você + até duas pessoas. Cada convidado confirma no próprio celular.','challenge-muted'));
    for(const [id,u] of Object.entries(api.users()||{})){if(id===uid||!u.uid)continue;const label=el('label');const box=el('input');box.type='checkbox';label.append(box,document.createTextNode(name(u)));body.append(label);choices.push({id,box});}
    if(!choices.length)body.append(el('p','Nenhum outro participante com login está disponível agora.','challenge-feedback'));
   }
   body.append(btn(group?'Enviar convites':'Confirmar: eu vou cantar',async()=>{
    const partners=choices.filter(c=>c.box.checked).map(c=>c.id);if(group&&(!partners.length||partners.length>2))throw Error('Selecione uma ou duas pessoas.');
    await send('accept',{challengeId:c.id,partners,revealed:true});showList();
   }),btn('Voltar',showList));
  }
  function compose(selected){
   sync();if(!uid||!room)return alert('Faça login e entre na sala para desafiar.');
   const body=dialogBox('Lançar desafio');let song=selected;
   const selectedLabel=el('p',song?`${song.title} — ${song.artist}`:'Selecione uma música do catálogo.','challenge-hero');body.append(selectedLabel);
   const search=el('input');search.placeholder='Buscar música, artista ou código';search.setAttribute('aria-label','Buscar música para desafiar');body.append(search);
   const results=el('div',undefined,'challenge-results');body.append(results);
   search.oninput=()=>{results.replaceChildren();const q=search.value.trim().toLocaleLowerCase();if(q.length<2)return;(api.catalog()||[]).filter(s=>`${s.id} ${s.title} ${s.artist}`.toLocaleLowerCase().includes(q)).slice(0,20).forEach(s=>results.append(btn(`${s.title} — ${s.artist}`,()=>{song=s;selectedLabel.textContent=`${s.title} — ${s.artist}`;results.replaceChildren();search.value='';})));};
   const label=el('label','Recado ou pista (até 140 caracteres)');const note=el('textarea');note.maxLength=140;note.rows=2;label.append(note);body.append(label);
   const surprise=el('input');surprise.type='checkbox';const l=el('label');l.append(surprise,document.createTextNode('Suspense: mostrar artista e pista; revelar a música antes do aceite.'));body.append(l);
   body.append(el('p','Um desafio aberto por pessoa. Ninguém entra na fila sem aceitar.','challenge-muted'),btn('🔥 Desafiar a galera',async()=>{if(!song)throw Error('Selecione uma música.');await send('create',{songId:String(song.id),note:note.value,suspense:surprise.checked});showList();}));
  }
  return {compose,showList,sync};
 }
 let hostApi,hostRoom=null,chain=Promise.resolve(),connectionRef=null,closed=false;
 const host={
  init(api){hostApi=api;this.view=ui({...api,host:true});},
  async begin(){
   const room=hostApi.room();if(!room||room===hostRoom)return;hostRoom=room;closed=false;
   connectionRef?.off();connectionRef=hostApi.db.ref('.info/connected');
   connectionRef.on('value',async s=>{if(!s.val()||closed||hostRoom!==room)return;const ref=hostApi.db.ref(`salas/${room}/challengeState/available`);try{await ref.onDisconnect().set(false);await ref.set(true);await host.flush(room);}catch(e){console.warn('Desafios:',e.message);}});
   this.view.sync();
  },
  handle(req,key){
   const room=hostRoom;if(!room)return;
   chain=chain.catch(()=>{}).then(async()=>{
    const rootRef=hostApi.db.ref(`salas/${room}`);
    const snap=await rootRef.child('active_users').once('value');
    const members=snap.val()||{};const user=hostApi.user();if(!user)return;
    members[user.uid]={uid:user.uid,name:name(user)};
    const songs=Object.fromEntries(hostApi.catalog().map(s=>[String(s.id),s]));
    const now=Date.now();
    await rootRef.child('challengeState').transaction(current=>ChallengeCore.reduce(current,{...req,key,uid:req.singerUid},{members,songs,hostUid:user.uid,now,active:!closed&&hostRoom===room&&current?.available===true}));
    await host.flush(room);
    await rootRef.child('pedidos/'+key).remove();
   }).catch(e=>console.warn('Desafio ainda não confirmado:',e.message));
  },
  async flush(room){
   if(closed||hostRoom!==room)return;
   const base=hostApi.db.ref(`salas/${room}`),snap=await base.child('challengeState/items').once('value');
   for(const c of Object.values(snap.val()||{})){
    const req=ChallengeCore.request(c);
    if(req)await base.child('pedidos/challenge_'+c.id).transaction(current=>
     current && !current.kind && current.challengeId===c.id && current.singerUid===req.singerUid && current.id===req.id ? current : req);
   }
  },
  async validatedRequest(req,key){
   if(!req.challengeId||key!=='challenge_'+req.challengeId)return null;
   const snap=await hostApi.db.ref(`salas/${hostRoom}/challengeState/items/${req.challengeId}`).once('value');const c=snap.val();
   if(!c||!['ready','queued'].includes(c.status))return null;
   return {...ChallengeCore.request({...c,status:'ready'}),processed:req.processed};
  },
  queued(id){if(id&&hostRoom)hostApi.db.ref(`salas/${hostRoom}/challengeState/items/${id}`).transaction(c=>{if(c?.status==='ready'){c.status='queued';c.updatedAt=Date.now();}return c;}).catch(console.warn);},
  complete(id,status='completed'){if(id&&hostRoom)hostApi.db.ref(`salas/${hostRoom}/challengeState/items/${id}`).transaction(c=>{if(c&&['ready','queued'].includes(c.status)){c.status=status;c.updatedAt=Date.now();}return c;}).catch(console.warn);},
  async end(){closed=true;connectionRef?.off();if(!hostRoom)return;await hostApi.db.ref(`salas/${hostRoom}/challengeState`).transaction(s=>{if(!s)return s;s.available=false;Object.values(s.items||{}).forEach(c=>{if(ChallengeCore.open(c))c.status='expired';});return s;});hostRoom=null;}
 };
 root.ChallengeHost=host;root.ChallengeMobile={init(api){this.view=ui(api);},compose(song){this.view?.compose(song);}};
})(window);
