// ════════════════════════════════════════════════════
// TOUR DO MOBILE (CANTOR) — Driver.js v1.3.1
//
// PARTE 1: "Room Finder Tour" — guia o usuário a
//   encontrar e entrar numa sala (dispara quando
//   nenhum ?room= está na URL).
//
// PARTE 2: "App Tour" — apresenta o catálogo e
//   funcionalidades (dispara APENAS após estar
//   dentro de uma sala + logado + catálogo carregado).
// ════════════════════════════════════════════════════

// ════════════════════════════════
//  UTILITÁRIOS
// ════════════════════════════════

function driverReady() {
    return !!(window.driver && window.driver.js);
}

function hasRoomInUrl() {
    const p = new URLSearchParams(window.location.search);
    return !!(p.get('room') || p.get('sala'));
}


// ════════════════════════════════
//  PARTE 1 — ROOM FINDER TOUR
//  Ativado quando ?room= NÃO está na URL
// ════════════════════════════════

let roomFinderTour;

function initRoomFinderTour() {
    if (!driverReady()) { setTimeout(initRoomFinderTour, 500); return; }

    roomFinderTour = window.driver.js.driver({
        showProgress: true,
        animate: true,
        nextBtnText: 'Próximo →',
        prevBtnText: '← Voltar',
        doneBtnText: 'Vou tentar! ✓',
        overlayOpacity: 0.82,
        onDestroyStarted: () => {
            localStorage.setItem('room_finder_tour_completed', 'true');
            roomFinderTour.destroy();
        },
        steps: [
            {
                // Passo introdutório sem highlight
                popover: {
                    title: '🎤 Bem-vindo ao Karaokê!',
                    description: 'Para pedir músicas, você precisa primeiro entrar na <b>sala do DJ</b>. Vamos te mostrar como fazer isso!',
                    side: 'over',
                    align: 'center'
                }
            },
            {
                element: '#roomSearchInput',
                popover: {
                    title: '🔎 Código da Sala',
                    description: 'Peça o <b>código de 5 letras</b> ao DJ ou à pessoa que está organizando a festa.<br><br>Você também pode digitar o <b>nome da festa</b> para buscá-la na lista!',
                    side: 'bottom',
                    align: 'center'
                }
            },
            {
                element: '#btnEnterRoom',
                popover: {
                    title: '▶ Entrar na Sala',
                    description: 'Após digitar o código ou selecionar a festa na lista, clique em <b>ENTRAR</b> para acessar o catálogo e começar a pedir músicas!',
                    side: 'top',
                    align: 'center'
                }
            }
        ]
    });
}

function startRoomFinderTour() {
    if (!roomFinderTour) { initRoomFinderTour(); setTimeout(startRoomFinderTour, 600); return; }
    if (!localStorage.getItem('room_finder_tour_completed')) {
        setTimeout(() => roomFinderTour.drive(), 800);
    }
}


// ════════════════════════════════
//  PARTE 2 — TOUR DO APP PRINCIPAL
//  Ativado após: sala + login + catálogo prontos
// ════════════════════════════════

let mobileTour;

function initMobileTour() {
    if (!driverReady()) { setTimeout(initMobileTour, 500); return; }

    mobileTour = window.driver.js.driver({
        showProgress: true,
        animate: true,
        nextBtnText: 'Próximo →',
        prevBtnText: '← Voltar',
        doneBtnText: '🎤 Bora cantar!',
        overlayOpacity: 0.78,
        onDestroyStarted: () => {
            localStorage.setItem('mobile_tour_completed', 'true');
            mobileTour.destroy();
        },
        steps: [
            {
                element: '.mobile-header',
                popover: {
                    title: '🎉 Você está dentro!',
                    description: 'Ótimo! Você está conectado à sala do DJ. Agora vamos te mostrar tudo que dá para fazer aqui!',
                    side: 'bottom',
                    align: 'center'
                }
            },
            {
                element: '.search-container',
                popover: {
                    title: '🔍 Encontre sua Música',
                    description: 'Digite o nome do <b>artista</b> ou da <b>música</b> para filtrar o catálogo em tempo real.',
                    side: 'bottom',
                    align: 'start'
                }
            },
            {
                element: '#btnMobileShuffle',
                popover: {
                    title: '🎲 Música Aleatória',
                    description: 'Sem ideia do que cantar? Clique aqui para o sistema <b>sortear uma música surpresa</b> pra você!',
                    side: 'left',
                    align: 'center'
                }
            },
            {
                element: '.song-card:first-child .star-btn',
                popover: {
                    title: '⭐ Favoritar Músicas',
                    description: 'Clique na <b>estrelinha</b> para salvar suas músicas preferidas. Você as encontra rapidinho na aba <b>Favoritos</b> da barra de navegação!',
                    side: 'left',
                    align: 'center'
                }
            },
            {
                element: '.song-card:first-child .btn-request',
                popover: {
                    title: '📨 Pedir uma Música',
                    description: 'Encontrou a certa? Clique no botão <b>✈️</b> para entrar na fila. Você será avisado na tela quando chegar a sua vez!',
                    side: 'left',
                    align: 'center'
                }
            },
            {
                element: '.bottom-nav',
                popover: {
                    title: '🧭 Navegação',
                    description: 'Use as abas abaixo: <b>Músicas</b> (catálogo completo), <b>Favoritos</b> (suas estrelinhas), <b>Meus Hits</b> (histórico de músicas cantadas) e <b>Suporte</b> (sugestões e reportar problemas).',
                    side: 'top',
                    align: 'center'
                }
            }
        ]
    });
}

function startMobileTour(force = false) {
    if (!mobileTour) { initMobileTour(); setTimeout(() => startMobileTour(force), 600); return; }
    if (force || !localStorage.getItem('mobile_tour_completed')) {
        // Volta para a aba Catálogo antes de iniciar —
        // garante que song-cards, busca e botões estejam visíveis
        const catalogBtn = document.querySelector('.nav-item:first-child');
        if (catalogBtn && typeof switchTab === 'function') {
            switchTab('catalog', catalogBtn);
        }
        // Pequena espera para a aba assentar antes do tour
        setTimeout(() => mobileTour.drive(), 450);
    }
}


// ════════════════════════════════
//  DETECÇÃO DE ESTADO
// ════════════════════════════════

// Verifica se a UI do App Principal está 100% pronta:
// Requer: código de sala na URL + login concluído +
//         mainContent visível + ao menos 1 song-card no catálogo
function isMobileUIReady() {
    // ① Sem sala na URL → nunca está pronto (usuário ainda precisa entrar)
    if (!hasRoomInUrl()) return false;

    const authOverlay = document.getElementById('authOverlay');
    const mainContent = document.getElementById('mainContent');
    const mobileList  = document.getElementById('mobileList');

    if (!mainContent || !mobileList) return false;

    // ② Login concluído?
    const isAuthGone =
        !authOverlay ||
        authOverlay.style.display === 'none' ||
        parseFloat(window.getComputedStyle(authOverlay).opacity) < 0.1 ||
        window.getComputedStyle(authOverlay).display === 'none';

    // ③ Conteúdo principal visível?
    const isMainVisible =
        mainContent.style.display !== 'none' &&
        window.getComputedStyle(mainContent).display !== 'none';

    // ④ Catálogo renderizou ao menos 1 card real?
    const hasSongCards = mobileList.querySelector('.song-card') !== null;

    return isAuthGone && isMainVisible && hasSongCards;
}


// ════════════════════════════════
//  INICIALIZAÇÃO COM POLLING DUPLO
// ════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initRoomFinderTour();
    initMobileTour();

    // Caso A: sem sala na URL — mostrar tour do Room Finder
    if (!hasRoomInUrl()) {
        // startRoomFinderTour(); // Desativado automático para não interromper a navegação
        return; 
    }

    // Caso B: sala na URL — aguardar login + catálogo via polling
    let pollCount = 0;
    const MAX_POLLS = 120; // até 60 segundos

    const pollInterval = setInterval(() => {
        pollCount++;

        if (isMobileUIReady()) {
            clearInterval(pollInterval);
            // +1.5s para animações de entrada assentarem
            setTimeout(() => startMobileTour(), 1500);
            return;
        }

        if (pollCount >= MAX_POLLS) {
            clearInterval(pollInterval);
            console.warn('[Tour Mobile] Timeout: UI não ficou pronta em 60s.');
        }
    }, 500);
});
