(function () {
    'use strict';
    function el(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function button(text, handler) {
        const b = el('button', text, 'party-button'); b.type = 'button';
        b.addEventListener('click', async () => {
            b.disabled = true;
            try { await handler(); } catch (error) { alert('Não foi possível concluir: ' + error.message); }
            finally { b.disabled = false; }
        });
        return b;
    }
    function dialog(title) {
        document.getElementById('partyDialog')?.remove();
        const d = el('dialog', undefined, 'party-dialog'); d.id = 'partyDialog';
        const head = el('div', undefined, 'party-heading'); head.append(el('h2', title), button('Fechar', () => d.close()));
        const body = el('div'); d.append(head, body);
        const previous = document.activeElement;
        d.addEventListener('close', () => { d.remove(); previous?.focus(); });
        (document.fullscreenElement || document.body).append(d); d.showModal();
        return { dialog: d, body };
    }
    function download(text, filename) {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        const a = el('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    window.PartyUI = { el, button, dialog, download };
})();
