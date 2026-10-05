(function () {
    'use strict';
    const { el, button, dialog } = PartyUI;
    let db, auth, feedbackRef, stateRef, records = {}, states = {}, category = 'suggestions';
    const labels = {open:'Aberto',reviewing:'Em análise',resolved:'Resolvido'};
    function adminUser() {
        const user = auth.currentUser;
        if (!user || user.email !== 'douglasdrm@gmail.com') throw new Error('Entre com a conta administrativa.');
        return user;
    }
    async function change(uid, action, changes) {
        const user = adminUser();
        const reason = prompt('Motivo desta alteração (será registrado no histórico):');
        if (reason === null) return false;
        if (!reason.trim()) throw new Error('Informe um motivo para registrar a alteração.');
        const before = (await db.ref('users/' + uid).once('value')).val() || {};
        const key = db.ref('accessHistory').push().key;
        const updates = {};
        if (changes === null) updates['users/' + uid] = null;
        else for (const [field, value] of Object.entries(changes)) updates[`users/${uid}/${field}`] = value;
        updates['accessHistory/' + key] = {
            uid, targetName: before.name || uid, action, reason: reason.trim(),
            actorUid: user.uid, actorEmail: user.email,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            before: {subscription:before.subscription || null,isBanned:before.isBanned || false,trialUsedMs:before.trialUsedMs || 0},
            changes: changes === null ? {deleted:true} : Object.entries(changes).map(([field,value]) => ({field,value}))
        };
        // The action and its log either both succeed or both fail.
        await db.ref().update(updates);
        return true;
    }
    async function history() {
        adminUser();
        const { body } = dialog('Histórico administrativo de acessos');
        body.append(el('p', 'Alterações feitas neste painel a partir desta atualização. Pagamentos automáticos e alterações diretas no Firebase não estão incluídos.', 'party-muted'));
        const search = el('input'); search.placeholder = 'Buscar usuário, ação ou administrador'; search.setAttribute('aria-label',search.placeholder); body.append(search);
        const list = el('div'); body.append(list); list.append(el('p','Carregando…'));
        const snap = await db.ref('accessHistory').limitToLast(200).once('value');
        const events = Object.values(snap.val() || {}).sort((a,b)=>b.timestamp-a.timestamp);
        function render() {
            list.replaceChildren();
            const term = PartyCore.normalize(search.value);
            const found = events.filter(item => PartyCore.normalize([item.uid,item.targetName,item.action,item.actorEmail,item.reason].join(' ')).includes(term));
            if (!found.length) list.append(el('p','Nenhum registro encontrado.'));
            for (const item of found) {
                const card = el('div',undefined,'party-card');
                card.append(el('strong',`${item.action} — ${item.targetName}`),el('p',`${new Date(item.timestamp).toLocaleString('pt-BR')} · ${item.actorEmail}`, 'party-muted'),el('p',item.reason));
                const details = el('details'); details.append(el('summary','Ver valores anteriores e alteração'),el('pre',JSON.stringify({antes:item.before,alteracao:item.changes},null,2)));
                card.append(details); list.append(card);
            }
        }
        search.oninput = render; render();
    }
    function renderFeedback() {
        const tbody = document.getElementById('feedbackTableBody');
        const thead = document.getElementById('feedbackTableHead');
        if (!tbody || !thead) return;
        thead.replaceChildren();
        const head = el('tr');
        for (const label of ['Relato','Detalhes','Enviado por','Situação','Ações']) head.append(el('th',label));
        thead.append(head); tbody.replaceChildren();
        const status = document.getElementById('issueStatusFilter').value;
        const search = PartyCore.normalize(document.getElementById('issueSearch').value);
        const entries = Object.entries(records).filter(([id,item]) => {
            const state = states[id]?.status || 'open';
            return (!status || state === status) && PartyCore.normalize([item.song,item.issue,item.type,item.details,item.msg,item.user_name].join(' ')).includes(search);
        }).sort((a,b)=>(b[1].timestamp||0)-(a[1].timestamp||0));
        const total = Object.keys(records).length;
        document.getElementById('issueCount').textContent = `${entries.length} de ${total} relatos · ${Object.keys(records).filter(id => (states[id]?.status || 'open') !== 'resolved').length} pendentes`;
        if (!entries.length) { const tr=el('tr'); const td=el('td','Nenhum relato encontrado.');td.colSpan=5;tr.append(td);tbody.append(tr); }
        for (const [id,item] of entries) {
            const state = states[id] || {status:'open'};
            const tr = el('tr');
            tr.append(el('td',item.song || 'Sugestão'),el('td',[item.issue || item.type,item.details || item.msg].filter(Boolean).join(' — ')),el('td',`${item.user_name || 'Anônimo'} · ${item.timestamp ? new Date(item.timestamp).toLocaleString('pt-BR') : 'Data não informada'}`),el('td',labels[state.status] || labels.open));
            const actions=el('td'); actions.append(button('Acompanhar',()=>editIssue(id,item,state,category)));tr.append(actions);tbody.append(tr);
        }
    }
    function editIssue(id,item,state,sub) {
        const {body} = dialog('Acompanhar relato');
        body.append(el('h3',item.song || 'Sugestão'),el('p',item.details || item.msg || 'Sem detalhes'));
        const select=el('select');select.setAttribute('aria-label','Situação');
        for(const [value,label] of Object.entries(labels)){const option=el('option',label);option.value=value;select.append(option);}select.value=state.status||'open';
        const notes=el('textarea');notes.placeholder='Observações internas sobre a correção';notes.setAttribute('aria-label',notes.placeholder);notes.value=state.notes||'';
        const result=el('p','', 'party-muted');
        body.append(select,notes,button('Salvar acompanhamento',async()=>{
            const user=adminUser();
            // Moderation lives outside feedback: participants cannot resolve or
            // overwrite these states through the existing feedback write grant.
            await db.ref(`catalogIssueStates/${sub}/${id}`).set({status:select.value,notes:notes.value.trim(),updatedAt:firebase.database.ServerValue.TIMESTAMP,updatedBy:user.uid});
            result.textContent='Acompanhamento salvo. O relato original foi preservado.';
        }),result);
    }
    function feedback(sub) {
        category=sub;
        feedbackRef?.off();stateRef?.off(); records={};states={};
        let filters=document.getElementById('issueFilters');
        if(!filters){
            filters=el('div',undefined,'party-filters');filters.id='issueFilters';
            const search=el('input');search.id='issueSearch';search.placeholder='Buscar música, problema ou usuário';search.setAttribute('aria-label',search.placeholder);search.oninput=renderFeedback;
            const select=el('select');select.id='issueStatusFilter';select.setAttribute('aria-label','Filtrar situação');
            for(const [value,label] of Object.entries({'':'Todas as situações',...labels})){const option=el('option',label);option.value=value;select.append(option);}select.onchange=renderFeedback;
            const count=el('p','','party-muted');count.id='issueCount';filters.append(search,select,count);document.getElementById('feedbackView').prepend(filters);
        }
        feedbackRef=db.ref('feedback/'+sub);stateRef=db.ref('catalogIssueStates/'+sub);
        const fail=error=>{document.getElementById('issueCount').textContent='Falha ao carregar: '+error.message;};
        feedbackRef.on('value',snap=>{records=snap.val()||{};renderFeedback();},fail);
        stateRef.on('value',snap=>{states=snap.val()||{};renderFeedback();},fail);
    }
    window.KaraokeAdmin = { change, feedback, init(options){db=options.db;auth=options.auth;document.getElementById('btnAccessHistory').onclick=()=>history().catch(error=>alert(error.message));} };
})();
