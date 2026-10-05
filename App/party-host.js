(function () {
    'use strict';
    const { el, button, dialog, download } = PartyUI;
    let api, party, track, generation = 0, saveChain = Promise.resolve(), lastError = null;
    function base() {
        const user = api.user();
        if (!user) throw new Error('Entre na conta do DJ.');
        return api.db.ref(`users/${user.uid}/stats/partyTools`);
    }
    function save() {
        if (!party) return Promise.resolve();
        party.participation = SocialCore.ranking(party.songs, party.activities, party.challenges);
        const snapshot = JSON.parse(JSON.stringify(party));
        const reference = base().child('sessions/' + snapshot.id);
        saveChain = saveChain.catch(() => {}).then(async () => { await reference.set(snapshot); if (api.room() && party?.id === snapshot.id) await api.db.ref(`salas/${api.room()}/participation`).set({people:snapshot.participation,weights:SocialCore.weights}); }).then(() => { lastError = null; }).catch(error => {
            lastError = error;
            console.warn('Resumo ainda não sincronizado:', error);
            throw error;
        });
        // Every caller may await for user-visible actions; background hooks do not
        // stop playback if the network is unavailable.
        saveChain.catch(() => {});
        return saveChain;
    }
    function backgroundSave() { save().catch(() => {}); }
    function begin(name) {
        if (party) { party.endedAt = Date.now(); backgroundSave(); }
        party = { id: base().child('sessions').push().key, name, startedAt: Date.now(), songs: {} };
        track = null; generation++; backgroundSave();
    }
    async function playing(song, video) {
        const token = ++generation;
        if (party) {
            const previous = party.songs[track];
            if (previous?.status === 'playing') { previous.status = 'skipped'; previous.endedAt = Date.now(); }
            track = base().push().key;
            party.songs[track] = { id: String(song.id), title: song.title || '', artist: song.artist || '', singer: song.singer || 'Convidado', status: 'playing', startedAt: Date.now(), ...(song.challenge ? {challenge:song.challenge} : {}) };
            const members = api.members() || {};
            const ids = SingerSelection.recipients(song);
            party.songs[track].performerCount = Math.max(ids.length, Number(song.performerCount) || 1);
            party.songs[track].participants = Object.fromEntries(ids.filter(uid => members[uid] || uid === api.user()?.uid).map(uid => [uid, SocialCore.clean(members[uid]?.name || api.user()?.displayName)]));
            backgroundSave();
        }
    }

    function complete(score, status = 'completed') {
        const item = party?.songs?.[track];
        if (!item || item.status !== 'playing') return;
        item.status = status; item.endedAt = Date.now();
        if (status === 'completed') {
            const members = api.members() || {};
            item.voters = Object.fromEntries(Object.entries(api.votes() || {}).filter(([uid,v]) => members[uid] && Number.isFinite(v.stars) && v.stars >= 1 && v.stars <= 5 && !item.participants?.[uid]).map(([uid]) => [uid, SocialCore.clean(members[uid].name)]));
        }
        if (status === 'completed' && Number.isFinite(score)) item.score = score;
        backgroundSave();
    }
    function showSummary(value, current = false) {
        const { body } = dialog(current ? 'Resumo da festa atual' : 'Resumo da festa');
        const summary = PartyCore.summarize(value);
        body.append(el('h3', value.name), el('p', `${summary.completed.length} apresentações concluídas · ${summary.formations} formações diferentes`));
        body.append(el('p', `${summary.skipped} puladas · ${summary.failed} com erro. Uma dupla ou grupo conta como uma formação.`, 'party-muted'));
        if (lastError && current) body.append(el('p', 'O último salvamento falhou. Você pode baixar o resumo e tentar salvar novamente.', 'party-warning'));
        const actions = el('div', undefined, 'party-actions');
        actions.append(button('Baixar resumo', () => download(PartyCore.summaryText(value), 'resumo-da-festa.txt')),
            button('Compartilhar', async () => {
                const text = PartyCore.summaryText(value);
                if (navigator.share) { try { await navigator.share({title:value.name, text}); } catch (e) { if (e.name !== 'AbortError') throw e; } }
                else download(text, 'resumo-da-festa.txt');
            }));
        if (current) actions.append(button('Salvar agora', () => save()), button('Encerrar festa e sair', async () => {
            if (!confirm('Encerrar a festa e sair da cabine? A reprodução será interrompida.')) return;
            await end(); api.logout();
        }));
        body.append(actions, el('pre', PartyCore.summaryText(value)));
    }
    async function summaries() {
        const { body } = dialog('Festas e resumos');
        if (party) body.append(button('Ver festa atual', () => showSummary(JSON.parse(JSON.stringify(party)), true)));
        const list = el('div'); body.append(list); list.append(el('p', 'Carregando festas salvas…'));
        try {
            const snap = await base().child('sessions').limitToLast(30).once('value');
            list.replaceChildren();
            const items = Object.values(snap.val() || {}).sort((a,b) => b.startedAt-a.startedAt);
            if (!items.length) list.append(el('p', 'As festas aparecerão aqui a partir desta atualização.'));
            for (const item of items) {
                const card = el('div', undefined, 'party-card');
                card.append(el('strong', item.name), el('p', new Date(item.startedAt).toLocaleString('pt-BR'), 'party-muted'), button('Abrir resumo', () => showSummary(item)));
                list.append(card);
            }
        } catch (error) { list.replaceChildren(el('p', 'Não foi possível carregar as festas: ' + error.message)); }
    }
    async function end() {
        if (!party) return;
        complete(null, 'skipped'); party.endedAt = Date.now();
        let timer;
        try {
            await Promise.race([save(), new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('Sem confirmação de salvamento. Baixe o resumo ou tente novamente.')), 5000);
            })]);
        } finally { clearTimeout(timer); }
    }
    window.PartyHost = {
        init(options) { api = options; document.getElementById('btnPartySummary').onclick = summaries; },
        begin, playing, complete, end,
        challenges(items) { if (!party) return; party.challenges = items || {}; backgroundSave(); },
        activity(id, value) { if (!party) return; party.activities ||= {}; if (party.activities[id]) return; party.activities[id] = value; backgroundSave(); },
        ranking() { return party ? SocialCore.ranking(party.songs, party.activities, party.challenges) : []; },
        toneEdited() { generation++; },
        invalidate() { generation++; }
    };
})();
