(() => {
    'use strict';

    const currentParams = new URLSearchParams(window.location.search);

    document.querySelectorAll('[data-mode-link]').forEach((link) => {
        link.addEventListener('click', () => {
            const mode = link.dataset.modeLink;
            if (mode) {
                try {
                    localStorage.setItem('karaokeCabinMode', mode);
                } catch (error) {
                    console.warn('Não foi possível salvar o modo escolhido.', error);
                }
            }
        });
    });

    document.querySelectorAll('[data-preserve-query]').forEach((link) => {
        if (!currentParams.toString()) return;
        const target = new URL(link.getAttribute('href'), window.location.href);
        currentParams.forEach((value, key) => target.searchParams.set(key, value));
        link.href = `${target.pathname}${target.search}${target.hash}`;
    });

    if (document.body.classList.contains('display-entry-page')) {
        const isAndroidTv = currentParams.get('display') === 'android-tv';
        const title = document.querySelector('[data-device-title]');
        const description = document.querySelector('[data-device-description]');
        if (isAndroidTv) {
            if (title) title.textContent = 'Android TV / TV Box';
            if (description) description.textContent = 'Esta tela será pareada com a festa e operada à distância pelo celular ou pela Cabine do DJ.';
            document.title = 'Android TV / TV Box | Karaoke Party';
        }
    }
})();
