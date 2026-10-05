(function (root) {
    'use strict';
    function recipients(data) {
        if (data.recipientVersion === 1) {
            const values = Array.isArray(data.recipientUids) ? data.recipientUids : Object.values(data.recipientUids || {});
            return [...new Set(values.filter(uid => typeof uid === 'string' && uid.length > 0))];
        }
        return typeof data.singerUid === 'string' && data.singerUid ? [data.singerUid] : [];
    }
    function payload(people) {
        return {
            recipientVersion: 1,
            performerCount: people.length,
            recipientUids: [...new Set(people.map(person => person.uid).filter(Boolean))],
            singer: people.map(person => person.name).join(' e ')
        };
    }
    let selected = new Map();
    function mount(container, display, active, user) {
        selected = new Map();
        const people = new Map();
        Object.entries(active || {}).forEach(([key, person]) => {
            const uid = person.type === 'local' ? null : (person.uid || key);
            people.set(uid || 'local:' + key, {uid, name:person.name || 'Cantor'});
        });
        const self = people.get(user.uid) || {uid:user.uid,name:user.displayName?.split(' ')[0] || 'Eu'};
        people.set(user.uid,self); selected.set(user.uid,self);
        display.readOnly = true;
        container.replaceChildren();
        const note=document.createElement('p');note.textContent='Marque quem vai cantar. O cartão será enviado somente às contas selecionadas.';note.style.cssText='width:100%;font-size:.8rem;opacity:.8;';container.append(note);
        const choices=document.createElement('div');choices.style.cssText='display:flex;flex-wrap:wrap;gap:8px;width:100%;';container.append(choices);
        const refresh=()=>{display.value=payload([...selected.values()]).singer;};
        function addChoice(key,person) {
            const label=document.createElement('label');label.className='user-chip';label.style.cursor='pointer';
            const input=document.createElement('input');input.type='checkbox';input.checked=selected.has(key);input.style.cssText='width:auto;accent-color:#d946ef;margin-right:6px;';
            const text=document.createElement('span');text.textContent=person.name+(key===user.uid?' (você)':'')+(!person.uid?' (sem cartão no celular)':'');
            input.onchange=()=>{if(input.checked)selected.set(key,person);else selected.delete(key);refresh();};label.append(input,text);choices.append(label);
        }
        people.forEach((person,key)=>addChoice(key,person));
        const guest=document.createElement('input');guest.type='text';guest.placeholder='Cantor sem conta no celular';guest.setAttribute('aria-label',guest.placeholder);guest.maxLength=100;
        const add=document.createElement('button');add.type='button';add.textContent='Adicionar cantor sem conta';add.className='user-chip';
        add.onclick=()=>{const name=guest.value.trim();if(!name)return;const key='guest:'+name.toLocaleLowerCase('pt-BR');if(people.has(key))return;const person={uid:null,name};people.set(key,person);selected.set(key,person);addChoice(key,person);guest.value='';refresh();};
        container.append(guest,add);refresh();
    }
    const api={recipients,payload,mount,current:()=>payload([...selected.values()])};
    if(typeof module!=='undefined'&&module.exports)module.exports=api;
    root.SingerSelection=api;
})(typeof window!=='undefined'?window:globalThis);
