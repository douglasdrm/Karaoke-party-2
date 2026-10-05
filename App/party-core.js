(function (root) {
    'use strict';
    const normalize = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
    const encode = value => Array.from(new TextEncoder().encode(String(value))).map(x => x.toString(16).padStart(2, '0')).join('');
    // Legacy singerUid identifies the requester, not necessarily a singer.
    // Until explicit recipient IDs are implemented, use the displayed formation
    // within the DJ's own library and never treat the requester as the singer.
    const preferenceKey = song => encode(JSON.stringify([String(song.id), normalize(song.singer)]));
    const validPitch = value => typeof value === 'number' && Number.isFinite(value) && value >= 0.7 && value <= 1.3;
    function summarize(party) {
        const songs = Object.values(party?.songs || {});
        const completed = songs.filter(s => s.status === 'completed');
        const challenges = completed.filter(s => s.challenge?.id);
        const accepted = {};
        for (const song of challenges) for (const singer of song.challenge.singers || []) {
            if (!accepted[singer.uid]) accepted[singer.uid] = {name:singer.name, count:0};
            accepted[singer.uid].count++;
        }
        return {
            challenges, challengeLeaders: Object.values(accepted).sort((a,b) => b.count-a.count),
            completed,
            skipped: songs.filter(s => s.status === 'skipped').length,
            failed: songs.filter(s => s.status === 'error').length,
            formations: new Set(completed.map(s => normalize(s.singer))).size,
            ranking: completed.filter(s => typeof s.score === 'number').sort((a, b) => b.score - a.score).slice(0, 5)
        };
    }
    function summaryText(party) {
        const summary = summarize(party);
        return [party.name || 'Minha festa', new Date(party.startedAt).toLocaleString('pt-BR'),
            `${summary.completed.length} apresentações concluídas · ${summary.formations} formações diferentes`,
            '', 'Músicas cantadas:', ...summary.completed.map(s => `${s.singer} — ${s.title}${s.score == null ? '' : ` (${s.score} pontos)`}`),
            '', 'Desafios concluídos: ' + summary.challenges.length, ...summary.challenges.map(s => s.singer + ' — ' + s.title + ' (lançado por ' + s.challenge.authorName + ')'),
            'Quem mais encarou:', ...summary.challengeLeaders.map(s => s.name + ': ' + s.count),
            '', 'Participação na festa:', ...(party.participation || []).map(p => `${p.name}: ${p.points} pontos · ${p.songs} músicas · ${p.groups} em grupo · ${p.challenges} desafios cantados · ${p.launched} desafios lançados · ${p.receivedVotes} votos recebidos · ${p.recruits} convidados · ${p.audios} recados · sequência máxima: ${p.streak}`),
            '', 'Destaques:', ...summary.ranking.map((s, i) => `${i + 1}. ${s.singer} — ${s.score} pontos`)].join('\n');
    }
    function validGenre(value) {
        if (typeof value !== 'string') return false;
        const name = value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return /[a-z]/.test(name) && !['null', 'undefined', 'nan', 'n/a', 'na', 'sem estilo', 'sem genero', 'sem identificacao', 'nao informado', 'nao identificado', 'desconhecido'].includes(name);
    }
    function genreRanking(genres) {
        return Object.entries(genres || {}).filter(([name, count]) => validGenre(name) && (typeof count === 'number' || typeof count === 'string') && Number.isFinite(Number(count)) && Number(count) > 0)
            .map(([name, count]) => [name.trim(), Number(count)]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
    }
    const api = { validGenre, genreRanking, normalize, preferenceKey, validPitch, summarize, summaryText };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.PartyCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
