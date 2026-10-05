(() => {
 'use strict';
 const stage=document.getElementById('audienceStage'),status=document.getElementById('audienceStatus');
 let hideTimer,observer,observedDocument,scheduled=false,vibeSignature='',vibeUntil=0;
 const mirrors=new WeakMap(),videoSources=new WeakMap();
 let ambientMirror={iframe:null,state:null,time:0,stamp:0,rate:1,retryUntil:0,lastCommand:0,video:''};
 const allowed=['#player','#fsQueueOverlay','#rankingTicker','.qr-fullscreen-box','#topInfoBox','#djFooter','#screensaver','#publicScoreDisplay','#reactionContainer','.applause-overlay','.voice-playback-overlay'];
 const frame=document.createElement('main');frame.id='playerContainer';frame.className='is-native-fullscreen';stage.append(frame);
 function showToolbar(){document.body.classList.remove('toolbar-hidden');clearTimeout(hideTimer);hideTimer=setTimeout(()=>document.body.classList.add('toolbar-hidden'),2200);}
 document.addEventListener('pointermove',e=>{if(e.clientY<64)showToolbar();});document.addEventListener('keydown',e=>{if(e.key==='Tab')showToolbar();});showToolbar();
 document.getElementById('audienceFullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{alert('Use a opção de tela cheia do navegador nesta janela.');}};
 function disconnected(message){stage.querySelectorAll('video').forEach(v=>v.pause());status.textContent=message;status.hidden=false;}

 function reconcile(parent,nodes){
  let cursor=parent.firstChild;
  for(const node of nodes){
   if(node!==cursor)parent.insertBefore(node,cursor);
   cursor=node.nextSibling;
  }
  while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next;}
 }
 function mirror(original,root=false){
  if(original.nodeType===3){
   let copy=mirrors.get(original);
   if(!copy){copy=document.createTextNode(original.data);mirrors.set(original,copy);}
   if(copy.data!==original.data)copy.data=original.data;
   return copy;
  }
  if(original.nodeType!==1)return null;
  const tag=original.tagName;
  if(['SCRIPT','STYLE','LINK','META','OBJECT','EMBED','AUDIO','INPUT','SELECT','TEXTAREA'].includes(tag)||(!root&&tag==='BUTTON'))return null;
  let copy=mirrors.get(original);
  if(!copy){
   copy=document.importNode(original,false);
   mirrors.set(original,copy);
  }
  const attrs=new Map([...original.attributes].filter(a=>!/^on/i.test(a.name)&&!['srcdoc','autofocus','autoplay'].includes(a.name)&&!(tag==='VIDEO'&&a.name==='src')).map(a=>{
   if(tag==='IFRAME'&&a.name==='src'){
    try{const u=new URL(a.value,location.href);u.searchParams.set('autoplay','1');u.searchParams.set('mute','1');u.searchParams.set('controls','0');return[a.name,u.href];}catch{}
   }
   return[a.name,a.value];
  }));
  for(const a of [...copy.attributes])if(!attrs.has(a.name)&&a.name!=='data-display-video'&&!(tag==='VIDEO'&&a.name==='src'))copy.removeAttribute(a.name);
  for(const [name,value] of attrs)if(copy.getAttribute(name)!==value)copy.setAttribute(name,value);
  if(tag==='VIDEO'){copy.dataset.displayVideo='true';videoSources.set(copy,original);copy.muted=true;copy.defaultMuted=true;copy.volume=0;copy.playsInline=true;copy.controls=false;return copy;}
  if(tag==='IFRAME'){copy.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');copy.setAttribute('tabindex','-1');return copy;}
  if(tag==='CANVAS'){try{copy.getContext('2d').drawImage(original,0,0);}catch{}return copy;}
  reconcile(copy,[...original.childNodes].map(n=>mirror(n)).filter(Boolean));
  return copy;
 }
 function youtubeCommand(iframe,func,args=[]){
  try{iframe.contentWindow?.postMessage(JSON.stringify({event:'command',func,args}),'*');}catch{}
 }
 function syncAmbientPlayback(sourceContainer){
  const source=sourceContainer.querySelector('#ambientContainer');
  const target=frame.querySelector('#ambientContainer');
  const iframe=target?.querySelector('iframe');
  if(!source||!iframe){ambientMirror={iframe:null,state:null,time:0,stamp:0,rate:1,retryUntil:0,lastCommand:0,video:''};return;}
  const state=Number(source.dataset.ambientState);
  const time=Number(source.dataset.ambientTime);
  const rate=Number(source.dataset.ambientRate)||1;
  const video=source.dataset.ambientVideo||'';
  if(!Number.isFinite(state)||!Number.isFinite(time))return;
  const now=performance.now();
  const fresh=ambientMirror.iframe!==iframe||ambientMirror.video!==video;
  if(fresh)ambientMirror={iframe,state:null,time,stamp:now,rate,retryUntil:now+5000,lastCommand:0,video};
  const estimated=ambientMirror.time+(ambientMirror.state===1?(now-ambientMirror.stamp)/1000*ambientMirror.rate:0);
  const drift=Math.abs(time-estimated);
  const stateChanged=ambientMirror.state!==state;
  const retry=now<ambientMirror.retryUntil&&now-ambientMirror.lastCommand>500;
  if(fresh||retry||stateChanged||drift>.65){
   youtubeCommand(iframe,'mute');youtubeCommand(iframe,'setVolume',[0]);youtubeCommand(iframe,'setPlaybackRate',[rate]);youtubeCommand(iframe,'seekTo',[time,true]);
   if(state===1)youtubeCommand(iframe,'playVideo');
   else if([0,2,5].includes(state))youtubeCommand(iframe,'pauseVideo');
   ambientMirror.time=time;ambientMirror.stamp=now;ambientMirror.rate=rate;ambientMirror.state=state;ambientMirror.lastCommand=now;ambientMirror.video=video;
  }
 }
 function tick(){
  try{
   if(!window.opener||window.opener.closed){disconnected('A cabine foi fechada. Abra a Segunda tela novamente pela cabine do DJ.');return;}
   if(window.opener.location.origin!==location.origin)return;
   const source=window.opener.document,container=source.getElementById('playerContainer'),dashboard=source.getElementById('main_wrapper');
   if(!container||!dashboard||window.opener.getComputedStyle(dashboard).display==='none'){disconnected('Aguardando o DJ iniciar a cabine…');return;}
   if(observedDocument!==source){
    if(observer)observer.disconnect();
    observedDocument=source;
    observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;tick();});}});
    observer.observe(source.body,{subtree:true,childList:true,characterData:true,attributes:true});
   }
   const roots=allowed.flatMap(selector=>[...(selector==='#reactionContainer'?source:container).querySelectorAll(selector)]);
   // A root can already belong to another public root; never move it twice.
   const queue=container.querySelector('#fsQueueOverlay');
   const queueVisible=queue&&window.opener.getComputedStyle(queue).display!=='none';
   const topRoots=roots.filter(n=>!(queueVisible&&n.id==='topInfoBox')&&!roots.some(other=>other!==n&&other.contains(n)));
   reconcile(frame,topRoots.map(n=>mirror(n,true)).filter(Boolean));
   syncAmbientPlayback(container);
   const vibe=source.getElementById('publicScoreDisplay');
   const signature=vibe&&vibe.style.display!=='none'?[vibe.querySelector('#publicScoreVal')?.textContent,vibe.querySelector('#likeCount')?.textContent,vibe.querySelector('#dislikeCount')?.textContent].join('|'):'';
   if(signature!==vibeSignature){vibeSignature=signature;vibeUntil=signature?Date.now()+1500:0;}
   stage.classList.toggle('vibe-active',Boolean(signature)&&Date.now()<vibeUntil);
   stage.querySelectorAll('video[data-display-video]').forEach(v=>{
    const original=videoSources.get(v);if(!original)return;
    const url=original.currentSrc||original.src;
    if(original.srcObject){if(v.srcObject!==original.srcObject)v.srcObject=original.srcObject;}
    else if(url&&v.getAttribute('src')!==url){v.srcObject=null;v.src=url;}
    v.muted=true;v.volume=0;v.playbackRate=original.playbackRate;
    if(v.readyState>=1&&Number.isFinite(original.currentTime)&&Math.abs(v.currentTime-original.currentTime)>.35){try{v.currentTime=original.currentTime;}catch{}}
    if(original.paused||original.ended){if(!v.paused)v.pause();}else if(v.paused)v.play().catch(()=>{});
   });

   status.hidden=true;
  }catch{disconnected('Aguardando conexão com a cabine…');}
 }
 const timer=setInterval(tick,100);tick();
 window.addEventListener('pagehide',()=>{clearInterval(timer);clearTimeout(hideTimer);if(observer)observer.disconnect();stage.querySelectorAll('video').forEach(v=>v.pause());});
})();

