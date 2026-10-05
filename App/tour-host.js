// ════════════════════════════════════════════
// TOUR DO HOST (DJ) — Driver.js v1.3.1
//
// O tour é INICIADO pelo app.js via startHostTour()
// chamado dentro de startRoom(), garantindo que:
//   - Overlay de login já sumiu
//   - Modal de criação de sala já foi fechado
//   - Dashboard está visível e a sala está ativa
//
// Também pode ser refeito via botão nas Configurações.
// ════════════════════════════════════════════

let hostTour;

function initHostTour() {
    if (!window.driver || !window.driver.js) {
        console.warn('[Tour Host] Driver.js ainda não carregou, aguardando...');
        setTimeout(initHostTour, 500);
        return;
    }

    hostTour = window.driver.js.driver({
        showProgress: true,
        animate: true,
        smoothScroll: true,
        nextBtnText: 'Próximo →',
        prevBtnText: '← Voltar',
        doneBtnText: '✓ Entendido!',
        overlayOpacity: 0.75,
        onDestroyStarted: () => {
            localStorage.setItem('host_tour_completed', 'true');
            hostTour.destroy();
        },
        steps: [
            {
                element: '.sidebar-search',
                popover: {
                    title: '🎵 Catálogo de Músicas',
                    description: 'Busque músicas pelo nome do artista, título ou código. O botão <b>🎲</b> sorteia uma música aleatória!',
                    side: 'right',
                    align: 'start'
                }
            },
            {
                element: '#songSearch',
                popover: {
                    title: '🔍 Campo de Busca',
                    description: 'Digite aqui para filtrar em tempo real. Funciona com nome do artista, música ou código numérico.',
                    side: 'bottom',
                    align: 'start'
                }
            },
            {
                element: '#playerContainer',
                popover: {
                    title: '🎬 O Palco / Player',
                    description: 'Aqui é onde a mágica acontece! O vídeo do karaokê aparece aqui quando uma música está tocando.',
                    side: 'bottom',
                    align: 'center'
                }
            },
            {
                element: '#mainControls',
                popover: {
                    title: '🎛️ Controles da Cabine',
                    description: 'Altere o <b>Tom</b> e o <b>Volume</b>. O botão central é Play/Pause. O botão <b>Stop ■</b> encerra e aciona a tela de pontuação!',
                    side: 'top',
                    align: 'center'
                }
            },
            {
                element: '.sidebar-queue',
                popover: {
                    title: '🔥 Fila de Cantores & QR Code',
                    description: 'Veja quem são os próximos cantores. Mostre o <b>Código da Sala</b> ou o <b>QR Code</b> para que todos peçam músicas pelo celular!',
                    side: 'left',
                    align: 'start'
                }
            },
            {
                element: '#btnSettings',
                popover: {
                    title: '⚙️ Configurações',
                    description: 'Acesse aqui para sair da cabine, configurar o protetor de tela ou <b>refazer este tutorial</b> a qualquer momento.',
                    side: 'left',
                    align: 'start'
                }
            }
        ]
    });
}

function startHostTour(force = false) {
    // Garante que o Driver.js está pronto
    if (!hostTour) {
        initHostTour();
        setTimeout(() => startHostTour(force), 600);
        return;
    }

    if (force || !localStorage.getItem('host_tour_completed')) {
        // Fecha o modal de settings se estiver aberto
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.style.display = 'none';

        hostTour.drive();
    }
}

// Inicializa o Driver.js quando o DOM estiver pronto
// (o disparo real do tour é feito pelo app.js via startRoom())
document.addEventListener('DOMContentLoaded', () => {
    initHostTour();
});
