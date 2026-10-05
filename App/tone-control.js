(function(root){
    'use strict';
    const valid = pitch => typeof pitch === 'number' && Number.isFinite(pitch) && pitch >= .7 && pitch <= 1.3;
    function canControl(song,uid){return !!(uid && song?.playing && song.remoteToneEnabled && (song.requesterUid===uid || SingerSelection.recipients(song).includes(uid)));}
    const preferenceKey=id=>Array.from(new TextEncoder().encode(String(id))).map(v=>v.toString(16).padStart(2,'0')).join('');
    root.ToneControl={valid,canControl,preferenceKey};
    if(typeof module!=='undefined'&&module.exports)module.exports=root.ToneControl;
    if(typeof document==='undefined')return;
    root.MobileTone={init({db,auth,getRoom}){
        const panel=document.createElement('details');panel.className='mobile-tone-panel';panel.hidden=true;
        const heading=document.createElement('summary');heading.textContent='Meu tom nesta música';panel.append(heading);
        const songLabel=document.createElement('p');songLabel.className='tone-song-label';panel.append(songLabel);
        const controls=document.createElement('div');controls.className='tone-mobile-controls';
        const value=document.createElement('output');value.setAttribute('aria-live','polite');
        const message=document.createElement('p');message.className='tone-mobile-message';
        let current=null,reference=null,user=null,lastPerformance=null,manual=false;
        const prefRef=id=>db.ref(`users/${user.uid}/stats/mobileTonePreferences/${preferenceKey(id)}`);
        async function request(pitch,automatic=false){
            const state=current;
            if(!canControl(state,user?.uid)||!valid(pitch))return;
            if(!automatic)manual=true;
            await db.ref(`salas/${getRoom()}/pedidos`).push({
                kind:'tone',id:state.songId,singer:state.singer||'Cantor',singerUid:user.uid,processed:false,
                performanceId:state.performanceId,pitch,automatic,timestamp:firebase.database.ServerValue.TIMESTAMP
            });
            if(current?.performanceId===state.performanceId)message.textContent=automatic?'Seu tom salvo foi solicitado.':'Ajuste solicitado ao DJ.';
        }
        function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){message.textContent='Não foi possível concluir. Verifique a conexão e tente novamente.';}finally{b.disabled=false;}};return b;}
        controls.append(button('−',()=>request(Math.max(.7,Math.round(((current.pitch||1)-.05)*100)/100))),value,button('+',()=>request(Math.min(1.3,Math.round(((current.pitch||1)+.05)*100)/100))));panel.append(controls);
        const actions=document.createElement('div');actions.className='tone-mobile-actions';
        actions.append(button('Original',()=>request(1)),button('Salvar meu tom',async()=>{
            if(!canControl(current,user?.uid))return;
            await prefRef(current.songId).set({pitch:current.pitch||1,updatedAt:firebase.database.ServerValue.TIMESTAMP});message.textContent='Tom salvo na sua conta. Será reaplicado quando você cantar esta música sozinho.';
        }),button('Esquecer tom salvo',async()=>{if(!current||!user)return;await prefRef(current.songId).remove();message.textContent='Preferência removida.';}));panel.append(actions,message);
        document.getElementById('mainContent').prepend(panel);
        auth.onAuthStateChanged(next=>{
            reference?.off('value');user=next;current=null;panel.hidden=true;lastPerformance=null;
            const room=getRoom();if(!user||!room)return;
            const uid=user.uid;reference=db.ref(`salas/${room}/now_playing`);
            reference.on('value',snap=>{
                if(auth.currentUser?.uid!==uid||getRoom()!==room)return;
                current=snap.val();panel.hidden=!canControl(current,uid);
                if(panel.hidden)return;
                songLabel.textContent=current.title||'Música atual';
                const pitch=valid(current.pitch)?current.pitch:1;const steps=Math.round((pitch-1)/.059);value.textContent=`Tom ${steps>0?'+':''}${steps}`;
                if(current.performanceId!==lastPerformance){
                    lastPerformance=current.performanceId;manual=false;message.textContent='O ajuste vale para a apresentação atual. Em grupo, todos compartilham o mesmo tom.';
                    const state=current;
                    const ids=SingerSelection.recipients(state);
                    if(ids.length===1&&ids[0]===uid)prefRef(state.songId).once('value').then(saved=>{
                        const pref=saved.val();if(user?.uid===uid&&current?.performanceId===state.performanceId&&!manual&&valid(pref?.pitch))return request(pref.pitch,true);
                    }).catch(()=>{});
                }
            },()=>{message.textContent='Não foi possível conectar ao controle de tom.';});
        });
    }};
})(typeof window!=='undefined'?window:globalThis);
