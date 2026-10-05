(function(root){
 'use strict';
 const open=c=>c && ['open','forming'].includes(c.status);
 const clean=(v,n=80)=>String(v||'').replace(/[<>]/g,'').trim().slice(0,n);
 function reduce(input,command,env){
  const state=JSON.parse(JSON.stringify(input||{items:{},receipts:{}}));state.items ||= {};state.receipts ||= {};
  const {key,uid,action}=command;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(key) || ['__proto__','constructor','prototype'].includes(key)) throw Error('Identificador inválido');
  if(state.receipts[key])return state;
  const receipt={uid,at:env.now,ok:false,message:''};
  const deny=message=>{receipt.message=message;state.receipts[key]=receipt;return state;};
  if(!env.active)return deny('A festa está encerrada ou a cabine está desconectada.');
  if(!Object.hasOwn(env.members,uid))return deny('Entre nesta sala antes de participar.');
  if(!Number.isFinite(command.timestamp)||env.now-command.timestamp>180000||command.timestamp>env.now+30000)return deny('Pedido expirado. Tente novamente.');
  let c=Object.hasOwn(state.items,command.challengeId)?state.items[command.challengeId]:null;
  if(action==='create'){
   if(Object.values(state.items).some(v=>v.authorUid===uid&&open(v)))return deny('Você já tem um desafio aberto.');
   const song=Object.hasOwn(env.songs,String(command.songId))?env.songs[String(command.songId)]:null;if(!song)return deny('Música não encontrada no catálogo.');
   if(command.suspense&&!clean(command.note,140))return deny('Escreva uma pista para o desafio surpresa.');
   c={id:key,songId:String(song.id),title:clean(song.title,180),artist:clean(song.artist,120),authorUid:uid,authorName:clean(env.members[uid].name),note:clean(command.note,140),suspense:command.suspense===true,status:'open',createdAt:env.now,reactions:{}};
   state.items[key]=c;receipt.challengeId=key;receipt.message='Desafio lançado!';
  }else{
   if(!c)return deny('Esse desafio não está mais disponível.');
   if(action==='accept'){
    if(c.status!=='open')return deny('Outra pessoa já aceitou este desafio.');
    if(command.revealed!==true)return deny('Veja a música antes de confirmar.');
    const partners=Array.isArray(command.partners)?[...new Set(command.partners)]:[];
    if(partners.length>2||partners.includes(uid)||partners.some(id=>typeof id!=='string'||!Object.hasOwn(env.members,id)))return deny('Escolha até duas pessoas conectadas, além de você.');
    c.leaderUid=uid;c.members={[uid]:{name:clean(env.members[uid].name),confirmed:true}};
    partners.forEach(id=>{c.members[id]={name:clean(env.members[id].name),confirmed:false};});
    c.status=partners.length?'forming':'ready';c.claimedAt=env.now;
    if(!partners.length)c.acceptedAt=env.now;
    receipt.message=partners.length?'Convites enviados. Aguardando confirmação.':'Desafio aceito! Enviando para a fila.';
   }else if(action==='confirm'){
    if(c.status!=='forming'||!c.members?.[uid]||c.members[uid].confirmed)return deny('Este convite não está mais disponível.');
    if(command.revealed!==true)return deny('Veja a música antes de confirmar.');
    c.members[uid].confirmed=true;
    if(Object.values(c.members).every(m=>m.confirmed)){c.status='ready';c.acceptedAt=env.now;}
    receipt.message=c.status==='ready'?'Grupo confirmado! Enviando para a fila.':'Participação confirmada.';
   }else if(action==='release'){
    if(c.status!=='forming'||!c.members?.[uid])return deny('Você não participa deste convite.');
    c.status='open';delete c.members;delete c.leaderUid;delete c.claimedAt;receipt.message='Desafio disponível novamente.';
   }else if(action==='cancel'){
    if(!open(c)||(uid!==c.authorUid&&uid!==env.hostUid))return deny('Não é possível cancelar este desafio.');
    c.status='cancelled';delete c.members;receipt.message='Desafio cancelado.';
   }else if(action==='hideNote'){
    if(uid!==env.hostUid)return deny('Somente o DJ pode ocultar recados.');
    c.noteHidden=true;receipt.message='Recado ocultado.';
   }else if(action==='react'){
    if(!['🔥','👏','😂'].includes(command.emoji)||['expired','cancelled'].includes(c.status))return deny('Reação indisponível.');
    c.reactions ||= {};c.reactions[uid]=command.emoji;receipt.message='Reação enviada!';
   }else return deny('Ação desconhecida.');
   c.updatedAt=env.now;
  }
  receipt.ok=true;state.receipts[key]=receipt;
  // Receipts make retried commands idempotent. Old inbox commands expire first.
  Object.entries(state.receipts).forEach(([id,r])=>{if(env.now-r.at>600000)delete state.receipts[id];});
  return state;
 }
 function request(c){
  const ids=Object.keys(c.members||{});if(c.status!=='ready'||!ids.length||!Object.values(c.members).every(m=>m.confirmed))return null;
  return {id:c.songId,singer:ids.map(id=>c.members[id].name).join(' E '),singerUid:c.leaderUid,requesterUid:c.leaderUid,recipientVersion:1,recipientUids:ids,processed:false,timestamp:c.acceptedAt,challengeId:c.id,challenge:{id:c.id,authorName:c.authorName,authorUid:c.authorUid,singers:ids.map(uid=>({uid,name:c.members[uid].name}))}};
 }
 const api={reduce,request,open};root.ChallengeCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
