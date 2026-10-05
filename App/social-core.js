(function(root){
 'use strict';
 const weights=Object.freeze({solo:10,duet:8,group:6,challenge:10,challenger:5,streak:3,recruit:5,receivedVote:2,popular:5,popularThreshold:5,audio:3});
 const clean=v=>String(v||'Participante').replace(/[<>]/g,'').trim().slice(0,80);
 function ranking(songs,activities={},challenges={}){
  const people=Object.create(null);
  function person(uid,name){if(!uid)return null;return people[uid] ||= {uid,name:clean(name),songs:0,groups:0,challenges:0,launched:0,receivedVotes:0,streak:0,recruits:0,audios:0,points:0};}
  let prior=new Map();
  for(const song of Object.values(songs||{}).sort((a,b)=>(a.startedAt||0)-(b.startedAt||0))){
   if(song.status!=='completed')continue;
   const singers=Object.entries(song.participants||{}),ids=new Set(singers.map(([id])=>id));
   const count=Math.max(ids.size,song.performerCount||0),next=new Map(),votes=Object.keys(song.voters||{}).filter(id=>!ids.has(id)).length;
   for(const [uid,name] of singers){const p=person(uid,name),sequence=(prior.get(uid)||0)+1;next.set(uid,sequence);p.songs++;p.points+=count===1?weights.solo:count===2?weights.duet:weights.group;
    if(count>1)p.groups++;if(song.challenge?.id){p.challenges++;p.points+=weights.challenge;}
    p.streak=Math.max(p.streak,sequence);if(sequence>1)p.points+=weights.streak;
    p.receivedVotes+=votes;p.points+=votes*weights.receivedVote;if(votes>=weights.popularThreshold)p.points+=weights.popular;
   }prior=next;
  }
  for(const c of Object.values(challenges||{})){if(c.status==='cancelled')continue;const p=person(c.authorUid,c.authorName);if(p){p.launched++;p.points+=weights.challenger;}}
  const recruited=new Set();
  for(const a of Object.values(activities||{})){const p=person(a.uid,a.name);if(!p)continue;
   if(a.type==='audio'){p.audios++;p.points+=weights.audio;}
   if(a.type==='recruit'&&!recruited.has(a.targetUid)){recruited.add(a.targetUid);p.recruits++;p.points+=weights.recruit;}
  }
  return Object.values(people).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name,'pt-BR'));
 }
 function validAudio(req){
  return typeof req.audio==='string'&&req.audio.length<=220000&&/^data:audio\/(webm|ogg|mp4)(;codecs=[a-zA-Z0-9.,_-]+)?;base64,[A-Za-z0-9+/]+={0,2}$/.test(req.audio)&&Number.isFinite(req.duration)&&req.duration>0&&req.duration<=15;
 }
 const api={weights,ranking,clean,validAudio};root.SocialCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
