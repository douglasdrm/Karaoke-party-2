(function () {

    // XANDU-OKÊ Next Gen - app.js (Clean Build)

    "use strict";

    // ─── State ───────────────────────────────────────────────────────────────────

    let catalog = [];

    let queue = [];

    let currentCode = "";

    let isPlaying = false;

    let currentAudio = null;

    let maxVolume = 0;

    let audioContext = null, analyzer = null, dataArray = null;

    let pitchShifter = null;

    let audioSource = null;

    let currentPitch = 1.0;
    let tonePerformanceId = "";
    let toneManuallyAdjusted = false;

    let currentCallAudio = null; // Áudio ativo da apresentação do próximo cantor

    let currentCallTimer = null; // Timer ativo da apresentação do próximo cantor
    let partyRankingTransition = 0;
    let rankingRefreshTimer = null;
    const PARTY_RANKING_CATEGORIES = [
        ['points', 'Pontuação geral', 'fa-star', 'pts'],
        ['songs', 'Rei/Rainha do Karaokê', 'fa-microphone', 'músicas'],
        ['launched', 'Maior desafiador', 'fa-fire', 'desafios'],
        ['challenges', 'Mais corajoso', 'fa-shield-halved', 'aceitos'],
        ['groups', 'Parceiro de palco', 'fa-people-group', 'grupos'],
        ['recruits', 'Recrutador', 'fa-bullhorn', 'convites'],
        ['receivedVotes', 'Queridinho da galera', 'fa-heart', 'votos'],
        ['streak', 'Incendiário', 'fa-bolt', 'sequência'],
        ['audios', 'Locutor da festa', 'fa-microphone-lines', 'recados']
    ];

    function safeEscape(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    let controlsTimeout = null;

    let idleTimeout = null;

    let screensaverImages = [];

    let screensaverIndex = 0;

    let screensaverInterval = null;

    let forcedScore = null; // Flag para nota 100 discreta (tecla ',')

    let ytPlayer = null;         // Referência global ao YouTube IFrame (não usado diretamente)

    let ytAmbientPlayer = null;  // Player de música ambiente (YouTube API)

    let isAmbientPlaying = false;

    let ambientLastTime = 0;

    let ambientLastIndex = 0;

    let isDestroyingAmbient = false;

    let ambientRankingTimer = null;

    let ambientRankingPage = 0;

    let ambientStateTimer = null;

    let currentVotes = {}; // Armazena votos por usuário da música atual (v9)
    let currentDedometro = {}; // Armazena votos like/dislike do Dedômetro (Novo!)
    let sessionRanking = []; // Armazena os melhores da noite (v20)
    let currentVolume = parseFloat(localStorage.getItem('djVolume') || '0.7');

    // ─── Cloud Media Settings ─────────────────────────────────────────────────────

    // Coloque aqui o endereço raiz onde suas MP4 ficarão hospedadas (R2, B2, S3, etc)

    // Exemplo: "https://media.unodev.com.br/Musicas/" - Não deixe de incluir a "/" no final.

    // Deixe vazio ("") para buscar localmente na hospedagem atual.

    const CDN_BASE_URL = "https://media.unodev.com.br/file/karaoke-midia/Musicas/";

    // ─── Settings State ───────────────────────────────────────────────────────────

    let settings = {

        autoFullscreen: false,

        ambientUrl: "",

        ambientRankingMode: "balanced",

        playIntroCall: true,
        autoApproveVoiceMessages: false,

        screensaverTimeout: 30000,

        enableScore: true,

        scoreMode: 'mic',

        minRandomScore: 75,

        difficulty: 'normal'

    };

    let trialUsedMs = 0;

    let trialTimer = null;
    let premiumTimer = null;

    const TRIAL_LIMIT_MS = 1800000; // 30 Minutos

    // ─── SaaS Room Auth & Firebase Config ──────────────────────────────────────────

    const firebaseConfig = {

        apiKey: "AIzaSyCnZ8hoE3NGNx2t490Yw12AxlCqVjSguig",

        authDomain: "karaoke-party-online.firebaseapp.com",

        databaseURL: "https://karaoke-party-online-default-rtdb.firebaseio.com",

        projectId: "karaoke-party-online",

        storageBucket: "karaoke-party-online.firebasestorage.app",

        messagingSenderId: "1059879567957",

        appId: "1:1059879567957:web:d4cb88563b39fe08934adc"

    };

    firebase.initializeApp(firebaseConfig);

    const db = firebase.database();

    const auth = firebase.auth();

    const googleProvider = new firebase.auth.GoogleAuthProvider();

    let currentRoomCode = null;

    let currentRoomName = "Festa do DJ";

    let hostUser = null;

    let isPremium = false; // Novo: Status VIP

    let subscriptionData = null; // Novo: Detalhes da assinatura (expiração, plano)

    const hostMemePhrases = [
        "Atenção, porque agora o microfone tem dono: [Nome]!",
        "Pode abrir espaço que [Nome] chegou para cantar!",
        "O palco está pronto. O microfone também. Agora é com [Nome]!",
        "A próxima apresentação tem nome: [Nome]!",
        "Sem pressão nenhuma... pode chegar, [Nome]!",
        "Atenção, plateia: [Nome] assumiu o microfone!",
        "A música foi escolhida. Agora não tem mais volta, [Nome]!",
        "Preparem os ouvidos e o coração: chegou [Nome]!",
        "O karaokê continua e agora é a vez de [Nome]!",
        "Quem está pronto para mais uma? Porque [Nome] está!",
        "O palco foi liberado. Pode entrar, [Nome]!",
        "Chegou o momento. Respira fundo e vai, [Nome]!",
        "A próxima voz da noite atende pelo nome de [Nome]!",
        "Agora é oficial: [Nome] está com o microfone!",
        "Tudo pronto por aqui. Só faltava [Nome]!",
        "Pode aumentar o volume: [Nome] chegou!",
        "A noite ainda tem história para contar. Com vocês, [Nome]!",
        "Atenção: [Nome] está prestes a fazer acontecer!",
        "O microfone mudou de mãos. Agora é com [Nome]!",
        "A próxima performance começa com um nome: [Nome]!",
        "Segura essa, porque [Nome] vem aí!",
        "O palco está por conta de [Nome]!",
        "A plateia pediu música. [Nome] resolveu atender!",
        "A próxima música já tem protagonista: [Nome]!",
        "Chegou a hora de [Nome] mostrar serviço!",
        "Pode preparar os aplausos: [Nome] está na área!",
        "Agora é aquele momento em que tudo pode acontecer: [Nome] no microfone!",
        "A responsabilidade agora está oficialmente nas mãos de [Nome]!",
        "O show segue e [Nome] é a próxima atração!",
        "Senhoras e senhores... com vocês, [Nome]!",
        "A confiança chegou primeiro. Agora vem [Nome]!",
        "É hora de descobrir o que [Nome] anda cantando por aí!",
        "O microfone está ligado. [Nome] também!",
        "O próximo capítulo da noite começa agora com [Nome]!",
        "Pode vir tranquilo... ou não. É a vez de [Nome]!"
    ];

    let activeUsers = {};

    let recentSingers = JSON.parse(localStorage.getItem('recentSingers') || '[]');

    // ─── Sound Banks ──────────────────────────────────────────────────────────────

    const sounds = {
        suspense: "../SFX/Dando_nota.mp3",
        low: "../SFX/Nota_baixa.mp3",
        med: "../SFX/Nota_media.mp3",
        high: "../SFX/Nota_alta.mp3",
        max: "../SFX/Nota_maxima.mp3",
        applause: "../SFX/Aplausos.mp3"
    };

    const scorePhrases = {

        low: [

            "A nota pode ter sido baixa, mas o seu carisma conquistou o público!",

            "Nota baixa? Isso é só para dar um toque de mistério à sua performance!",

            "Quem precisa de notas altas quando se tem tanto charme não palco?",

            "A próxima música vai ser melhor... se você cantar em playback!"

        ],

        med1: [

            "Você não desafinou, apenas explorou novas notas musicais!",

            "Você está mantendo o mistério, guardando o melhor para o final!",

            "A próxima música vai ser melhor... porque você já aqueceu a voz!",

            "Seu talento é como um diamante em bruto, pronto para polir!"

        ],

        med2: [

            "Não foi um 'Zerou a vida', mas você está evoluindo!",

            "Seu talento é como vinho: melhora a cada nota não karaokê!",

            "Essa música é tão difícil que até o cantor original desafina!",

            "Cê tá cantando tão bem que até o cachorro tá latindo junto!"

        ],

        high: [

            "Arrasou não karaokê, cantou que nem o Roberto Carlos! Mancando.",

            "Você arrasou! Tá saindo da jaula o monstro!",

            "Arrebentou! Quase que o Chacrinha voltou só pra te dar um troféu!",

            "Nota 10? Treina mais um pouquinho e você deixa o Pavarotti não chinelo!",

            "Arrasou, com esta voz vc vai longe! Vai chegar em Japeri!",

            "Cantou como um canarinho. Cuidado! Vão querer te engaiolar!"

        ],

        max: [

            "Nota máxima, hein? Só para os 'mitos' do karaokê!",

            "Nota máxima? Só posso dizer: 'é verdade esse bilete'!",

            "Canta muito! É o famoso 'quem sabe faz ao vivo'!",

            "Que performance! Já pode largar o emprego e virar cantor profissional!",

            "Sua voz é tão boa que até o microfone ficou emocionado!",

            "A galera tá tão impressada que até esqueceu de filmar!"

        ]

    };

    // ─── DOM Refs (after DOMContentLoaded) ───────────────────────────────────────

    let songSearch, songList, queueList, playerArea;

    let topInfoTitle, topInfoArtist, topInfoBox;

    let codeEntryOverlay, codeDisplay, codeSongInfo;

    let modal;

    // ─── Init ─────────────────────────────────────────────────────────────────────

    document.addEventListener("DOMContentLoaded", () => {

        songSearch = document.getElementById('songSearch');

        songList = document.getElementById('songList');

        queueList = document.getElementById('queueList');

        playerArea = document.getElementById('player');

        topInfoTitle = document.getElementById('topInfoTitle');

        topInfoArtist = document.getElementById('topInfoArtist');

        topInfoBox = document.getElementById('topInfoBox');

        codeEntryOverlay = document.getElementById('codeEntryOverlay');

        codeDisplay = document.getElementById('codeDisplay');

        codeSongInfo = document.getElementById('codeSongInfo');

        modal = document.getElementById('customModal');

        const fullscreenContainer = document.getElementById('playerContainer');
        const syncFullscreenClass = () => fullscreenContainer?.classList.toggle(
            'is-native-fullscreen',
            document.fullscreenElement === fullscreenContainer || document.webkitFullscreenElement === fullscreenContainer
        );
        document.addEventListener('fullscreenchange', syncFullscreenClass);
        document.addEventListener('webkitfullscreenchange', syncFullscreenClass);

        ensureRankingTicker();
        rankingRefreshTimer = setInterval(refreshRankingTicker, 1500);
        window.addEventListener('pagehide', () => clearInterval(rankingRefreshTimer), {once:true});

        // Carregar catálogo dinâmico (v17)
        // Sincronização Fragmentada de Elite (v22 - Míssil)
        if (songList) songList.innerHTML = "<div style='padding:20px; color:var(--text-muted);' id='syncMsg'><i class='fas fa-sync fa-spin'></i> Carregando catálogo...</div>";

        db.ref('config/catalog').on('value', async snap => {
            const config = snap.val();
            if (!config) return;

            try {
                const totalChunks = config.totalChunks || 0;
                const mode = config.mode || 'legacy';

                if (mode === 'fragmented' && totalChunks > 0) {
                    console.log(`Detectado catálogo fragmentado: ${totalChunks} partes.`);

                    const promises = [];
                    for (let i = 0; i < totalChunks; i++) {
                        promises.push(db.ref(`catalog_chunks/part_${i}`).once('value').then(s => s.val()));
                    }

                    const results = await Promise.all(promises);
                    const allSongs = results.flat().filter(s => s !== null);

                    processCatalogData(allSongs);
                    console.log(`Catálogo sincronizado: ${allSongs.length} músicas`);
                } else if (config.url) {
                    // Fallback para modo Storage Legacy se necessário
                    const blob = await firebase.storage().ref('songs.json').getBlob();
                    const text = await blob.text();
                    const data = JSON.parse(text);
                    processCatalogData(data.musicas);
                    console.log(`Catálogo Legacy: ${data.musicas.length} músicas`);
                }

                const msg = document.getElementById('syncMsg');
                if (msg) msg.remove();
            } catch (err) {
                console.warn("Falha na sincronização fragmentada:", err);
                loadLocalFallback();
            }
        });

        // showSyncToast removido - sincronização silenciosa

        function processCatalogData(musicas) {
            catalog = musicas.map(m => ({
                id: String(m.codigo).padStart(5, '0'),
                artist: m.artista,
                title: m.titulo,
                lyrics: m.inicioletra,
                estilo: m.estilo || 'Pop',
                idioma: m.idioma || 'BRA'
            }));
            renderSongs(catalog.slice(0, 50));
            initSearchUI();
        }

        function loadLocalFallback() {
            fetch('songs.json')
                .then(r => r.json())
                .then(data => processCatalogData(data.musicas))
                .catch(err => {
                    console.error("Erro fatal no catálogo:", err);
                    if (songList) songList.innerHTML = "<div style='color:red;padding:20px;'>ERRO: Falha ao carregar catálogo.</div>";
                });
        }

        // Autenticação do Host (Firebase)

        initHostAuth();

        // Botão de Play Principal (Barra Inferior)

        const btnPlay = document.querySelector('.btn-play');

        if (btnPlay) {

            btnPlay.onclick = () => {

                if (queue.length > 0 && !isPlaying) {

                    playNext();

                } else {

                    togglePlay();

                }

            };

        }

        // Monitoramento de Inatividade e Comandos
        const resetAllTimers = () => { resetIdleTimer(); showControlsUI(); };
        window.addEventListener('mousemove', resetAllTimers);
        window.addEventListener('mousedown', resetAllTimers);
        window.addEventListener('touchstart', resetAllTimers);
        window.addEventListener('keydown', (e) => {
            resetAllTimers();
            handleHotkey(e);
        });


        resetIdleTimer();

        // Handler de Upload de Fotos (Settings)

        const photoInput = document.getElementById('setPhotosInput');

        if (photoInput) {

            photoInput.onchange = handlePhotoUpload;

        }

        // Initial Load

        loadSettings();

        loadScreensaverImages(); // Carrega fotos salvas

        initSettingsUI();

        try {
            initAmbientPlayer();
        } catch (e) {
            console.warn("⚠️ Player ambiente bloqueado ou falhou:", e);
        }

        // Retoma o áudio após interação do usuário

        document.addEventListener('click', () => {
            // Garante que o AudioContext seja retomado em qualquer interação (Autoplay Policy)
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }



        }, { once: false });

        initMobileTabs();

        // Inicializa o slider de volume com o volume salvo
        const volRangeInput = document.getElementById('volRange');
        if (volRangeInput) {
            volRangeInput.value = currentVolume;
        }
    });

    // ─── Host Authentication Logic ────────────────────────────────────────────────

    window.openHostLogin = () => {

        document.getElementById('hostAuthOverlay').style.display = 'flex';

        document.getElementById('hostAuthOverlay').style.opacity = '1';

    };

    window.closeHostLogin = () => {

        const overlay = document.getElementById('hostAuthOverlay');

        overlay.style.opacity = '0';

        setTimeout(() => overlay.style.display = 'none', 300);

    };

    function initHostAuth() {

        const overlay = document.getElementById('hostAuthOverlay');

        const btnGoogle = document.getElementById('btnHostLogin');

        auth.onAuthStateChanged((user) => {

            if (user) {
                try {
                    hostUser = user;
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.style.display = 'none', 500);

                    const wrapper = document.getElementById('main_wrapper');
                    if (wrapper) { wrapper.style.display = 'grid'; window.scrollTo(0, 0); }

                    // Gravação segura no Banco de Dados
                    const safeName = user.displayName || (user.email ? user.email.split('@')[0] : "DJ");
                    db.ref('users/' + user.uid).update({
                        name: safeName,
                        email: user.email || "sem-email",
                        photo: user.photoURL || '',
                        isHost: true,
                        lastLogin: firebase.database.ServerValue.TIMESTAMP
                    }).catch(err => console.warn("Erro ao atualizar perfil do Host:", err));

                    // FIX: checkSubscriptionStatus não existe — usar checkSubscriptionAndStartRoom
                    const adminBtn = document.getElementById('adminMenuBtn');
                    if (adminBtn) {
                        adminBtn.style.display = 'flex';
                        adminBtn.textContent = user.email === 'douglasdrm@gmail.com'
                            ? 'ADMINISTRAÇÃO / MEU PAINEL DE DJ' : 'MEU PAINEL DE DJ';
                    }
                    // FIX: displayName pode ser null em alguns provedores
                    const firstName = (hostUser.displayName || safeName).split(' ')[0];
                    showToast(`🎤 Bem-vindo de volta, ${firstName}!`);

                    // Carrega estatísticas e personalização do DJ (v17)
                    db.ref(`users/${hostUser.uid}`).on('value', snap => {
                        const data = snap.val() || {};
                        hostUser.djName = data.djName || '';
                        hostUser.logoBase64 = data.logoBase64 || '';
                        hostUser.stats = data.stats || { totalSongsPlayed: 0 };
                        updateDJUI();
                    });

                    checkSubscriptionAndStartRoom();
                } catch (e) {
                    console.error("Erro crítico na inicialização do Host:", e);
                    alert("Ocorreu um erro ao entrar. Verifique o console ou tente novamente.");
                }
            } else {


                hostUser = null;

                isPremium = false;

                overlay.style.display = 'flex';

                overlay.style.opacity = '1';

                document.getElementById('main_wrapper').style.display = 'none';

            }

        });

        // FIX iOS Safari: detectar iPhone/iPad para usar Popup em vez de Redirect
        // O Safari bloqueia cookies de 3rd-party (ITP), quebrando signInWithRedirect
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (btnGoogle) {
            btnGoogle.onclick = () => {
                // Usar Popup por padrão para máxima confiabilidade visual
                auth.signInWithPopup(googleProvider).catch(err => {
                    console.error("Erro no Login Google:", err);
                    if (err.code === 'auth/popup-blocked') {
                        alert("O popup de login foi bloqueado. Por favor, permita popups para este site.");
                    } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                        alert("Erro ao fazer login: " + err.message);
                    }
                });
            };
        }

        // Processar resultado de redirect ao voltar da tela de login Google (apenas não-iOS)
        if (!isIOS) {
            auth.getRedirectResult().then(result => {
                if (result && result.user) {
                    console.log("✅ Login por redirect bem-sucedido:", result.user.email);
                }
            }).catch(err => {
                if (err.code && err.code !== 'auth/no-auth-event') {
                    console.warn("⚠️ Erro ao processar redirect de login:", err.code);
                }
            });
        }

    }

    let isHostSignUpMode = false;

    window.toggleHostAuthMode = function () {

        isHostSignUpMode = !isHostSignUpMode;

        const btnSubmit = document.getElementById('btnHostAuthSubmit');

        const switchArea = document.getElementById('hostAuthSwitch');

        if (isHostSignUpMode) {

            btnSubmit.innerText = "SOLICITAR ACESSO / CRIAR";

            switchArea.innerHTML = 'Já tem uma conta de DJ? <span onclick="toggleHostAuthMode()">Fazer Login na Cabine</span>';

        } else {

            btnSubmit.innerText = "ENTRAR NA CABINE";

            switchArea.innerHTML = 'Novo na plataforma? <span onclick="toggleHostAuthMode()">Solicitar Acesso / Criar Conta</span>';

        }

    }

    window.handleHostEmailAuth = function () {

        const email = document.getElementById('hostAuthEmail').value.trim();

        const pass = document.getElementById('hostAuthPassword').value;

        if (!email || !pass) { alert("Preencha e-mail e senha!"); return; }

        if (isHostSignUpMode) {
            auth.createUserWithEmailAndPassword(email, pass)
                .catch(err => {
                    let msg = "Erro ao criar conta: " + err.message;
                    if (err.code === 'auth/email-already-in-use') msg = "Este e-mail já está sendo usado por outro DJ.";
                    if (err.code === 'auth/invalid-email') msg = "E-mail inválido. Verifique o formato.";
                    if (err.code === 'auth/weak-password') msg = "Escolha uma senha mais forte (mínimo 6 caracteres).";
                    alert(msg);
                });
        } else {
            auth.signInWithEmailAndPassword(email, pass)
                .catch(err => {
                    let msg = "Erro ao entrar na cabine: " + err.message;
                    if (err.code === 'auth/user-not-found') msg = "Usuário não cadastrado. Verifique o e-mail ou crie uma conta.";
                    if (err.code === 'auth/wrong-password') msg = "Senha incorreta. Tente novamente ou use 'Esqueci a Senha'.";
                    if (err.code === 'auth/invalid-email') msg = "E-mail inválido. Verifique o formato.";
                    if (err.code === 'auth/user-disabled') msg = "Seu acesso à cabine foi desativado. Contate o administrador.";
                    alert(msg);
                });
        }

    }

    window.hostForgotPassword = function () {

        const email = document.getElementById('hostAuthEmail').value.trim();

        if (!email) { alert("Digite seu e-mail de DJ para receber o link."); return; }

        auth.sendPasswordResetEmail(email)

            .then(() => alert("Link de redefinição enviado ao seu e-mail!"))

            .catch(err => alert("Erro: " + err.message));

    }

    async function checkSubscriptionAndStartRoom() {
        db.ref('users/' + hostUser.uid).once('value', (snap) => {
            const userData = snap.val() || {};
            if (userData.isBanned) {
                alert("ACESSO NEGADO: Sua conta foi suspensa por violação dos termos de uso.");
                logoutHost();
                return;
            }

            const sub = userData.subscription;
            trialUsedMs = userData.trialUsedMs || 0;
            const hasWhatsapp = !!userData.whatsapp;

            if (isPremium || (sub && (sub.active === true || sub.status === 'active') && sub.expiresAt > Date.now())) {
                isPremium = true;
                subscriptionData = sub;
                startPremiumCountdown();
                openStartRoomModal(false, hasWhatsapp);
            } else {
                const isRealPlan = sub && sub.plan && sub.plan !== 'Free Trial' && sub.plan !== 'Gratuito';
                if (isRealPlan) {
                    const modal = document.getElementById('trialExpiredModal');
                    if (modal) {
                        modal.style.display = 'flex';
                        const title = modal.querySelector('h2');
                        const text = modal.querySelector('p');
                        const btnCancel = document.getElementById('modalCancel');
                        if (title) title.innerText = "ASSINATURA EXPIRADA";
                        if (text) text.innerHTML = `Seu plano <strong>${sub.plan}</strong> chegou ao fim. <br>Para continuar usando a Cabine do DJ sem interrupções, renove seu acesso agora.`;
                        if (btnCancel) btnCancel.style.display = 'none';
                    }
                    return;
                }

                if (trialUsedMs >= TRIAL_LIMIT_MS) {
                    document.getElementById('trialExpiredModal').style.display = 'flex';
                } else {
                    openStartRoomModal(true, hasWhatsapp);
                }

                if (!sub) {
                    db.ref('users/' + hostUser.uid + '/subscription').set({
                        active: false,
                        status: 'trial',
                        plan: 'Free Trial',
                        requestDate: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            }
        });
    }

    function openStartRoomModal(isTrial = false, hasWhatsapp = false) {
        const rawName = hostUser.displayName || (hostUser.email ? hostUser.email.split('@')[0] : "DJ");
        const firstName = rawName.split(' ')[0].toUpperCase();
        const title = isTrial ? "MODO DEGUSTAÇÃO (30 MINUTOS)" : `BEM-VINDO AO COMANDO, ${firstName}`;
        const subText = isTrial ? "<p style='color:#ffaa00; font-size:0.8rem; margin-bottom:10px;'>Você ainda possui tempo de teste gratuito. Aproveite!</p>" : "";
        const currentAmbient = settings.ambientUrl || "";

        let modalHTML = `
            ${subText}
            <div style="margin-bottom:15px; text-align:left;">Dê um nome para a sua sala de hoje:</div>
            <input type="text" id="newRoomName" placeholder="Ex: Aniversário do Douglas" autofocus style="width:100%; padding:15px; border-radius:15px; background:rgba(255,255,255,0.05); border:1px solid var(--accent-primary); color:white; text-align:center; margin-bottom:20px;">

            <div style="margin-bottom:8px; text-align:left; font-size:0.9rem;">
                <i class="fab fa-youtube" style="color:#ff0000; margin-right:6px;"></i> Música Ambiente da Tela de Descanso:
            </div>
            <input type="text" id="newRoomAmbientUrl" placeholder="Ex: https://www.youtube.com/watch?v=..." value="${currentAmbient}" style="width:100%; padding:12px 15px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:white; font-size:0.85rem; margin-bottom:6px;">
            <p style="font-size:0.7rem; opacity:0.6; text-align:left; margin-bottom:20px;">Link do YouTube para a tela de descanso. Deixe em branco para o padrão.</p>
        `;

        if (!hasWhatsapp) {
            modalHTML += `
                <div style="margin-bottom:15px; text-align:left;">Confirme seu WhatsApp (Lead):</div>
                <input type="tel" id="newRoomWhatsapp" placeholder="(00) 00000-0000" maxlength="15" oninput="handlePhoneInput(this)" style="width:100%; padding:15px; border-radius:15px; background:rgba(255,255,255,0.05); border:1px solid var(--accent-primary); color:white; text-align:center;">
                <p style="font-size:0.65rem; opacity:0.5; margin-top:8px;">Obrigatório para iniciar a sala.</p>
            `;
        }

        showModal(title, modalHTML, () => {
            const name = document.getElementById('newRoomName').value;
            const waInput = document.getElementById('newRoomWhatsapp');
            const whatsapp = waInput ? waInput.value : null;

            if (!hasWhatsapp && (!whatsapp || whatsapp.replace(/\D/g, '').length < 10)) {
                alert("Por favor, informe um WhatsApp válido para continuar.");
                checkSubscriptionAndStartRoom(); // Reabre o processo
                return;
            }

            const rawName = hostUser.displayName || (hostUser.email ? hostUser.email.split('@')[0] : "DJ");
            currentRoomName = name || "Festa de " + rawName.split(' ')[0];

            // Atualiza e persiste a Música Ambiente configurada na tela inicial
            const ambientInput = document.getElementById('newRoomAmbientUrl');
            if (ambientInput) {
                const newAmbient = ambientInput.value.trim();
                settings.ambientUrl = newAmbient;
                localStorage.setItem('karaokeSettings', JSON.stringify(settings));
                const setAmbientElem = document.getElementById('setAmbientUrl');
                if (setAmbientElem) setAmbientElem.value = newAmbient;
            }

            if (whatsapp) {
                db.ref('users/' + hostUser.uid + '/whatsapp').set(whatsapp);
            }

            if (isTrial) startTrialCountdown();
            startRoom(currentRoomName);

            // Inicia música ambiente se não houver reprodução ativa e fila vazia
            if (!isPlaying && queue.length === 0) {
                checkAmbientMusic();
            }
        });
    }

    let hasAlerted5Min = false;

    function startTrialCountdown() {
        if (isPremium) {
            console.log("🎤 Usuário Premium detectado. Ignorando Trial Timer.");
            return;
        }

        console.log("⏳ Iniciando contador de Trial...");

        const banner = document.getElementById('trialTimerBanner');
        const timeText = document.getElementById('trialTimeRemaining');

        if (banner) banner.style.display = 'flex';
        if (trialTimer) clearInterval(trialTimer);

        trialTimer = setInterval(() => {
            trialUsedMs += 5000;
            const remaining = Math.max(0, TRIAL_LIMIT_MS - trialUsedMs);
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

            if (timeText) {
                timeText.innerText = timeStr;
                // Alerta discreto aos 5 minutos
                if (mins === 5 && secs <= 5 && !hasAlerted5Min) {
                    hasAlerted5Min = true;
                    showToast("Atenção: Seu tempo de teste gratuito vence em 5 minutos!");
                    banner.style.animation = "pulse-warning 1s infinite";
                    banner.style.borderColor = "#ffaa00";
                }
                // Alerta crítico ao 1 minuto
                if (mins === 1 && secs <= 5) {
                    banner.style.animation = "pulse-danger 0.5s infinite";
                    banner.style.borderColor = "#ff4444";
                }
            }

            if (trialUsedMs % 30000 === 0 || remaining <= 0) {
                db.ref('users/' + hostUser.uid + '/trialUsedMs').set(trialUsedMs);
            }

            if (remaining <= 0) {
                clearInterval(trialTimer);
                document.getElementById('trialExpiredModal').style.display = 'flex';
                if (typeof stopSong === 'function') stopSong();
            }
        }, 5000);
    }

    // NOVO: Contador Regressivo para Usuários Premium (v22)
    function startPremiumCountdown() {
        if (!isPremium || !subscriptionData || !subscriptionData.expiresAt) return;

        console.log("💎 Iniciando monitor de assinatura Premium...");
        const banner = document.getElementById('premiumTimerBanner');
        const timeText = document.getElementById('premiumTimeRemaining');

        if (premiumTimer) clearInterval(premiumTimer);

        premiumTimer = setInterval(() => {
            const now = Date.now();
            const remaining = subscriptionData.expiresAt - now;

            if (remaining <= 0) {
                clearInterval(premiumTimer);
                alert("⚠️ SEU TEMPO DE ACESSO EXPIROU!\nA cabine será desconectada.");
                location.reload();
                return;
            }

            const totalHours = (subscriptionData.expiresAt - subscriptionData.lastUpdate) / 3600000;
            const isShortPlan = totalHours <= 48;

            if (isShortPlan || remaining < (2 * 60 * 60 * 1000)) {
                if (banner && banner.style.display !== 'flex') banner.style.display = 'flex';
                if (timeText) {
                    const h = Math.floor(remaining / 3600000);
                    const m = Math.floor((remaining % 3600000) / 60000);
                    const s = Math.floor((remaining % 60000) / 1000);
                    if (h > 0) {
                        timeText.innerText = `${h}h ${String(m).padStart(2, '0')}m`;
                    } else {
                        timeText.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    }
                }
            } else {
                if (banner) banner.style.display = 'none';
            }
        }, 1000);
    }

    // NOVO: Modal de Detalhes da Assinatura (v22)
    window.openSubscriptionModal = function () {
        const modal = document.getElementById('subscriptionModal');
        const content = document.getElementById('subDetailsContent');
        if (!modal || !content) return;

        if (!isPremium || !subscriptionData) {
            content.innerHTML = `
                <div style="color:#ff4444; margin-bottom:15px;"><i class="fas fa-times-circle" style="font-size:2rem;"></i></div>
                <h3 style="margin-bottom:10px;">Sem Assinatura Ativa</h3>
                <p style="font-size:0.9rem; opacity:0.7;">Você está usando o Modo de Degustação Gratuito.</p>
            `;
        } else {
            const expDate = new Date(subscriptionData.expiresAt).toLocaleString('pt-BR');
            const now = Date.now();
            const remaining = subscriptionData.expiresAt - now;
            let timeLabel = "";
            if (remaining > 0) {
                const days = Math.floor(remaining / 86400000);
                const hours = Math.floor((remaining % 86400000) / 3600000);
                if (days > 0) timeLabel = `${days} dias e ${hours}h restantes`;
                else timeLabel = `${hours}h e ${Math.floor((remaining % 3600000) / 60000)}min restantes`;
            }
            content.innerHTML = `
                <div style="color:#ffd700; margin-bottom:15px;"><i class="fas fa-crown" style="font-size:3rem; filter:drop-shadow(0 0 10px rgba(255,215,0,0.5));"></i></div>
                <h3 style="margin-bottom:5px; color:#ffd700;">PLANO ${subscriptionData.plan.toUpperCase()}</h3>
                <p style="font-size:1.1rem; font-weight:700; margin-bottom:15px;">ATIVO ✅</p>
                <div style="text-align:left; background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; margin-bottom:10px;">
                    <div style="font-size:0.8rem; opacity:0.6;">Expira em:</div>
                    <div style="font-weight:600;">${expDate}</div>
                    <div style="font-size:0.85rem; color:#00f2ff; margin-top:5px;">${timeLabel}</div>
                </div>
            `;
        }
        modal.style.display = 'flex';
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.style.display = 'none';
    }

    function startRoom(name) {
        PartyHost.begin(name);

        // Remove sala anterior deste host (se existir) para não acumular

        if (currentRoomCode) {

            db.ref('salas/' + currentRoomCode).remove();

            db.ref(`salas/${currentRoomCode}/active_users`).off(); // Desliga listener anterior

        }

        // Zera sugestões de nomes de cantores da festa anterior

        activeUsers = {};

        recentSingers = [];

        localStorage.removeItem('recentSingers');

        // Gera ou recupera código de sala (v23)
        const savedCode = localStorage.getItem('lastRoomCode');
        if (savedCode && savedCode.length === 5) {
            currentRoomCode = savedCode;
        } else {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ2346789";
            currentRoomCode = "";
            for (let i = 0; i < 5; i++) {
                currentRoomCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            localStorage.setItem('lastRoomCode', currentRoomCode);
        }

        // Salva info da sala não Firebase

        db.ref('salas/' + currentRoomCode + '/info').set({

            name: name,

            hostId: hostUser.uid,

            hostName: hostUser.displayName,

            hostPhoto: hostUser.photoURL || '',

            timestamp: firebase.database.ServerValue.TIMESTAMP

        });

        // Remove sala ao fechar a janela

        db.ref('salas/' + currentRoomCode).onDisconnect().remove();

        // Atualiza UI — nome elegante, código bem legível (v13)

        const roomBadge = document.getElementById('hostRoomCode');

        if (roomBadge) {

            roomBadge.textContent = name;

        }

        console.log(`🚀 [v12] Sala aberta: [${currentRoomCode}] enviando para salas/${currentRoomCode}/queue_sync`);

        // Gera QR Code

        updateQrCodes();

        // Começa a escutar pedidos e usuários

        ChallengeHost.begin();
        SocialHost.begin();
        startMobilePolling();

        startActiveUsersListener();
        initReactionListener();

        // O microfone só é aberto durante a pontuação ou um teste explícito.

        // SINCRONIA INICIAL (v11)

        renderQueue();

        // Tour do Host: inicia AQUI, após sala criada e dashboard visível

        if (typeof startHostTour === 'function') {

            setTimeout(() => startHostTour(), 800);

        }

    }

    function startActiveUsersListener() {

        if (!currentRoomCode) return;

        db.ref(`salas/${currentRoomCode}/active_users`).on('value', snap => {

            activeUsers = snap.val() || {};

            console.log("Usuários ativos atualizados:", activeUsers);

        });

        // Sincronização de Progresso (Tempo do vídeo)

        setInterval(() => {

            const v = document.getElementById('mainVideo');

            if (v && isPlaying) {

                db.ref(`salas/${currentRoomCode}/now_playing/time`).set({

                    current: v.currentTime,

                    total: v.duration

                });

            }

        }, 2000);

    }

    function updateQrCodes() {

        let pathStr = window.location.pathname;

        if (pathStr.endsWith('index.html') || pathStr.endsWith('cabine.html') || pathStr.endsWith('cabine-pc.html')) {

            pathStr = pathStr.substring(0, pathStr.lastIndexOf('/') + 1);

        } else if (!pathStr.endsWith('/')) {

            pathStr += '/';

        }

        const mobileUrl = window.location.origin + pathStr + 'mobile.html?room=' + currentRoomCode;

        const mobileLink = document.getElementById("qrMobileLink");
        if (mobileLink) mobileLink.href = mobileUrl;
        console.log("URL Mobile:", mobileUrl);

        // QR Code de tela cheia (canto inferior direito)

        const qrFs = document.getElementById('qrcode-fs');

        if (qrFs && typeof QRCode !== 'undefined') {

            try { qrFs.innerHTML = ''; new QRCode(qrFs, { text: mobileUrl, width: 160, height: 160, colorDark: "#000000", colorLight: "#ffffff" }); } catch (e) { }

        }

        // Exibe código da sala em texto (alternativa ao QR para projetores)
        const roomCodeEl = document.getElementById('qrRoomCodeFs');
        if (roomCodeEl && currentRoomCode) {
            roomCodeEl.replaceChildren();
            const caption = document.createElement("span"); caption.textContent = "Código da sala";
            const code = document.createElement("strong"); code.textContent = currentRoomCode;
            roomCodeEl.append(caption, code);
            roomCodeEl.style.display = 'block';
        }

    }

    async function logoutHost() {
        try { await PartyHost.end(); } catch (error) {
            if (!confirm("Não foi possível salvar o resumo. Sair mesmo assim?")) return;
        }

        if (currentRoomCode) {

            // Opcional: remover sala ao sair? Melhor manter se for um refresh acidental.

            // Mas podemos marcar como offline.

            db.ref('salas/' + currentRoomCode + '/info/status').set('offline');

        }

        SocialHost.end();
        await ChallengeHost.end();
        stopMic();
        auth.signOut().then(() => {

            window.location.reload();

        });

    }

    SocialHost.init({db, user: () => hostUser, room: () => currentRoomCode, mount: () => document.getElementById('tab-queue'),
        autoApproveAudio: () => settings.autoApproveVoiceMessages === true,
        busy: () => isPlaying || !!currentCallAudio || !!currentCallTimer, pauseAmbient: stopAmbientMusic, resumeAmbient: checkAmbientMusic});

    ChallengeHost.init({db, user: () => hostUser, room: () => currentRoomCode,
        catalog: () => catalog, users: () => activeUsers, mount: () => document.getElementById('tab-queue')});

    PartyHost.init({
        db, user: () => hostUser, room: () => currentRoomCode, members: () => activeUsers, votes: () => currentVotes, song: () => isPlaying ? queue[0] : null, pitch: () => currentPitch, logout: logoutHost,
        setPitch(value) {
            currentPitch = value;
            if (pitchShifter) pitchShifter.setPitchOffset(value);
            const label = document.querySelector(".tone-control .control-label");
            const steps = Math.round((value - 1) / 0.059);
            if (label) label.textContent = `TOM: ${steps > 0 ? "+" : ""}${steps} (salvo)`;
        }
    });

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    function normalizeStr(str) {

        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

    }

    // ─── Settings Logic ──────────────────────────────────────────────────────────

    function loadSettings() {

        const saved = localStorage.getItem('karaokeSettings');

        if (saved) {

            try {

                settings = { ...settings, ...jsonParseSafe(saved) };

            } catch (e) { }

        }

        if (settings.playIntroCall === undefined) {
            settings.playIntroCall = true;
        }

    }

    function jsonParseSafe(str) {

        try { return JSON.parse(str); } catch (e) { return {}; }

    }

    function initSettingsUI() {

        const btnSettings = document.getElementById('btnSettings');

        const modalSettings = document.getElementById('settingsModal');

        const btnClose = document.getElementById('settingsClose');

        const btnSave = document.getElementById('settingsSave');

        if (btnSettings) btnSettings.onclick = openSettings;

        if (btnClose) btnClose.onclick = closeSettings;

        if (btnSave) btnSave.onclick = saveSettings;

        // Fechar ao clicar fora

        window.addEventListener('click', (e) => {

            if (e.target === modalSettings) closeSettings();

        });

    }

    function closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
        stopMic('calibration');
    }

    function openSettings() {

        const modal = document.getElementById('settingsModal');

        if (!modal) return;


        document.getElementById('setAutoApproveVoiceMessages').checked = settings.autoApproveVoiceMessages === true;
        const introCallInput = document.getElementById('setPlayIntroCall');
        if (introCallInput) introCallInput.checked = settings.playIntroCall !== false;

        document.getElementById('setAmbientUrl').value = settings.ambientUrl || "";
        document.getElementById('setAmbientRankingMode').value = settings.ambientRankingMode || "balanced";

        document.getElementById('setScreensaverTime').value = settings.screensaverTimeout || 30000;

        // Nãovas Configurações

        document.getElementById('setEnableScore').checked = settings.enableScore !== false;

        if (settings.scoreMode === 'random') document.getElementById('modeRandom').checked = true;

        else document.getElementById('modeMic').checked = true;

        document.getElementById('setMinRandomScore').value = settings.minRandomScore || 75;

        const diffRadio = modal.querySelector(`input[name="difficulty"][value="${settings.difficulty || 'normal'}"]`);
        if (diffRadio) diffRadio.checked = true;

        // CAMPOS DE PERSONALIZAÇÃO (v17)
        document.getElementById('setDjName').value = hostUser.djName || "";
        const logoStatus = document.getElementById('logoStatus');
        if (hostUser.logoBase64 && logoStatus) logoStatus.innerText = "✅ Logo carregada e persistente.";

        renderPhotoPreviews(); // Mostra fotos salvas

        modal.style.display = 'flex';

        const testMic = document.getElementById('testMicButton');
        if (testMic) testMic.onclick = async () => {
            if (micReasons.has('calibration')) { stopMic('calibration'); return; }
            await startMic('calibration');
            if (analyzer) startCalibMic();
        };
        if (analyzer) startCalibMic();

    }

    let calibInterval = null;

    function startCalibMic() {

        const bar = document.getElementById('calibBar');

        const valText = document.getElementById('calibVolVal');

        if (!bar || !valText) return;

        if (calibInterval) clearInterval(calibInterval);

        calibInterval = setInterval(() => {

            if (!analyzer || document.getElementById('settingsModal').style.display === 'none') {

                clearInterval(calibInterval);

                return;

            }

            analyzer.getByteFrequencyData(dataArray);

            const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;

            const percentage = Math.min(100, (avg / 140) * 100);

            bar.style.width = percentage + '%';

            valText.innerText = Math.floor(avg);

        }, 50);

    }

    async function saveSettings() {


        const playIntro = document.getElementById('setPlayIntroCall') ? document.getElementById('setPlayIntroCall').checked : (settings.playIntroCall !== false);

        const ambient = document.getElementById('setAmbientUrl').value;
        const ambientRankingMode = document.getElementById('setAmbientRankingMode').value;

        const ssTimeout = parseInt(document.getElementById('setScreensaverTime').value);

        const enableScore = document.getElementById('setEnableScore').checked;

        const scoreMode = document.querySelector('input[name="scoreMode"]:checked').value;

        const minRandom = parseInt(document.getElementById('setMinRandomScore').value);

        const difficulty = document.querySelector('input[name="difficulty"]:checked').value;

        settings = {

            ...settings,

            autoFullscreen: false,

            playIntroCall: playIntro,
            autoApproveVoiceMessages: document.getElementById('setAutoApproveVoiceMessages').checked,

            ambientUrl: ambient,

            ambientRankingMode,

            screensaverTimeout: ssTimeout,

            enableScore,

            scoreMode,

            minRandomScore: minRandom,

            difficulty

        };

        // SALVA PERSONALIZAÇÃO NO FIREBASE (v17)
        const djName = document.getElementById('setDjName').value.trim();
        db.ref(`users/${hostUser.uid}`).update({
            djName,
            logoBase64: hostUser.logoBase64 || ""
        });

        localStorage.setItem('karaokeSettings', JSON.stringify(settings));

        closeSettings();
        if (settings.enableScore === false || settings.scoreMode !== 'mic') stopMic('song');
        else if (isPlaying && !document.getElementById('mainVideo')?.paused) startMic('song');

        showToast("Configurações salvas com sucesso!");

        resetIdleTimer(); // Recalcula inatividade

        if (!isPlaying) checkAmbientMusic();

    }

    // ─── Fullscreen & Screensaver Implementation ──────────────────────────────────

    function toggleFullscreen() {

        const container = document.getElementById('playerContainer');

        if (!container) return;

        if (!document.fullscreenElement) {

            if (container.requestFullscreen) {
                container.requestFullscreen().then(() => {
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(() => { });
                    }
                }).catch(() => { });
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
                setTimeout(() => {
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(() => { });
                    }
                }, 500);
            }

        } else {

            if (document.exitFullscreen) document.exitFullscreen();

        }

    }

    function resetIdleTimer() {

        stopScreensaver(); // Esconde se estiver ativo

        clearTimeout(idleTimeout);

        // Se timeout for 0, nunca ativa

        if (settings.screensaverTimeout === 0) return;

        // Não ativa se estiver tocando música ou mexendo não player

        if (isPlaying) return;

        idleTimeout = setTimeout(startScreensaver, settings.screensaverTimeout);
    }

    // NOVA FUNÇÃO: Reseta temporizador de controles (Visibilidade)
    function showControlsUI() {
        const wrapper = document.querySelector('.compact-controls-wrapper');
        if (wrapper) {
            wrapper.classList.remove('autohide');
            // Reinicia o autohide se estiver tocando (Apenas PC)
            if (isPlaying && window.innerWidth > 900) {
                if (window.controlsTimeout) clearTimeout(window.controlsTimeout);
                window.controlsTimeout = setTimeout(() => {
                    if (isPlaying) {
                        const w = document.querySelector('.compact-controls-wrapper');
                        if (w) w.classList.add('autohide');
                    }
                }, 3000);
            }
        }
    }


    function startScreensaver() {

        if (isPlaying || settings.screensaverTimeout === 0 || screensaverImages.length === 0) return;

        const layer = document.getElementById('screensaver');

        if (!layer) return;

        layer.innerHTML = "";

        layer.style.display = "flex";

        layer.style.opacity = "1";

        // Prepara imagens não layer

        screensaverImages.forEach((src, idx) => {

            const img = document.createElement('img');

            img.src = src;

            img.className = `ss-img ${idx === 0 ? 'active' : ''}`;

            layer.appendChild(img);

        });

        screensaverIndex = 0;

        clearInterval(screensaverInterval);

        screensaverInterval = setInterval(() => {

            const imgs = layer.querySelectorAll('.ss-img');

            if (imgs.length < 2) return;

            imgs[screensaverIndex].classList.remove('active');

            screensaverIndex = (screensaverIndex + 1) % imgs.length;

            imgs[screensaverIndex].classList.add('active');

        }, 6000); // Troca a cada 6 segundos

    }

    function stopScreensaver() {

        const layer = document.getElementById('screensaver');

        if (layer && layer.style.display !== 'none') {

            layer.style.opacity = "0";

            setTimeout(() => { layer.style.display = "none"; layer.innerHTML = ""; }, 500);

        }

        clearInterval(screensaverInterval);

    }

    // ─── Photo Management ─────────────────────────────────────────────────────────

    function handlePhotoUpload(e) {

        const files = Array.from(e.target.files);

        let loaded = 0;

        files.forEach(file => {

            const reader = new FileReader();

            reader.onload = (ev) => {

                screensaverImages.push(ev.target.result);

                loaded++;

                if (loaded === files.length) {

                    saveScreensaverImages();

                    renderPhotoPreviews();

                }

            };

            reader.readAsDataURL(file);

        });

        e.target.value = ""; // limpa para re-upload

    }

    // NOVA FUNÇÃO: Upload de Logo (v17)
    function handleLogoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 512000) { // 500KB
            alert("Erro: A logo deve ter no máximo 500KB para não sobrecarregar o painel.");
            e.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            hostUser.logoBase64 = ev.target.result;
            const status = document.getElementById('logoStatus');
            if (status) status.innerText = "✅ Logo pronta! Não esqueça de SALVAR.";
            updateDJUI();
        };
        reader.readAsDataURL(file);
    }

    // NOVA FUNÇÃO: Atualiza Identidade Visual (v17)
    function updateDJUI() {
        if (!hostUser) return;

        // 1. Stats na Cabine
        const statSongs = document.getElementById('djStatSongs');
        const statGenre = document.getElementById('djStatGenre');
        if (statSongs) statSongs.innerText = hostUser.stats?.totalSongsPlayed || 0;
        if (statGenre) {
            const genres = hostUser.stats?.genres || {};
            const topGenre = PartyCore.genreRanking(genres)[0]?.[0] || 'Sem dados';
            statGenre.innerText = topGenre.toUpperCase();
        }

        // 2. Nome DJ no Rodapé
        const footer = document.getElementById('djFooter');
        const footerName = document.getElementById('djFooterName');
        const safeDjName = hostUser.djName || hostUser.displayName || "DJ";
        if (footer && footerName) {
            footerName.innerText = safeDjName;
            footer.style.display = hostUser.djName ? 'flex' : 'none';
        }

        // 3. Logo/Watermark
        const watermark = document.getElementById('djWatermark');
        if (watermark) {
            watermark.innerHTML = hostUser.logoBase64 ? `<img src="${hostUser.logoBase64}" alt="Logo Profile">` : '';
        }

        // 4. Logo no Screensaver
        const ss = document.getElementById('screensaver');
        if (ss && hostUser.logoBase64) {
            // Injeta no canto ou centro do screensaver opcionalmente
        }
    }

    function saveScreensaverImages() {

        // Tenta salvar, mas limita se o localStorage estiver cheio (~5MB)

        try {

            localStorage.setItem('karaokeScreensaverPhotos', JSON.stringify(screensaverImages));

        } catch (e) {

            alert("O limite de armazenamento de fotos foi atingido! Tente usar fotos menãores ou remover algumas.");

            screensaverImages.pop(); // Remove a última que causou erro

        }

    }

    function loadScreensaverImages() {

        const saved = localStorage.getItem('karaokeScreensaverPhotos');

        if (saved) {

            try {

                screensaverImages = JSON.parse(saved);

            } catch (e) { screensaverImages = []; }

        }

    }

    function renderPhotoPreviews() {

        const grid = document.getElementById('photoPreviewGrid');

        if (!grid) return;

        grid.innerHTML = "";

        screensaverImages.forEach((src, idx) => {

            const div = document.createElement('div');

            div.className = "photo-preview-item";

            div.innerHTML = `

            <img src="${src}">

            <div class="photo-remove" onclick="removePhoto(${idx})">×</div>

        `;

            grid.appendChild(div);

        });

    }

    function removePhoto(idx) {

        screensaverImages.splice(idx, 1);

        saveScreensaverImages();

        renderPhotoPreviews();

    }

    function playSfx(key) {
        if (!sounds[key]) {
            console.error("❌ [SFX] Chave não encontrada:", key);
            return;
        }
        if (ambientVideo && !ambientVideo.paused) return;
        if (currentAudio) {
            try { currentAudio.pause(); } catch (e) { }
            currentAudio = null;
        }

        console.log("🎵 [SFX] Tentando carregar:", sounds[key]);
        currentAudio = new Audio(sounds[key]);
        currentAudio.play().then(() => {
            console.log("🔊 [SFX] Tocando agora:", key);
        }).catch(e => {
            console.warn("⚠️ [SFX] Bloqueio do navegador ou arquivo ausente:", key, e.message);
        });
    }

    function formatTime(seconds) {

        if (isNaN(seconds)) return "00:00";

        const m = Math.floor(seconds / 60);

        const s = Math.floor(seconds % 60);

        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    }

    // ─── Render ───────────────────────────────────────────────────────────────────

    function renderSongs(songs) {

        if (!songList) return;

        songList.innerHTML = '';

        songs.forEach(song => {

            const div = document.createElement('div');

            div.className = 'song-item';

            div.innerHTML = `

            <div class="song-info">

                <strong>${song.artist}</strong>

                <span>${song.title}</span>${song.lyrics ? ` <span class="lyrics-preview">${song.lyrics}</span>` : ''}

            </div>

            <div class="song-actions">

                <button class="btn-song-play" onclick="event.stopPropagation(); addToQueue('${song.id}', true)" title="Tocar agora"><i class="fas fa-play"></i></button>

                <button class="btn-song-queue" onclick="event.stopPropagation(); addToQueue('${song.id}', false)" title="Adicionar à fila"><i class="fas fa-plus"></i></button>

            </div>

        `;

            songList.appendChild(div);

        });

    }

    function renderQueue() {

        if (!queueList) return;

        queueList.innerHTML = '';

        // Sincroniza fila usando o método infalível do JSON String (v13)

        // Como o 'Now Playing' funciona, vamos usar a mesma lógica de enviar um único dado atômico.

        if (currentRoomCode) {

            const queuePayload = JSON.stringify(queue);

            db.ref(`salas/${currentRoomCode}/queue_v13`).set(queuePayload)

                .catch(err => console.error("â Œ [v13] Erro de sinc:", err));

        }

        queue.forEach((item, index) => {

            const div = document.createElement('div');

            div.className = 'queue-item';

            div.innerHTML = `

            <div class="rank">${index + 1}</div>

            <div class="info">

                <div class="name">${item.singer}</div>

                <div class="song">${item.title}</div>

            </div>

            <div class="queue-actions">

                ${index > 1 ? `<i class="fas fa-chevron-up" onclick="moveQueue(${index}, -1)"></i>` : ''}

                ${index > 0 && index < queue.length - 1 ? `<i class="fas fa-chevron-down" onclick="moveQueue(${index}, 1)"></i>` : ''}

                <i class="fas fa-trash trash-btn" onclick="removeFromQueue(${index})"></i>

            </div>

        `;

            queueList.appendChild(div);

        });

        updateFullscreenQueue();
        updateWaitTimeUI();
    }

    function updateWaitTimeUI() {
        const el = document.getElementById('queueWaitTime');
        if (!el) return;

        if (queue.length <= 1) {
            el.style.display = 'none';
            return;
        }

        // Média de 4 min por música (descontando quem já está no palco)
        const totalMinutes = (queue.length - 1) * 4;
        el.innerText = `⏳ ESPERA ESTIMADA: ${totalMinutes} MIN`;
        el.style.display = 'inline-block';
    }

    // ─── Search & Shuffle UI ──────────────────────────────────────────────────────

    function initSearchUI() {

        if (songSearch) {

            songSearch.addEventListener('input', (e) => {

                const term = normalizeStr(e.target.value);

                if (term.length < 2) { renderSongs(catalog.slice(0, 50)); return; }

                const filtered = catalog.filter(s =>

                    (s.id && s.id.includes(term)) ||

                    normalizeStr(s.title).includes(term) ||

                    normalizeStr(s.artist).includes(term) ||

                    normalizeStr(s.lyrics).includes(term)

                ).slice(0, 100);

                renderSongs(filtered);

            });

        }

        const btnShuffle = document.getElementById('btnShuffle');

        if (btnShuffle) {

            btnShuffle.onclick = () => {

                if (catalog.length < 3) return;

                const shuffled = [...catalog].sort(() => 0.5 - Math.random());

                renderSongs(shuffled.slice(0, 5));

            };

        }

        const btnHelp = document.getElementById('btnHelp');

        if (btnHelp) {

            btnHelp.onclick = () => {

                const legend = document.getElementById('hotkeyLegend');

                if (legend) legend.style.display = legend.style.display === 'block' ? 'none' : 'block';

            };

        }

        // Play button

        const btnPlay = document.querySelector('.btn-play');

        if (btnPlay) btnPlay.onclick = togglePlay;

    }

    // ─── Queue Management ─────────────────────────────────────────────────────────

    function addToQueue(id, playNow = false) {

        const song = catalog.find(s => s.id === id);

        if (!song) return;

        // Prepara chips: Usuários Logados + Recentes

        const chipsData = [];

        // 1. Logados

        Object.values(activeUsers).forEach(u => {

            chipsData.push({ name: u.name, photo: u.photo, type: 'active' });

        });

        // 2. Recentes (que não estejam já nos logados)

        recentSingers.forEach(name => {

            if (!chipsData.find(c => c.name === name)) {

                chipsData.push({ name: name, type: 'recent' });

            }

        });

        if (isPlaying) {

            showCompactSingerInput(song, playNow);

        } else {

            showModal(`CANTOR PARA: ${song.title}`, `

            <div class="modal-artist">${song.artist}</div>

            <div class="user-chips-container" id="modalChips"></div>

            <input type="text" id="singerName" placeholder="Seu Nome / Mesa" autofocus>

        `, (name) => {

                const finalName = (name && name.trim()) ? name.trim() : 'Cantor Surpresa';

                // Salva nos recentes se for manual e não "Surpresa"

                if (finalName !== 'Cantor Surpresa' && !Object.values(activeUsers).find(u => u.name === finalName)) {
                    updateRecentSingers(finalName);
                }

                // INCREMENTA HORÁRIO DE PICO (v16)
                incrementPeakHour();

                enqueue({ ...song, singer: finalName, time: Date.now() }, playNow);
            }, chipsData);

        }

    }

    function updateRecentSingers(name) {

        recentSingers = recentSingers.filter(n => n !== name);

        recentSingers.unshift(name);

        recentSingers = recentSingers.slice(0, 10);

        localStorage.setItem('recentSingers', JSON.stringify(recentSingers));

    }

    function showCompactSingerInput(song, playNow) {

        document.getElementById('compactSingerForm')?.remove();

        const form = document.createElement('div');

        form.id = 'compactSingerForm';

        form.className = 'compact-singer-form';

        // Prepara chips: Logados + Recentes

        const chipsData = [];

        Object.values(activeUsers).forEach(u => chipsData.push({ name: u.name, photo: u.photo, type: 'active' }));

        recentSingers.forEach(name => { if (!chipsData.find(c => c.name === name)) chipsData.push({ name: name, type: 'recent' }); });

        form.innerHTML = `

        <div class="csf-inner">

            <span class="csf-label">PARA: <strong>${song.title}</strong></span>

            <input type="text" id="compactSingerName" class="csf-input" placeholder="Nome..." autofocus autocomplete="off">

            <div id="compactChips"></div>

            <button class="csf-btn" onclick="confirmCompactSinger('${song.id}', ${playNow})"><i class="fas fa-plus"></i></button>

            <button class="csf-close-text" onclick="document.getElementById('compactSingerForm').remove()">×</button>

        </div>

    `;

        document.getElementById('playerContainer').appendChild(form);

        // Renderiza chips não modo compacto (horizontal mini)

        const cc = form.querySelector('#compactChips');

        if (cc) {

            chipsData.slice(0, 4).forEach(c => {

                const el = document.createElement('div');

                el.className = `user-chip mini ${c.type}`;

                el.innerHTML = `${c.name}`;

                el.onclick = () => { document.getElementById('compactSingerName').value = c.name; document.getElementById('compactSingerName').focus(); };

                cc.appendChild(el);

            });

        }

        setTimeout(() => document.getElementById('compactSingerName')?.focus(), 100);

        document.getElementById('compactSingerName').onkeydown = (e) => {

            if (e.key === 'Enter') confirmCompactSinger(song.id, playNow);

            if (e.key === 'Escape') form.remove();

        };

    }

    function confirmCompactSinger(id, playNow) {

        const input = document.getElementById('compactSingerName');

        const name = (input && input.value.trim()) ? input.value.trim() : 'Cantor Surpresa';

        const song = catalog.find(s => s.id === id);

        if (song) {

            // Registra o cantor manual como usuário ativo na sala para o Mobile ver

            if (currentRoomCode) {

                db.ref(`salas/${currentRoomCode}/active_users/${btoa(encodeURIComponent(name)).replace(/=/g, '')}`).set({

                    name: name,

                    photo: '',

                    type: 'local',

                    timestamp: firebase.database.ServerValue.TIMESTAMP

                });

            }

            if (name !== 'Cantor Surpresa' && !Object.values(activeUsers).find(u => u.name === name)) {
                updateRecentSingers(name);
            }

            // INCREMENTA HORÁRIO DE PICO (v16)
            incrementPeakHour();

            enqueue({ ...song, singer: name, time: Date.now() }, playNow);
        }

        document.getElementById('compactSingerForm')?.remove();

    }

    function rebalanceQueue() {

        if (queue.length <= 1) return;

        // 1. Isolar quem está não palco (Índice 0)

        let currentSong = isPlaying ? queue[0] : null;

        let restOfQueue = isPlaying ? queue.slice(1) : [...queue];

        // 2. FORÇAR conversão para número e normalizar nomes

        restOfQueue.forEach(item => {

            item.time = Number(item.time) || Date.now();

            item.singer = String(item.singer || "CONVIDADO").trim().toUpperCase();

        });

        // 3. PRIMEIRO: Ordenar estritamente por tempo de pedido (quem chegou antes)

        // Isso evita que o PUSH do DJ ou do Mobile flutue para o topo

        restOfQueue.sort((a, b) => a.time - b.time);

        // 4. MAPEAR Rodadas (Singer Count)

        const singerCount = {};

        if (currentSong) {

            const stageSinger = String(currentSong.singer || "CONVIDADO").trim().toUpperCase();

            singerCount[stageSinger] = 1;

        }

        // 5. ATRIBUIR Rodadas baseadas na ordem de chegada

        restOfQueue = restOfQueue.map((item) => {

            const name = item.singer;

            singerCount[name] = (singerCount[name] || 0) + 1;

            item.round = singerCount[name];

            return item;

        });

        // 6. ORDENAÇÃO FINAL: 

        // Prioridade 1: Round (quem tem menos músicas cantando/na fila)

        // Prioridade 2: Time (quem pediu primeiro dentro daquela rodada)

        restOfQueue.sort((a, b) => {

            if (a.round !== b.round) return a.round - b.round;

            return a.time - b.time;

        });

        // 7. Aplicar de volta à fila global e renderizar

        const finalQueue = currentSong ? [currentSong, ...restOfQueue] : restOfQueue;
        queue = finalQueue;

        renderQueue();

    }

    // ─── Estatísticas e Dashboard de Inteligência ──────────────────────────────────
    function updateDJStats(song, score) {
        if (!hostUser) return;
        const statsRef = db.ref(`users/${hostUser.uid}/stats`);

        statsRef.transaction(current => {
            const stats = current || { totalSongsPlayed: 0, genres: {}, records: [], peakHours: {} };

            // 1. Contador Global
            stats.totalSongsPlayed = (stats.totalSongsPlayed || 0) + 1;

            // 2. Contador de Gêneros
            if (song && PartyCore.validGenre(song.estilo)) {
                const genre = song.estilo.trim();
                if (!stats.genres) stats.genres = {};
                stats.genres[genre] = (Number(stats.genres[genre]) || 0) + 1;
            }

            // 3. Sistema de Recordes (Hall da Fama)
            if (!stats.records) stats.records = [];
            stats.records.push({
                singer: song.singer || 'Anônimo',
                song: song.title || '—',
                score: score,
                timestamp: Date.now()
            });
            // Ordena e mantém os 10 melhores
            stats.records.sort((a, b) => b.score - a.score);
            stats.stats_records = stats.records.slice(0, 10);

            return stats;
        });
    }

    function incrementPeakHour() {
        if (!hostUser) return;
        const hour = new Date().getHours();
        const peakRef = db.ref(`users/${hostUser.uid}/stats/peakHours/${hour}`);
        peakRef.transaction(count => (count || 0) + 1);
    }

    function enqueue(entry, playNow) {

        entry.singer = (entry.singer || "Convidado").trim().toUpperCase();

        // Se o entry já tem time (veio do Mobile), usa ele. 

        // Se não tem (DJ adicionou), gera agora garantindo que seja o maior da fila.

        if (!entry.time) {

            let maxTime = queue.reduce((max, item) => Math.max(max, Number(item.time) || 0), 0);

            entry.time = Math.max(Date.now(), maxTime + 1);

        } else {

            entry.time = Number(entry.time);

        }

        if (queue.length === 0 && !isPlaying) {

            queue.push(entry);

            renderQueue();

            playNext();

            return;

        }

        if (playNow && isPlaying) {

            // Tocar agora: Insere na posição 1 e mantém o tempo original para não ser reordenado pra baixo

            queue.splice(1, 0, entry);

        } else {

            queue.push(entry);

            rebalanceQueue();

        }

        renderQueue();

    }

    function moveQueue(index, dir) {

        if (index <= 0 || index >= queue.length) return;

        const t = index + dir;

        if (t <= 0 || t >= queue.length) return;

        [queue[index], queue[t]] = [queue[t], queue[index]];

        renderQueue();

    }

    function removeFromQueue(idx) {

        if (idx === 0) { showScore(); } else { ChallengeHost.complete(queue[idx]?.challengeId, "skipped"); queue.splice(idx, 1); renderQueue(); }

    }

    // ─── Player ───────────────────────────────────────────────────────────────────

    function skipSong() {
        if (queue.length === 0) return;
        if (currentCallAudio) {
            try { currentCallAudio.pause(); } catch (e) { }
            currentCallAudio = null;
        }
        if (currentCallTimer) {
            clearTimeout(currentCallTimer);
            currentCallTimer = null;
        }
        const video = document.getElementById('mainVideo');
        if (video) {
            video.onended = null;
            try { video.pause(); } catch (e) { }
        }
        if (typeof audioSource !== 'undefined' && audioSource) {
            try { audioSource.disconnect(); } catch (e) { }
            audioSource = null;
        }

        PartyHost.complete(null, "skipped");
        ChallengeHost.complete(queue[0]?.challengeId, "skipped");
        // Pula para a próxima música imediatamente sem dar nota
        // finishSong já cuida de isPlaying=false, queue.shift(), renderQueue() e playNext()
        finishSong();
    }

    function playNext() {
        if (!isPlaying && SocialHost.beforeNext(playNextAfterAudio)) return;
        playNextAfterAudio();
    }

    function playNextAfterAudio() {
        try {
            if (queue.length === 0) return;
            const current = queue[0];

            // A apresentação visual do próximo cantor deve SEMPRE aparecer entre músicas.
            // settings.playIntroCall controla apenas se o áudio de voz toca ou se exibe com timer visual
            if (isPlaying) {
                startVideoPlay(current);
            } else {
                showComingNext(current.singer, () => startVideoPlay(current));
            }
        } catch (err) {
            console.error("Erro em playNext:", err);
        }
    }

    function rankingEntries(rows, field, limit = 5) {
        return rows.slice()
            .filter(item => (Number(item[field]) || 0) > 0)
            .sort((a, b) => (Number(b[field]) || 0) - (Number(a[field]) || 0) || a.name.localeCompare(b.name, 'pt-BR'))
            .slice(0, limit)
            .map(item => ({name: item.name, value: Number(item[field]) || 0}));
    }

    function rankingModel() {
        const rows = PartyHost.ranking?.() || [];
        return PARTY_RANKING_CATEGORIES.map(([field, title, icon, unit]) => ({
            field, title, icon, unit, entries: rankingEntries(rows, field)
        }));
    }

    function createTickerCard(category) {
        const card = document.createElement('article');
        card.className = 'ranking-ticker-card'; card.dataset.rankingField = category.field;
        const header = document.createElement('div'); header.className = 'ranking-ticker-card-title';
        const icon = document.createElement('i'); icon.className = `fas ${category.icon}`;
        const title = document.createElement('span'); title.textContent = category.title;
        const leader = document.createElement('strong'); leader.className = 'ranking-ticker-leader';
        const value = document.createElement('small'); value.className = 'ranking-ticker-value';
        header.append(icon, title); card.append(header, leader, value); return card;
    }

    function ensureRankingTicker() {
        const ticker = document.getElementById('rankingTicker');
        if (!ticker) return null;
        ticker.querySelectorAll('.ranking-ticker-sequence').forEach(sequence => {
            if (sequence.children.length) return;
            PARTY_RANKING_CATEGORIES.forEach(([field, title, icon, unit]) => sequence.append(createTickerCard({field, title, icon, unit})));
        });
        return ticker;
    }

    function refreshRankingTicker() {
        const ticker = ensureRankingTicker();
        if (!ticker) return;
        const model = rankingModel();
        ticker.querySelectorAll('.ranking-ticker-card').forEach(card => {
            const category = model.find(item => item.field === card.dataset.rankingField);
            const first = category?.entries[0];
            const leader = card.querySelector('.ranking-ticker-leader');
            const value = card.querySelector('.ranking-ticker-value');
            if (leader) leader.textContent = first?.name || 'Ainda não rolou';
            if (value) value.textContent = first ? `${first.value} ${category.unit}` : '';
            card.classList.toggle('is-empty', !first);
        });
        ticker.hidden = !isPlaying;
    }

    function showPartyRankingCarousel(onComplete, options = {}) {
        partyRankingTransition++;
        const model = rankingModel(), main = model[0], highlights = model.slice(1);
        const board = document.createElement('section'); board.className = 'party-ranking-board';
        const heading = document.createElement('header'); heading.className = 'party-ranking-board-heading';
        const eyebrow = document.createElement('span'); eyebrow.textContent = 'PLACAR DA FESTA';
        const title = document.createElement('h2'); title.textContent = 'Pontuação geral';
        heading.append(eyebrow, title);
        const podium = document.createElement('ol'); podium.className = 'party-ranking-podium';
        if (!main.entries.length) {
            const empty = document.createElement('li'); empty.className = 'is-empty'; empty.textContent = 'A festa está só começando'; podium.append(empty);
        } else main.entries.slice(0, 3).forEach((entry, index) => {
            const row = document.createElement('li');
            const position = document.createElement('b'); position.textContent = `${index + 1}º`;
            const name = document.createElement('strong'); name.textContent = entry.name;
            const value = document.createElement('span'); value.textContent = `${entry.value} ${main.unit}`;
            row.append(position, name, value); podium.append(row);
        });
        const subtitle = document.createElement('h3'); subtitle.textContent = 'Destaques da festa';
        const grid = document.createElement('div'); grid.className = 'party-ranking-highlights';
        highlights.forEach(category => {
            const card = document.createElement('article'); card.className = 'party-ranking-highlight';
            const icon = document.createElement('i'); icon.className = `fas ${category.icon}`;
            const label = document.createElement('span'); label.textContent = category.title;
            const leader = document.createElement('strong'); leader.textContent = category.entries[0]?.name || 'Ainda não rolou';
            const value = document.createElement('small'); value.textContent = category.entries[0] ? `${category.entries[0].value} ${category.unit}` : '';
            card.classList.toggle('is-empty', !category.entries.length);
            card.append(icon, label, leader, value); grid.append(card);
        });
        board.append(heading, podium, subtitle, grid);
        const target = options.target || playerArea || document.getElementById('player');
        if (!target) { onComplete?.(); return; }
        target.replaceChildren(board); refreshRankingTicker();
        onComplete?.();
    }

    function showComingNext(singerName, onComplete) {
        if (!playerArea) playerArea = document.getElementById('player');

        // Limpa áudio ou timer anterior caso haja sobreposição rápida
        if (currentCallAudio) {
            try { currentCallAudio.pause(); } catch (e) { }
            currentCallAudio = null;
        }
        if (currentCallTimer) {
            clearTimeout(currentCallTimer);
            currentCallTimer = null;
        }

        const phraseTemplate = hostMemePhrases[Math.floor(Math.random() * hostMemePhrases.length)];
        const cleanName = (singerName || 'CANTOR').toString().trim().toUpperCase();

        let phraseHtml = '';
        if (phraseTemplate.includes('[Nome]')) {
            const parts = phraseTemplate.split('[Nome]');
            const lead = safeEscape(parts[0]);
            const trail = safeEscape(parts.slice(1).join(''));

            phraseHtml = `
                <div class="cn-phrase-container">
                    ${lead ? `<span class="cn-text-lead">${lead}</span>` : ''}
                    <span class="cn-singer-name">${safeEscape(cleanName)}</span>
                    ${trail ? `<span class="cn-text-trail">${trail}</span>` : ''}
                </div>
            `;
        } else {
            phraseHtml = `
                <div class="cn-phrase-container">
                    <span class="cn-text-lead">${safeEscape(phraseTemplate)}</span>
                    <span class="cn-singer-name">${safeEscape(cleanName)}</span>
                </div>
            `;
        }

        playerArea.innerHTML = `
            <div class="coming-next-overlay">
                <div class="cn-stage-glow"></div>
                <div class="cn-badge"><i class="fas fa-microphone-alt"></i> PRÓXIMO SHOW</div>
                <div class="cn-content">
                    ${phraseHtml}
                </div>
                <div class="cn-equalizer" aria-hidden="true" title="Palco Pronto">
                    <span class="cn-bar bar-1"></span>
                    <span class="cn-bar bar-2"></span>
                    <span class="cn-bar bar-3"></span>
                    <span class="cn-bar bar-4"></span>
                    <span class="cn-bar bar-5"></span>
                    <span class="cn-bar bar-6"></span>
                    <span class="cn-bar bar-7"></span>
                </div>
            </div>
        `;

        let callCompleted = false;

        const finalizeCall = () => {
            if (callCompleted) return;
            callCompleted = true;
            if (currentCallTimer) {
                clearTimeout(currentCallTimer);
                currentCallTimer = null;
            }
            if (currentCallAudio) {
                try { currentCallAudio.pause(); } catch (e) { }
                currentCallAudio = null;
            }
            console.log("[Apresentação] Transição finalizada. Iniciando música...");
            const overlay = document.querySelector('.coming-next-overlay');
            if (overlay) overlay.classList.add('fade-out');
            setTimeout(() => {
                if (overlay) overlay.remove();
                onComplete();
            }, 450);
        };

        if (settings.playIntroCall !== false) {
            // CHAMADA DE CANTOR COM ÁUDIO SFX ATIVADO
            const sfxArray = ['Chamada_1.mp3', 'Chamada_2.mp3', 'Chamada_3.mp3'];
            const randomSfx = sfxArray[Math.floor(Math.random() * sfxArray.length)];
            const audioUrl = `../SFX/${randomSfx}`;
            console.log("[SFX] Iniciando chamada do próximo cantor:", audioUrl);
            currentCallAudio = new Audio(audioUrl);

            currentCallAudio.onended = finalizeCall;
            currentCallAudio.onerror = () => {
                console.warn("[SFX] Falha ao carregar .mp3, tentando .MP3...");
                const fallback = new Audio(`../SFX/${randomSfx.replace('.mp3', '.MP3')}`);
                fallback.onended = finalizeCall;
                fallback.onerror = () => {
                    console.warn("[SFX] Falha ao carregar .MP3, tentando chamada_1.mp3...");
                    const fallbackFinal = new Audio(`../SFX/chamada_1.mp3`);
                    fallbackFinal.onended = finalizeCall;
                    fallbackFinal.onerror = () => {
                        console.error("[SFX] Falha crítica: Nenhum arquivo de chamada encontrado.");
                        currentCallTimer = setTimeout(finalizeCall, 4000);
                    };
                    currentCallAudio = fallbackFinal;
                    fallbackFinal.play().catch(e => {
                        currentCallTimer = setTimeout(finalizeCall, 4000);
                    });
                };
                currentCallAudio = fallback;
                fallback.play().catch(e => {
                    console.warn("[SFX] Play bloqueado pelo navegador:", e);
                    currentCallTimer = setTimeout(finalizeCall, 4000);
                });
            };

            currentCallAudio.play().catch(e => {
                console.warn("[SFX] Erro ou autoplay bloqueado ao tocar chamada:", e);
                // Se o navegador bloquear o autoplay com som, prossegue após 4 segundos
                currentCallTimer = setTimeout(finalizeCall, 4000);
            });

            // Segurança Máxima caso o áudio não dispare onended
            currentCallTimer = setTimeout(finalizeCall, 10000);
        } else {
            // CHAMADA COM ÁUDIO DESATIVADO: Apresentação visual permanece por 4 segundos
            console.log("[Apresentação] Áudio desativado. Exibindo apresentação visual por 4 segundos.");
            currentCallTimer = setTimeout(finalizeCall, 4000);
        }
    }

    function resetTone() {
        PartyHost.invalidate();
        currentPitch = 1.0;
        if (pitchShifter) {
            try {
                pitchShifter.setPitchOffset(1.0);
            } catch (e) { }
        }
        const v = document.getElementById('mainVideo');
        if (v) {
            v.playbackRate = 1.0;
            v.preservesPitch = true;
        }
        const display = document.querySelector('.tone-control .control-label');
        if (display) {
            display.innerText = 'TOM: 0';
        }
    }

    function startVideoPlay(current) {
        SocialHost.stopAudio();
        try {
            tonePerformanceId = Date.now().toString(36) + Math.random().toString(36).slice(2);
            toneManuallyAdjusted = false;
            // Reseta o tom para 0 para toda nova música que iniciar
            resetTone();

            if (window.innerWidth <= 1024) {
                toggleMobilePlayer(true);
            }

            updateDebugInfo(`▶️ Iniciando: ${current.id} (${current.title})`);

            if (!playerArea) playerArea = document.getElementById('player');
            if (!topInfoTitle) topInfoTitle = document.getElementById('topInfoTitle');
            if (!topInfoArtist) topInfoArtist = document.getElementById('topInfoArtist');
            if (!topInfoBox) topInfoBox = document.getElementById('topInfoBox');

            isPlaying = true;
            refreshRankingTicker();
            stopAmbientMusic();
            forcedScore = null;



            if (topInfoTitle) topInfoTitle.innerText = current.title;
            if (topInfoArtist) topInfoArtist.innerText = `${current.artist} — ${current.singer.toUpperCase()}`;
            if (topInfoBox) topInfoBox.style.display = 'block';

            if (currentRoomCode) {
                db.ref('salas/' + currentRoomCode + '/now_playing').set({
                    title: current.title, artist: current.artist, singer: current.singer, playing: true,
                    songId: current.id, performanceId: tonePerformanceId, pitch: 1, remoteToneEnabled: true,
                    requesterUid: current.requesterUid || current.singerUid || null,
                    recipientVersion: 1, recipientUids: SingerSelection.recipients(current)
                });
                currentVotes = {};
                db.ref('salas/' + currentRoomCode + '/now_playing/votes').on('value', snap => {
                    currentVotes = snap.val() || {};
                    updatePublicScoreUI();
                });
                currentDedometro = {};
                db.ref('salas/' + currentRoomCode + '/now_playing/dedometro').on('value', snap => {
                    currentDedometro = snap.val() || {};
                    updateDedometroUI();
                });
            }

            const videoId = String(current.id).padStart(5, '0');
            const baseUrl = CDN_BASE_URL || (window.location.origin + "/Musicas/");
            const videoUrl = baseUrl + videoId + ".mp4";

            playerArea.innerHTML = `
                <div class="video-overlay-banner">
                    <div class="banner-left"><img src="../Assets/logo.png" alt="Logo"></div>
                    <div class="banner-right"><span>A MELHOR<br>EXPERIÊNCIA<br>DE KARAOKÊ</span></div>
                </div>
                <div id="micBadge" class="mic-active-badge">MIC ATIVO</div>
                
                <video id="mainVideo" width="100%" height="100%" autoplay playsinline crossorigin="anonymous" preload="metadata">
                    <source src="${videoUrl}" type="video/mp4">
                </video>

                <div id="autoplayFallback" class="autoplay-fallback" onclick="handleAutoplayFallback()">
                    <i class="fas fa-play-circle"></i>
                    <p>O navegador bloqueou o áudio.<br>Clique aqui para começar!</p>
                </div>

                <div class="progress-time-display" id="progressTime">00:00 / 00:00</div>
                <div class="progress-container" id="progressContainer"><div class="progress-bar-inner" id="progressBar"></div></div>
            `;

            const video = document.getElementById('mainVideo');
            PartyHost.playing(current, video);
            const loader = document.getElementById('playerLoading');
            const fallback = document.getElementById('autoplayFallback');

            if (video) {
                video.volume = currentVolume;
                // Inicia o vídeo o mais rápido possível
                video.play().then(() => {
                    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
                    // Delay para estabilidade antes de conectar processamento de áudio (Pitch Shift)
                    setTimeout(() => {
                        setupAudioNodes(video);
                    }, 350);
                }).catch(err => {
                    console.warn("Autoplay bloqueado.", err);
                    if (fallback) fallback.style.display = 'flex';
                });

                video.onpause = () => stopMic('song');
                video.onplaying = () => {
                    if (settings.enableScore !== false && settings.scoreMode === 'mic') startMic('song');
                    if (fallback) fallback.style.display = 'none';
                    updateDebugInfo(`✅ TOCANDO: ${videoId}.mp4`);
                };

                video.onerror = () => {
                    stopMic('song');
                    PartyHost.complete(null, "error");
                    ChallengeHost.complete(queue[0]?.challengeId, "skipped");
                    updateDebugInfo(`❌ ERRO CDN: ${videoId}.mp4`);
                    setTimeout(showScore, 3000);
                };

                video.ontimeupdate = () => {
                    const prog = document.getElementById('progressBar');
                    if (prog) prog.style.width = (video.currentTime / video.duration * 100) + '%';
                    const time = document.getElementById('progressTime');
                    if (time) time.innerText = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
                };

                video.onended = () => showScore();
            }
        } catch (err) {
            console.error("Erro em startVideoPlay:", err);
        }
    }

    // ─── Audio Routing & Pitch Shifting ──────────────────────────────────────────

    function setupAudioNodes(video) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioSource) {
            audioSource.disconnect();
        }
        audioSource = audioContext.createMediaElementSource(video);
        pitchShifter = createPitchShifter(audioContext);
        pitchShifter.setPitchOffset(currentPitch);
        audioSource.connect(pitchShifter.input);
        pitchShifter.output.connect(audioContext.destination);

        // Força a ativação do áudio caso o contexto esteja suspenso
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    window.handleAutoplayFallback = function () {
        const video = document.getElementById('mainVideo');
        const fallback = document.getElementById('autoplayFallback');
        if (video) {
            video.play().catch(e => console.error("Falha ao forçar play:", e));
            if (audioContext) audioContext.resume();
        }
        if (fallback) fallback.style.display = 'none';
    };

    function createPitchShifter(context) {
        const input = context.createGain();
        const output = context.createGain();

        const delayTime = 0.100; // 100ms is smoother for voice
        const delay1 = context.createDelay(0.2);
        const delay2 = context.createDelay(0.2);
        const g1 = context.createGain();
        const g2 = context.createGain();

        input.connect(delay1);
        input.connect(delay2);
        delay1.connect(g1);
        delay2.connect(g2);
        g1.connect(output);
        g2.connect(output);

        // Buffers for modulation (pre-calculated for perfect phase)
        const bufferLen = context.sampleRate; // 1 second
        const ramp1 = context.createBuffer(1, bufferLen, context.sampleRate);
        const ramp2 = context.createBuffer(1, bufferLen, context.sampleRate);
        const fade1Buf = context.createBuffer(1, bufferLen, context.sampleRate);
        const fade2Buf = context.createBuffer(1, bufferLen, context.sampleRate);

        const r1 = ramp1.getChannelData(0);
        const r2 = ramp2.getChannelData(0);
        const f1 = fade1Buf.getChannelData(0);
        const f2 = fade2Buf.getChannelData(0);

        for (let i = 0; i < bufferLen; i++) {
            const x1 = i / bufferLen;
            const x2 = (x1 + 0.5) % 1.0; // 180 degrees shift
            r1[i] = x1;
            r2[i] = x2;
            // Equal power crossfade
            f1[i] = Math.sqrt(0.5 * (1.0 + Math.cos(2.0 * Math.PI * x1 + Math.PI)));
            f2[i] = Math.sqrt(0.5 * (1.0 + Math.cos(2.0 * Math.PI * x2 + Math.PI)));
        }

        const mod1 = context.createBufferSource();
        const mod2 = context.createBufferSource();
        const fade1 = context.createBufferSource();
        const fade2 = context.createBufferSource();

        mod1.buffer = ramp1;
        mod2.buffer = ramp2;
        fade1.buffer = fade1Buf;
        fade2.buffer = fade2Buf;
        mod1.loop = mod2.loop = fade1.loop = fade2.loop = true;

        const modGain1 = context.createGain();
        const modGain2 = context.createGain();
        const offsetNode = context.createConstantSource();
        offsetNode.start();

        mod1.connect(modGain1);
        mod2.connect(modGain2);
        modGain1.connect(delay1.delayTime);
        modGain2.connect(delay2.delayTime);
        offsetNode.connect(delay1.delayTime);
        offsetNode.connect(delay2.delayTime);

        fade1.connect(g1.gain);
        fade2.connect(g2.gain);

        mod1.start();
        mod2.start();
        fade1.start();
        fade2.start();

        return {
            input,
            output,
            setPitchOffset: (pitch) => {
                const shift = 1.0 - pitch;
                if (shift > 0) {
                    modGain1.gain.setTargetAtTime(delayTime, context.currentTime, 0.01);
                    modGain2.gain.setTargetAtTime(delayTime, context.currentTime, 0.01);
                    offsetNode.offset.setTargetAtTime(0, context.currentTime, 0.01);
                } else {
                    modGain1.gain.setTargetAtTime(-delayTime, context.currentTime, 0.01);
                    modGain2.gain.setTargetAtTime(-delayTime, context.currentTime, 0.01);
                    offsetNode.offset.setTargetAtTime(delayTime, context.currentTime, 0.01);
                }
                const modRate = Math.abs(shift) / delayTime;
                const t = context.currentTime;
                mod1.playbackRate.setTargetAtTime(modRate, t, 0.01);
                mod2.playbackRate.setTargetAtTime(modRate, t, 0.01);
                fade1.playbackRate.setTargetAtTime(modRate, t, 0.01);
                fade2.playbackRate.setTargetAtTime(modRate, t, 0.01);
            }
        };
    }

    // ─── Scoring ──────────────────────────────────────────────────────────────────

    function showScore(forceScore = null) {
        stopMic();
        const ticker = document.getElementById('rankingTicker');
        if (ticker) ticker.hidden = true;
        console.log("📊 [SCORE] showScore iniciado");

        // Parar vídeo
        try {
            const video = document.getElementById('mainVideo');
            if (video) { video.onended = null; video.pause(); }
        } catch (e) { }

        try {
            if (audioSource) { audioSource.disconnect(); audioSource = null; }
        } catch (e) { }

        // Função local para tocar som SEM depender de playSfx
        function _playSound(path) {
            try {
                const a = new Audio(path);
                a.volume = 1.0;
                a.play().catch(e => console.warn('[SCORE SFX] Bloqueado:', path, e.message));
                return a;
            } catch (e) { return null; }
        }

        // Calcular nota
        let finalScore = 75;
        const singer = (queue[0] && queue[0].singer) ? queue[0].singer : "Convidado";

        if (typeof forceScore === 'number') {
            finalScore = forceScore;
        } else if (typeof forcedScore === 'number') {
            finalScore = forcedScore;
        } else if (settings && settings.enableScore === false) {
            finalScore = 0;
        } else {
            let base = 70 + Math.floor(Math.random() * 15);
            let volBonus = Math.floor((maxVolume / 150) * 15);
            finalScore = base + volBonus;
            if (currentVotes) {
                const votes = Object.values(currentVotes);
                if (votes.length > 0) {
                    const avg = votes.reduce((a, b) => a + (b.stars || 0), 0) / votes.length;
                    finalScore = Math.round((finalScore * 0.7) + ((avg / 5 * 100) * 0.3));
                }
            }
        }
        finalScore = Math.max(0, Math.min(100, Number(finalScore) || 75));
        PartyHost.complete(settings.enableScore === false ? null : finalScore);
        ChallengeHost.complete(queue[0]?.challengeId);
        forcedScore = null;
        maxVolume = 0;
        console.log("📊 [SCORE] Nota calculada:", finalScore, "| Cantor:", singer);

        // Salva pontuação no ranking da noite
        if (queue[0]) {
            updateDJStats(queue[0], finalScore);
            sessionRanking.push({
                singer: singer,
                title: queue[0].title,
                artist: queue[0].artist,
                score: finalScore
            });
            // Ordena decrescente pelo score
            sessionRanking.sort((a, b) => b.score - a.score);
            // Mantém top 5
            if (sessionRanking.length > 5) {
                sessionRanking = sessionRanking.slice(0, 5);
            }
        }

        // Grava last_score no Firebase após 15s (aguarda a animação do telão terminar)
        if (currentRoomCode && db) {
            const scoreEntry = queue[0] || {};
            const scoreRoomCode = currentRoomCode;
            const scorePayload = {
                singer: singer,
                singerUid: scoreEntry.singerUid || null,
                recipientVersion: 1,
                recipientUids: SingerSelection.recipients(scoreEntry),
                ...(scoreEntry.challenge ? {challenge:scoreEntry.challenge} : {}),
                title: scoreEntry.title || '',
                artist: scoreEntry.artist || '',
                score: finalScore,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            setTimeout(() => {
                if (currentRoomCode !== scoreRoomCode) return;
                db.ref(`salas/${scoreRoomCode}/last_score`).set(scorePayload)
                    .catch(e => console.warn('[SCORE] Falha ao gravar last_score:', e));
            }, 15000); // 15s de atraso — dá tempo da animação no telão aparecer primeiro
        }

        // Encontrar container onde mostrar animação
        const targetPlayer = document.getElementById('player');
        if (!targetPlayer) {
            console.error("❌ [SCORE] #player não encontrado, chamando finishSong diretamente");
            finishSong();
            return;
        }

        // PASSO 1: Mostrar tela de suspense + tocar aplausos
        targetPlayer.innerHTML = `
    <div class="score-suspense-overlay">
        <div class="cn-stage-glow"></div>
        <div class="sf-badge sf-badge-suspense"><i class="fas fa-hourglass-half"></i> DANDO NOTA...</div>
        <div id="tickerScore" class="sf-ticker-value">--</div>
        <div class="sf-singer">Segura o coração, ${safeEscape(singer.toUpperCase())}! 🎤</div>
        <div class="cn-equalizer cn-equalizer-fast" aria-hidden="true">
            <span class="cn-bar bar-1"></span>
            <span class="cn-bar bar-2"></span>
            <span class="cn-bar bar-3"></span>
            <span class="cn-bar bar-4"></span>
            <span class="cn-bar bar-5"></span>
            <span class="cn-bar bar-6"></span>
            <span class="cn-bar bar-7"></span>
        </div>
    </div>
`;

        _playSound('../SFX/Aplausos.mp3');
        showApplauseAnimation();

        // PASSO 2: Após 2s — tocar suspense e iniciar ticker
        setTimeout(() => {
            const suspenseAudio = _playSound('../SFX/Dando_nota.mp3');
            const tickerEl = document.getElementById('tickerScore');
            const tickerInt = setInterval(() => {
                if (tickerEl) tickerEl.textContent = Math.floor(Math.random() * 100);
            }, 80);

            // Revelar nota quando o áudio terminar (ou após 15s de fallback)
            let revealed = false;
            function revealScore() {
                if (revealed) return;
                revealed = true;
                clearInterval(tickerInt);

                let sfxFile = 'Nota_media.mp3';
                let cat = 'med1';
                if (finalScore >= 95) { sfxFile = 'Nota_maxima.mp3'; cat = 'max'; }
                else if (finalScore >= 85) { sfxFile = 'Nota_alta.mp3'; cat = 'high'; }
                else if (finalScore >= 70) { sfxFile = 'Nota_media.mp3'; cat = 'med1'; }
                else { sfxFile = 'Nota_baixa.mp3'; cat = 'low'; }

                const phrases = scorePhrases[cat] || scorePhrases['med1'];
                const phrase = phrases[Math.floor(Math.random() * phrases.length)];

                targetPlayer.innerHTML = `
    <div class="score-final-overlay">
        <div class="cn-stage-glow"></div>
        <div class="sf-badge"><i class="fas fa-star"></i> NOTA FINAL</div>
        <div class="sf-score-value">${finalScore}</div>
        <div class="sf-phrase">"${phrase}"</div>
        <div class="sf-singer">⭐ ARRASOU, ${safeEscape(singer.toUpperCase())}! 🎤</div>
        <div class="cn-equalizer" aria-hidden="true">
            <span class="cn-bar bar-1"></span>
            <span class="cn-bar bar-2"></span>
            <span class="cn-bar bar-3"></span>
            <span class="cn-bar bar-4"></span>
            <span class="cn-bar bar-5"></span>
            <span class="cn-bar bar-6"></span>
            <span class="cn-bar bar-7"></span>
        </div>
    </div>
`;

                _playSound('../SFX/' + sfxFile);

                // PASSO 4: Após 8s — próxima música
                setTimeout(() => {
                    console.log("⏭️ [SCORE] Chamando finishSong");
                    finishSong();
                }, 8000);
            }

            // Espera o áudio terminar; fallback de 15s se falhar
            if (suspenseAudio) {
                suspenseAudio.onended = revealScore;
                suspenseAudio.onerror = revealScore;
                setTimeout(revealScore, 15000); // segurança máxima
            } else {
                setTimeout(revealScore, 6000); // sem áudio: tempo fixo
            }
        }, 2000);
    }

    function finishSong() {
        stopMic();
        console.log("🎬 Encerrando música atual...");

        // Aplausos já tocaram no showScore, então aqui apenas limpamos
        isPlaying = false;
        refreshRankingTicker();
        resetTone(); // Garante que o tom resete para TOM: 0 a cada término de música
        queue.shift(); // Remove a música que terminou

        // Pré-atualiza o topInfoBox com a próxima música ANTES de renderizar

        // para evitar que ele apareça com info desatualizada quando queue.length=1

        if (queue.length > 0) {
            const titleEl = document.getElementById('topInfoTitle');
            const artistEl = document.getElementById('topInfoArtist');
            if (titleEl) titleEl.innerText = queue[0].title;
            if (artistEl) artistEl.innerText = `${queue[0].artist} — ${queue[0].singer.toUpperCase()}`;
        }

        renderQueue(); // Atualiza lista lateral (já chama updateFullscreenQueue internamente)

        document.getElementById('compactSingerForm')?.remove();

        document.querySelector('.compact-controls-wrapper')?.classList.remove('autohide'); // Show on finish

        if (queue.length > 0) {
            playNext();
        } else {
            const enterIdle = () => {
                const infoBox = document.getElementById('topInfoBox');
                if (infoBox) infoBox.style.display = 'none';
                const targetPlayer = document.getElementById('player');
                if (targetPlayer) {
                    targetPlayer.innerHTML = '<div class="placeholder-msg">PRONTO PARA O PRÓXIMO SHOW!</div>';
                }
                if (currentRoomCode) {
                    db.ref('salas/' + currentRoomCode + '/now_playing').set({ playing: false });
                }
                checkAmbientMusic();
            };
            // Recados aprovados também entram quando a fila termina. Antes,
            // eles só eram consultados se já existisse uma próxima música.
            if (!SocialHost.beforeNext(enterIdle)) enterIdle();
        }

        // Limpa listener de votos e dedômetro para a próxima música

        if (currentRoomCode) {
            db.ref('salas/' + currentRoomCode + '/now_playing/votes').off();
            db.ref('salas/' + currentRoomCode + '/now_playing/votes').remove(); // Reseta votos no DB

            db.ref('salas/' + currentRoomCode + '/now_playing/dedometro').off();
            db.ref('salas/' + currentRoomCode + '/now_playing/dedometro').remove(); // Reseta dedometro no DB

            // Reseta variáveis locais e oculta dedômetro na TV
            currentDedometro = {};
            const dedoDisplay = document.getElementById('dedometroDisplay');
            if (dedoDisplay) dedoDisplay.style.display = 'none';
        }

    }

    function updatePublicScoreUI() {

        const el = document.getElementById('publicScoreDisplay');

        const val = document.getElementById('publicScoreVal');

        const bar = document.getElementById('vibeBarInner');

        if (!el || !val || !bar) return;

        const entries = Object.values(currentVotes);

        const count = entries.length;

        if (count === 0) {

            el.style.display = 'none';

            return;

        }

        // Cálculo Robusto de Média (v11)

        const sum = entries.reduce((a, b) => a + (b.stars || 0), 0);

        const avg = sum / count;

        const percent = (avg / 5) * 100;

        // Atualiza Texto: Média + Contagem de Votos

        val.innerHTML = `${avg.toFixed(1)} <span style="font-size:0.6rem; opacity:0.6; font-weight:400; margin-left:5px;">(${count} ${count === 1 ? 'voto' : 'votos'})</span>`;

        bar.style.width = percent + '%';

        // Cores dinâmicas (v11)

        if (avg < 2.5) bar.style.background = '#00f2ff';

        else if (avg < 4.0) bar.style.background = 'linear-gradient(90deg, #facc15, #fb923c)';

        else bar.style.background = 'linear-gradient(90deg, #d946ef, #ff0080)';

        el.style.display = 'flex';

        // Força visibilidade caso o display esteja em block por algum erro anterior

        if (el.style.display !== 'flex') el.style.setProperty('display', 'flex', 'important');

    }

    function updateDedometroUI() {
        const el = document.getElementById('dedometroDisplay');
        const likeCountEl = document.getElementById('likeCount');
        const dislikeCountEl = document.getElementById('dislikeCount');
        const likeBar = document.getElementById('likeBarInner');
        const dislikeBar = document.getElementById('dislikeBarInner');
        const publicScoreDisp = document.getElementById('publicScoreDisplay');

        if (!el || !likeCountEl || !dislikeCountEl || !likeBar || !dislikeBar) return;

        const entries = Object.values(currentDedometro);
        const total = entries.length;

        if (total === 0) {
            el.style.display = 'none';
            return;
        }

        const likes = entries.filter(e => e.type === 'like').length;
        const dislikes = total - likes;

        likeCountEl.innerText = likes;
        dislikeCountEl.innerText = dislikes;

        const likePercent = (likes / total) * 100;
        const dislikePercent = 100 - likePercent;

        likeBar.style.width = likePercent + '%';
        dislikeBar.style.width = dislikePercent + '%';

        el.style.display = 'block';
        if (publicScoreDisp) {
            publicScoreDisp.style.display = 'flex';
            if (publicScoreDisp.style.display !== 'flex') publicScoreDisp.style.setProperty('display', 'flex', 'important');
        }
    }

    // ─── Ambient Music (YouTube) ──────────────────────────────────────────────────

    function initAmbientPlayer() {

        // Carrega API do YouTube

        const tag = document.createElement('script');

        tag.src = "https://www.youtube.com/iframe_api";

        const firstScriptTag = document.getElementsByTagName('script')[0];

        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {

            // O player será criado sob demanda não checkAmbientMusic

            if (!isPlaying) checkAmbientMusic();

        };

    }

    // stopAmbientMusic usa ytAmbientPlayer (declarado não topo do arquivo)

    function stopAmbientMusic() {

        stopAmbientRankingCycle();
        if (ambientStateTimer) clearInterval(ambientStateTimer);
        ambientStateTimer = null;
        if (!ytAmbientPlayer) return;

        try {

            isDestroyingAmbient = true;

            ambientLastTime = ytAmbientPlayer.getCurrentTime() || 0;

            const idx = ytAmbientPlayer.getPlaylistIndex ? ytAmbientPlayer.getPlaylistIndex() : -1;

            if (idx >= 0) ambientLastIndex = idx;

            ytAmbientPlayer.stopVideo();

            ytAmbientPlayer.destroy();

        } catch (e) { console.warn('stopAmbientMusic erro:', e); }

        finally {

            ytAmbientPlayer = null;

            isAmbientPlaying = false;

            setTimeout(() => { isDestroyingAmbient = false; }, 500);

        }

    }

    function extractYoutubeInfo(url) {

        if (!url) return { videoId: null, playlistId: null };

        let videoId = null;

        let playlistId = null;

        // Extrair Video ID

        const vRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;

        const vMatch = url.match(vRegExp);

        if (vMatch && vMatch[2].length === 11) videoId = vMatch[2];

        // Extrair Playlist ID

        const pRegExp = /[?&]list=([^#\&\?]+)/;

        const pMatch = url.match(pRegExp);

        if (pMatch) playlistId = pMatch[1];

        return { videoId, playlistId };

    }

    function stopAmbientRankingCycle() {
        if (ambientRankingTimer) clearTimeout(ambientRankingTimer);
        ambientRankingTimer = null;
        document.getElementById('ambientOverlay')?.classList.remove('is-ranking-visible');
    }

    function publishAmbientState() {
        const container = document.getElementById('ambientContainer');
        if (!container || !ytAmbientPlayer) return;
        try {
            container.dataset.ambientState = String(ytAmbientPlayer.getPlayerState());
            container.dataset.ambientTime = (ytAmbientPlayer.getCurrentTime() || 0).toFixed(2);
            container.dataset.ambientRate = String(ytAmbientPlayer.getPlaybackRate?.() || 1);
            container.dataset.ambientVideo = ytAmbientPlayer.getVideoData?.().video_id || '';
        } catch (e) { }
    }

    function startAmbientStateBroadcast() {
        if (ambientStateTimer) clearInterval(ambientStateTimer);
        publishAmbientState();
        ambientStateTimer = setInterval(publishAmbientState, 200);
    }

    function renderAmbientRankingPanel() {
        const panel = document.getElementById('ambientRankingPanel');
        if (!panel) return;
        const model = rankingModel();
        const main = model[0];
        const secondary = model.slice(1);
        const offset = (ambientRankingPage % 2) * 4;
        const shown = secondary.slice(offset, offset + 4);
        panel.replaceChildren();

        const eyebrow = document.createElement('span'); eyebrow.className = 'ambient-rank-eyebrow'; eyebrow.textContent = 'PLACAR DA FESTA';
        const heading = document.createElement('h2'); heading.textContent = 'Pontuação geral';
        const podium = document.createElement('ol'); podium.className = 'ambient-rank-podium';
        if (!main.entries.length) {
            const empty = document.createElement('li'); empty.className = 'is-empty'; empty.textContent = 'A festa está só começando'; podium.append(empty);
        } else main.entries.slice(0, 3).forEach((entry, index) => {
            const row = document.createElement('li');
            const place = document.createElement('b'); place.textContent = `${index + 1}º`;
            const name = document.createElement('strong'); name.textContent = entry.name;
            const value = document.createElement('small'); value.textContent = `${entry.value} ${main.unit}`;
            row.append(place, name, value); podium.append(row);
        });
        const highlights = document.createElement('div'); highlights.className = 'ambient-rank-highlights';
        shown.forEach(category => {
            const row = document.createElement('article');
            const label = document.createElement('span'); label.textContent = category.title;
            const leader = document.createElement('strong'); leader.textContent = category.entries[0]?.name || 'Ainda não rolou';
            const value = document.createElement('small'); value.textContent = category.entries[0] ? `${category.entries[0].value} ${category.unit}` : '';
            row.append(label, leader, value); highlights.append(row);
        });
        panel.append(eyebrow, heading, podium, highlights);
    }

    function startAmbientRankingCycle() {
        stopAmbientRankingCycle();
        const timing = settings.ambientRankingMode === 'video'
            ? {video: 35000, ranking: 6000}
            : settings.ambientRankingMode === 'rankings'
                ? {video: 15000, ranking: 12000}
                : {video: 25000, ranking: 8000};
        const showPanel = () => {
            if (isPlaying || queue.length || !isAmbientPlaying || !document.getElementById('ambientOverlay')) return;
            renderAmbientRankingPanel();
            document.getElementById('ambientOverlay').classList.add('is-ranking-visible');
            ambientRankingTimer = setTimeout(() => {
                document.getElementById('ambientOverlay')?.classList.remove('is-ranking-visible');
                ambientRankingPage = (ambientRankingPage + 1) % 2;
                ambientRankingTimer = setTimeout(showPanel, timing.video);
            }, timing.ranking);
        };
        ambientRankingTimer = setTimeout(showPanel, timing.video);
    }

    function checkAmbientMusic() {
        console.log("🎸 Verificando Música Ambiente... Tocando:", isPlaying, "Fila:", queue.length);
        if (isPlaying || queue.length > 0) return;

        const url = settings.ambientUrl ? settings.ambientUrl.trim() : "";

        // Se não há URL configurada, mostra uma tela bonita de espera

        if (!url) {
            showPartyRankingCarousel();
            return;

            playerArea.innerHTML = `

            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; flex-direction:column; background: radial-gradient(circle at center, rgba(45,67,216,0.3) 0%, var(--bg-dark) 70%); color:white;">

                <h2 style="font-weight:900; letter-spacing:15px; margin-bottom:15px; font-size:3rem; text-shadow: 0 0 30px var(--accent-primary);">KARAOKE PARTY</h2>

                <div class="placeholder-msg" style="color:var(--text-main); font-weight:300;">PRONTO PARA O PRÓXIMO SHOW!</div>

            </div>

        `;

            return;

        }

        const info = extractYoutubeInfo(url);

        const videoId = info.videoId;

        const playlistId = info.playlistId;

        if (!videoId && !playlistId) return; // URL inválida

        if (isAmbientPlaying && ytAmbientPlayer && document.getElementById('ambientContainer')) {
            if (!ambientRankingTimer) startAmbientRankingCycle();
            return;
        }

        playerArea.innerHTML = `
        <div id="ambientContainer" class="ambient-stage">
            <div id="ytAmbient" class="ambient-video"></div>
            <div id="ambientOverlay" class="ambient-overlay">
                <div class="ambient-heading">
                    <strong>MÚSICA AMBIENTE</strong>
                    <span>AGUARDANDO O PRÓXIMO SHOW</span>
                </div>
                <aside id="ambientRankingPanel" class="ambient-ranking-panel" aria-label="Destaques da festa"></aside>
            </div>
        </div>`;

        setTimeout(() => {

            if (typeof YT !== 'undefined' && YT.Player) {

                const playerConfig = {

                    height: '100%',

                    width: '100%',

                    playerVars: {

                        'autoplay': 1,

                        'controls': 0,

                        'mute': 0,

                        'start': Math.floor(ambientLastTime),

                        'index': Math.floor(ambientLastIndex)

                    },

                    events: {

                        'onReady': (event) => {

                            event.target.playVideo();

                            event.target.setVolume(35);

                            isAmbientPlaying = true;

                            startAmbientRankingCycle();

                            startAmbientStateBroadcast();

                        },

                        'onStateChange': publishAmbientState

                    }

                };

                // Se for uma playlist, configura para tocar a lista

                if (playlistId) {

                    playerConfig.playerVars.listType = 'playlist';

                    playerConfig.playerVars.list = playlistId;

                    // Se o usuário já avançou na playlist (index > 0), NÃO passamos o videoId,

                    // caso contrário o YouTube força o início naquele vídeo e ignãora o index salvo.

                    if (videoId && ambientLastIndex === 0) {

                        playerConfig.videoId = videoId;

                    }

                } else {

                    // Vídeo único

                    playerConfig.videoId = videoId;

                    playerConfig.playerVars.loop = 1;

                    playerConfig.playerVars.playlist = videoId;

                }

                ytAmbientPlayer = new YT.Player('ytAmbient', playerConfig);

                isAmbientPlaying = true;

            }

        }, 500);

    }

    // ─── Som SFX ──────────────────────────────────────────────────────────────────

    let micStream = null, micContext = null, micFrame = null, micPending = null, micGeneration = 0;
    const micReasons = new Set();

    function stopMic(reason) {
        if (reason) micReasons.delete(reason); else micReasons.clear();
        const testButton = document.getElementById('testMicButton');
        if (testButton && !micReasons.has('calibration')) testButton.textContent = 'TESTAR MICROFONE';
        if (micReasons.size) return;
        micGeneration++;
        micPending = null;
        if (micFrame !== null) cancelAnimationFrame(micFrame);
        micFrame = null;
        if (micStream) micStream.getTracks().forEach(track => track.stop());
        micStream = null;
        if (micContext) micContext.close().catch(() => {});
        micContext = null; analyzer = null; dataArray = null;
        if (calibInterval) clearInterval(calibInterval);
        const bar = document.getElementById('vuBar'); if (bar) bar.style.height = '0%';
        const badge = document.getElementById('micBadge'); if (badge) badge.style.display = 'none';
        const calibBar = document.getElementById('calibBar'); if (calibBar) calibBar.style.width = '0%';
        const calibValue = document.getElementById('calibVolVal'); if (calibValue) calibValue.textContent = '0';
    }

    async function startMic(reason = 'song') {
        micReasons.add(reason);
        const testButton = document.getElementById('testMicButton');
        if (testButton && micReasons.has('calibration')) testButton.textContent = 'PARAR TESTE';
        if (micStream) return;
        if (micPending) return micPending;
        const generation = micGeneration;
        micPending = (async () => {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: {
                    echoCancellation: false, noiseSuppression: false, autoGainControl: false
                } });
                if (generation !== micGeneration || !micReasons.size) {
                    stream.getTracks().forEach(track => track.stop()); return;
                }
                micStream = stream;
                // Contexto próprio: nunca substitui o processamento do vídeo e do tom.
                micContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = micContext.createMediaStreamSource(stream);
                analyzer = micContext.createAnalyser(); analyzer.fftSize = 256;
                source.connect(analyzer);
                dataArray = new Uint8Array(analyzer.frequencyBinCount);
                if (micContext.state === 'suspended') await micContext.resume();
                const check = () => {
                    if (!analyzer || generation !== micGeneration) return;
                    analyzer.getByteFrequencyData(dataArray);
                    const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                    if (micReasons.has('song') && avg > maxVolume) maxVolume = avg;
                    const bar = document.getElementById('vuBar');
                    if (bar) bar.style.height = Math.min(100, avg / 140 * 100) + '%';
                    const badge = document.getElementById('micBadge');
                    if (badge) badge.style.display = avg > 8 ? 'block' : 'none';
                    micFrame = requestAnimationFrame(check);
                };
                check();
            } catch (error) {
                if (stream) stream.getTracks().forEach(track => track.stop());
                if (generation === micGeneration) {
                    stopMic();
                    console.warn('Microfone indisponível:', error.message);
                    if (reason === 'calibration') showToast('Não foi possível acessar o microfone. Confira a permissão do navegador.');
                }
            } finally { if (generation === micGeneration) micPending = null; }
        })();
        return micPending;
    }
    window.addEventListener('pagehide', () => stopMic());

    // ─── Controlás ─────────────────────────────────────────────────────────────────

    function togglePlay() {

        const v = document.getElementById('mainVideo');

        if (!v) return;

        // Garante que o udio seja retomado (Browsers exigem interação)

        if (audioContext && audioContext.state === 'suspended') {

            audioContext.resume();

        }

        if (v.paused) { v.play(); const i = document.querySelector('.btn-play i'); if (i) i.className = 'fas fa-pause'; }

        else { v.pause(); const i = document.querySelector('.btn-play i'); if (i) i.className = 'fas fa-play'; }

    }

    function restartSong() {

        const v = document.getElementById('mainVideo');

        if (v) v.currentTime = 0;

    }

    function setVideoVolume(val) {
        const numericVal = parseFloat(val);
        if (isNaN(numericVal)) return;

        currentVolume = Math.max(0, Math.min(1, numericVal));
        localStorage.setItem('djVolume', currentVolume.toString());

        const v = document.getElementById('mainVideo');
        if (v) v.volume = currentVolume;

        const r = document.getElementById('volRange');
        if (r) r.value = currentVolume;
    }

    function changeVolume(delta) {
        const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
        setVideoVolume(newVolume);
        resetControlásTimer();
    }

    function changeTone(delta) {
        PartyHost.toneEdited();
        toneManuallyAdjusted = true;

        const v = document.getElementById('mainVideo');

        if (!v) return;

        // Increment pitch factor. Range 0.7 to 1.3 (Security margin)

        // Roughly 0.059 per semitone for better precision

        currentPitch = Math.max(0.7, Math.min(1.3, currentPitch + delta));

        if (pitchShifter) {

            pitchShifter.setPitchOffset(currentPitch);

        }

        // Ensure video playback speed remains normal

        v.playbackRate = 1.0;

        v.preservesPitch = true;

        // Feedback visual 1: Label na barra de controles

        const display = document.querySelector('.tone-control .control-label');

        if (display) {

            const semitones = Math.round((currentPitch - 1.0) / 0.059);

            display.innerText = `TOM: ${semitones > 0 ? '+' : ''}${semitones}`;

        }

        // Keep the adjustment discreet: update only the control label and mobile state.
        if (currentRoomCode && isPlaying) {
            db.ref(`salas/${currentRoomCode}/now_playing/pitch`).set(currentPitch).catch(console.warn);
        }

        resetControlásTimer();

    }

    function resetControlásTimer() {

        const wrapper = document.querySelector('.compact-controls-wrapper');

        if (!wrapper) return;

        // Show controls and hide screensaver

        wrapper.classList.remove('autohide');

        stopScreensaver();

        // Clear existing timeout

        if (controlsTimeout) clearTimeout(controlsTimeout);

        if (idleTimeout) clearTimeout(idleTimeout);

        // If playing, set timeout to hide controls (desktop OR landscape mobile)

        const isMobile = window.innerWidth <= 900;
        const isLandscape = isMobile && window.matchMedia('(orientation: landscape)').matches;
        const shouldAutohide = !isMobile || (isMobile && isLandscape);

        if (isPlaying && shouldAutohide) {

            controlsTimeout = setTimeout(() => {

                if (isPlaying) {

                    const isInputActive = document.activeElement && (document.activeElement.tagName === 'INPUT');

                    const isModalOpen = modal && modal.style.display === 'flex';

                    if (!isInputActive && !isModalOpen) {

                        wrapper.classList.add('autohide');

                    }

                }

            }, 3000);

        } else if (isPlaying && !shouldAutohide) {

            // Portrait mobile: mantém controles sempre visíveis

            wrapper.classList.remove('autohide');

        } else {

            // If NOT playing, set timeout for screensaver

            if (settings.screensaverTimeout > 0) {

                idleTimeout = setTimeout(() => {

                    if (!isPlaying) startScreensaver();

                }, settings.screensaverTimeout);

            }

        }

    }

    // (Funções de Screensaver e Fullscreen movidas para a seção de Implementação acima)

    // ─── Fullscreen & Video State ────────────────────────────────────────────────

    // Função toggleFullscreen unificada implementada acima.

    // ─── Hotkeys ──────────────────────────────────────────────────────────────────

    function handleHotkey(e) {

        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

        if (e.key >= '0' && e.key <= '9') {

            if (currentCode.length < 5) { currentCode += e.key; updateCodeOverlay(); }

            return;

        }

        if (e.key === 'Backspace' && currentCode.length > 0) { currentCode = currentCode.slice(0, -1); updateCodeOverlay(); return; }

        if (e.key === 'Escape' && currentCode.length > 0) { currentCode = ""; if (codeEntryOverlay) codeEntryOverlay.style.display = 'none'; return; }

        if (e.key === 'Enter' && currentCode.length > 0) {

            const song = catalog.find(s => s.id === currentCode.padStart(5, '0'));

            if (song) { addToQueue(song.id); currentCode = ""; if (codeEntryOverlay) codeEntryOverlay.style.display = 'none'; }

            return;

        }

        switch (e.key) {

            case ' ': e.preventDefault(); togglePlay(); break;

            case 'Delete':
                e.preventDefault();
                showScore();
                break;

            case ',': // Hidden hotkey: apenas agenda a nota 100 (discreto)

                forcedScore = 100;

                break;

            case '+': case '=': changeVolume(0.1); break;

            case '-': case '_': changeVolume(-0.1); break;

            case '[': changeTone(-0.05); break;

            case ']': changeTone(0.05); break;

            case 'Home': restartSong(); break;

            case 'PageDown': e.preventDefault(); skipSong(); break;

            case 'f': case 'F': e.preventDefault(); toggleFullscreen(); break;

        }

    }

    function updateCodeOverlay() {

        if (!codeEntryOverlay || !codeDisplay || !codeSongInfo) return;

        if (currentCode.length > 0) {

            codeEntryOverlay.style.display = 'block';

            codeDisplay.innerText = currentCode.padEnd(5, '_').split('').join(' ');

            const song = catalog.find(s => s.id === currentCode.padStart(5, '0'));

            codeSongInfo.innerText = song ? `${song.artist} - ${song.title}` : (currentCode.length === 5 ? "CÓDIGO INVÁLIDO" : "");

        } else {

            codeEntryOverlay.style.display = 'none';

        }

    }

    // ─── Modal ────────────────────────────────────────────────────────────────────

    function showModal(title, body, onConfirm, chips = []) {

        if (!modal) return;

        document.getElementById('modalTitle').innerText = title;

        document.getElementById('modalBody').innerHTML = body;

        modal.style.display = 'flex';

        // Renderiza chips se houver

        const chipsContainer = document.getElementById('modalChips');

        if (chipsContainer && chips.length > 0) {

            chips.forEach(c => {

                const el = document.createElement('div');

                el.className = `user-chip ${c.type}`;

                el.innerHTML = `

                ${c.photo ? `<img src="${c.photo}">` : (c.type === 'active' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-history"></i>')}

                <span>${c.name}</span>

            `;

                el.onclick = () => {

                    const input = document.getElementById('singerName');

                    if (input) {

                        input.value = c.name;

                        input.focus();

                    }

                };

                chipsContainer.appendChild(el);

            });

        }

        // Foca não primeiro input disponível não modal

        setTimeout(() => {

            const inp = modal.querySelector('input[type="text"]');

            if (inp) inp.focus();

        }, 100);

        const closeAndClean = () => {
            modal.style.display = 'none';
            window.removeEventListener('keydown', handler);
        };

        document.getElementById('modalConfirm').onclick = () => {
            const inp = modal.querySelector('input[type="text"]');
            onConfirm(inp ? inp.value : '');
            closeAndClean();
        };

        document.getElementById('modalCancel').onclick = () => {
            closeAndClean();
        };

        const handler = (e) => {
            if (e.key === 'Enter') { document.getElementById('modalConfirm').click(); }
            if (e.key === 'Escape') { document.getElementById('modalCancel').click(); }
        };

        window.addEventListener('keydown', handler);

    }

    // ─── Fullscreen Queue ──────────────────────────────────────────────────────────

    function updateFullscreenQueue() {
        const box = document.getElementById('fsQueueOverlay');
        const topInfo = document.getElementById('topInfoBox');

        if (!box || queue.length <= 1) {
            if (box) box.style.display = 'none';
            if (topInfo && isPlaying) topInfo.style.display = 'block';
            return;
        }

        box.style.display = 'flex';
        if (topInfo) topInfo.style.display = 'none';

        const current = queue[0];

        // Mede o container real (playerContainer), não a janela toda
        const containerEl = document.getElementById('playerContainer');
        const refWidth = containerEl ? containerEl.clientWidth : window.innerWidth;

        let qtdProximos = 2;
        if (refWidth >= 1600) {
            qtdProximos = 6;
        } else if (refWidth >= 1366) {
            qtdProximos = 4;
        } else if (refWidth >= 1100) {
            qtdProximos = 3;
        }

        // Corta a fila dinamicamente com base no espaço disponível
        const nexts = queue.slice(1, qtdProximos + 1);

        const isLandscape = window.innerHeight < 500;
        const usePCLayout = true; // Layout HORIZONTAL PC em todas as telas

        if (usePCLayout) {
            // Layout HORIZONTAL Dashboard/PC (Conforme Referência)
            let html = `<div class="fs-label-header">FILA DE ESPERA</div>`;

            html += `<div class="fs-row-container">`;

            // Item AGORA (NOVA ESTRUTURA COM fs-info-pc)
            html += `
                <div class="fs-col-pc current">
                    <div class="fs-rank-pc">AGORA</div>
                    <div class="fs-info-pc">
                        <div class="fs-name-pc">${current.singer}</div>
                        <div class="fs-song-pc">${current.title} ${isLandscape ? '' : `- ${current.artist}`}</div>
                    </div>
                </div>
            `;

            if (nexts.length > 0) {
                nexts.forEach((item, i) => {
                    // Itens da fila (NOVA ESTRUTURA COM fs-info-pc)
                    html += `
                        <div class="fs-divider-v-pc"></div>
                        <div class="fs-col-pc">
                            <div class="fs-rank-pc">${i + 2}º</div>
                            <div class="fs-info-pc">
                                <div class="fs-name-pc">${item.singer}</div>
                                ${isLandscape ? '' : `<div class="fs-song-pc">${item.title}</div>`}
                            </div>
                        </div>
                    `;
                });
            }
            html += `</div>`;
            box.innerHTML = html;
        } else {
            // Layout VERTICAL Compacto (Mobile Portrait) - MANTIDO INTACTO
            let html = `
                <div class="fs-col fs-col-current">
                    <div class="fs-col-label">CANTANDO AGORA</div>
                    <div class="fs-col-main">
                        <span class="fs-col-title">${current.title}</span>
                        <span class="fs-col-sep">  · </span>
                        <span class="fs-col-artist">${current.artist}</span>
                    </div>
                    <div class="fs-col-singer">🎤 ${current.singer}</div>
                </div>
            `;
            if (nexts.length > 0) {
                html += `<div class="fs-divider-v" style="height: 1px; width: 80%; margin: 5px auto;"></div>`;
                nexts.forEach((item, i) => {
                    html += `
                        <div class="fs-col fs-col-next">
                            <div class="fs-col-label">#${i + 2}</div>
                            <div class="fs-col-main">
                                <span class="fs-col-title">${item.title}</span>
                            </div>
                            <div class="fs-col-singer">${item.singer}</div>
                        </div>
                    `;
                });
            }
            box.innerHTML = html;
        }
    }

    // ─── Mobile Poláling (Firebase Sync) ──────────────────────────────────────────

    function startMobilePolling() {

        if (!currentRoomCode) return;

        const requestsRef = db.ref('salas/' + currentRoomCode + '/pedidos');

        // Desativa listener anterior para evitar duplicatas (vazamento de memória)

        requestsRef.off('child_added');
        requestsRef.off('child_changed');

        // Escuta novos pedidos

        const handleMobileRequest = async (snapshot) => {

            let req = snapshot.val();
            if (req?.kind === 'social') { SocialHost.handle(req, snapshot.key); return; }
            if (req?.kind === 'challenge') { ChallengeHost.handle(req, snapshot.key); return; }
            if (req?.processed) return;
            if (req?.challengeId) {
                try { req = await ChallengeHost.validatedRequest(req, snapshot.key); }
                catch (error) { console.warn('Desafio pendente:', error); return; }
                if (!req) return;
                if (queue.some(item => item.challengeId === req.challengeId)) {
                    requestsRef.child(snapshot.key).update({processed:true}); ChallengeHost.queued(req.challengeId); return;
                }
            }
            if (req && req.kind === "tone") {
                const current = queue[0];
                const state = current ? { ...current, playing: isPlaying, remoteToneEnabled: true, requesterUid: current.requesterUid || current.singerUid } : null;
                if (current && req.performanceId === tonePerformanceId && String(req.id) === String(current.id) &&
                    ToneControl.canControl(state, req.singerUid) && ToneControl.valid(req.pitch) &&
                    !(req.automatic && toneManuallyAdjusted)) {
                    changeTone(req.pitch - currentPitch);
                }
                requestsRef.child(snapshot.key).remove().catch(console.warn);
                return;
            }

            if (req && !req.processed) {

                const song = catalog.find(s => s.id === req.id);

                if (song) {

                    // Usamos o timestamp do Firebase, mas garantimos que ele seja tratado como número

                    const mobileTime = Number(req.timestamp);

                    enqueue({

                        ...song,

                        singer: req.singer,

                        singerUid: req.singerUid || null, // Autor de pedidos antigos
                        requesterUid: req.singerUid || null,
                        recipientVersion: 1,
                        recipientUids: SingerSelection.recipients(req),
                        performerCount: Math.max(SingerSelection.recipients(req).length, Number(req.performerCount) || 1),
                        ...(req.challengeId ? {challengeId:req.challengeId, challenge:req.challenge} : {}),

                        time: mobileTime

                    }, false);

                    if (req.challengeId) ChallengeHost.queued(req.challengeId);
                    else showToast(`🔔 ${req.singer} pediu: ${song.title}`);

                    requestsRef.child(snapshot.key).update({ processed: true });

                }

            }

        };
        requestsRef.on('child_added', handleMobileRequest);
        requestsRef.on('child_changed', snapshot => {
            const req = snapshot.val();
            if (req?.challengeId && !req.processed) handleMobileRequest(snapshot);
        });

        // Limpeza periódica de pedidos processados (opcional, para não pesar o DB)

        // Aqui poderíamos adicionar uma lógica de delete após X minutos.

    }

    // ─── Toast ────────────────────────────────────────────────────────────────────

    function showToast(msg) {

        const toast = document.createElement('div');

        toast.style.cssText = `position:fixed;bottom:30px;right:30px;background:linear-gradient(135deg,var(--accent-primary),var(--accent-secondary));color:white;padding:15px 25px;border-radius:12px;font-weight:700;font-size:0.95rem;box-shadow:0 10px 30px rgba(217,70,239,0.5);z-index:99999;transition:all 0.5s;opacity:0;transform:translateX(100px);`;

        toast.innerHTML = `<i class="fas fa-mobile-alt" style="margin-right:10px;"></i> ${msg}`;

        (document.fullscreenElement || document.body).appendChild(toast);

        setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; }, 50);

        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; setTimeout(() => toast.remove(), 500); }, 4000);

    }

    // ─── Debug (console-only em produção) ────────────────────────────────────────

    function updateDebugInfo(msg) {

        console.log('[KARAOKE]', msg);

    }

    /* --- SUBSCRIPTION LOGIC (PREMIUM) --- */

    function checkSubscriptionStatus(uid) {

        if (!uid) return;

        db.ref('users/' + uid + '/subscription').on('value', (snapshot) => {

            const sub = snapshot.val();

            if (sub && sub.active && sub.expiresAt > Date.now()) {

                isPremium = true;

                subscriptionData = sub;

                if (trialTimer) clearInterval(trialTimer);

                const banner = document.getElementById('trialTimerBanner');

                if (banner) banner.style.display = 'none';

                // Toast de plano ativo removido para não sobrepor o Bem-vindo
                console.log('💎 Plano Premium ativo.');

            } else {

                isPremium = false;

                subscriptionData = null;

            }

        });

    }

    /* --- EXPORTAÇÃO CONTROLADA (SEGURANÇA) --- */

    window.openHostLogin = typeof openHostLogin !== 'undefined' ? openHostLogin : null;

    window.closeHostLogin = typeof closeHostLogin !== 'undefined' ? closeHostLogin : null;

    window.handleHostEmailAuth = typeof handleHostEmailAuth !== 'undefined' ? handleHostEmailAuth : null;

    window.hostForgotPassword = typeof hostForgotPassword !== 'undefined' ? hostForgotPassword : null;

    window.toggleHostAuthMode = typeof toggleHostAuthMode !== 'undefined' ? toggleHostAuthMode : null;

    window.restartSong = typeof restartSong !== 'undefined' ? restartSong : null;

    window.changeTone = typeof changeTone !== 'undefined' ? changeTone : null;

    window.resetTone = typeof resetTone !== 'undefined' ? resetTone : null;

    window.changeVolume = typeof changeVolume !== 'undefined' ? changeVolume : null;

    window.setVideoVolume = typeof setVideoVolume !== 'undefined' ? setVideoVolume : null;

    window.toggleFullscreen = typeof toggleFullscreen !== 'undefined' ? toggleFullscreen : null;

    window.showScore = typeof showScore !== 'undefined' ? showScore : null;

    window.logoutHost = typeof logoutHost !== 'undefined' ? logoutHost : null;

    window.startHostTour = typeof startHostTour !== 'undefined' ? startHostTour : null;

    window.removePhoto = typeof removePhoto !== 'undefined' ? removePhoto : null;

    window.handlePhotoUpload = typeof handlePhotoUpload !== 'undefined' ? handlePhotoUpload : null;

    window.handleLogoUpload = typeof handleLogoUpload !== 'undefined' ? handleLogoUpload : null;

    window.togglePlay = typeof togglePlay !== 'undefined' ? togglePlay : null;

    window.addToQueue = typeof addToQueue !== 'undefined' ? addToQueue : null;

    window.confirmCompactSinger = typeof confirmCompactSinger !== 'undefined' ? confirmCompactSinger : null;

    // ─── Engajamento em Tempo Real (v20) ──────────────────────────────────────────

    function initReactionListener() {
        if (!currentRoomCode) return;
        console.log("📡 [REACTIONS] Ouvindo sala:", currentRoomCode);
        const reactionsRef = db.ref(`salas/${currentRoomCode}/reactions`);

        // Remove reações antigas (opcional, para limpar o DB)
        reactionsRef.remove().catch(e => console.warn("Erro ao limpar reações:", e));

        reactionsRef.on("child_added", (snapshot) => {
            const reaction = snapshot.val();
            console.log("🌸 [REACTIONS] Recebido:", reaction);
            if (reaction) {
                if (reaction.type === 'message') {
                    spawnFloatingMessage(reaction.text, reaction.sender, reaction.photo);
                } else if (reaction.emoji) {
                    spawnFloatingEmoji(reaction.emoji);
                }
            }
        });
    }

    function spawnFloatingMessage(text, sender, photo) {
        console.log("🌸 Spawning message bubble:", text, "from", sender);
        const container = document.getElementById("reactionContainer");
        if (!container) {
            console.error("❌ Container de reações não encontrado!");
            return;
        }

        const el = document.createElement("div");
        el.className = "floating-message-bubble";

        // Se houver foto, cria img, senão iniciais estilizadas
        const imgHtml = photo
            ? `<img src="${photo}" class="msg-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : `<div class="msg-avatar-initials">${(sender || 'C')[0].toUpperCase()}</div>`;

        el.innerHTML = `
            ${imgHtml}
            <div class="msg-body">
                <span class="msg-sender">${sender}</span>
                <p class="msg-text"></p>
            </div>
        `;

        // Fallback de iniciais caso o carregamento da imagem falhe
        if (photo) {
            const fallback = document.createElement("div");
            fallback.className = "msg-avatar-initials";
            fallback.style.display = "none";
            fallback.innerText = (sender || 'C')[0].toUpperCase();
            el.insertBefore(fallback, el.firstChild.nextSibling);
        }

        // Sanitização usando textContent contra XSS
        el.querySelector('.msg-text').textContent = text;

        // Posição horizontal aleatória (mais lateralizada)
        const side = Math.random() > 0.5 ? 'left' : 'right';
        if (side === 'left') {
            el.style.left = (Math.random() * 20 + 8) + "vw"; // 8% a 28%
        } else {
            el.style.right = (Math.random() * 20 + 8) + "vw"; // 8% a 28%
        }

        container.appendChild(el);

        // Remove do DOM após a animação de 6 segundos
        setTimeout(() => el.remove(), 6000);
    }

    function spawnFloatingEmoji(emoji) {
        console.log("🌸 Spawning emoji:", emoji);
        const container = document.getElementById("reactionContainer");
        if (!container) {
            console.error("❌ Container de reações não encontrado!");
            return;
        }

        const el = document.createElement("div");
        el.className = "floating-emoji";
        el.innerText = emoji;

        // Posição horizontal aleatória
        const startX = Math.random() * 80 + 10; // 10% a 90%
        el.style.left = startX + "vw"; // Use vw para container fixo

        // Variáveis CSS para trajetórias aleatórias
        el.style.setProperty("--random-x", (Math.random() * 200 - 100) + "px");
        el.style.setProperty("--random-x-end", (Math.random() * 400 - 200) + "px");

        container.appendChild(el);

        // Remove do DOM após a animação
        setTimeout(() => el.remove(), 4500);
    }

    function showApplauseAnimation() {
        const container = document.getElementById("playerContainer");
        if (!container) return;

        const overlay = document.createElement("div");
        overlay.className = "applause-overlay";
        overlay.innerHTML = `<div class="clapping-emoji">👏</div>`;

        container.appendChild(overlay);

        setTimeout(() => {
            overlay.style.transition = "opacity 1s";
            overlay.style.opacity = "0";
            setTimeout(() => overlay.remove(), 1000);
        }, 3000);
    }

    function renderRankingBoard(isAmbient = false) {
        const videoArea = isAmbient
            ? document.getElementById("ambientOverlayContent")
            : document.getElementById("player");
        if (!videoArea || sessionRanking.length === 0) return;

        // Limpa ranking e placeholders anteriores (apenas se não for ambient, para não quebrar o player de vídeo)
        if (!isAmbient) {
            videoArea.innerHTML = "";
        } else {
            const oldBoard = videoArea.querySelector(".ranking-board");
            if (oldBoard) oldBoard.remove();
        }

        const board = document.createElement("div");
        board.className = `ranking-board ${isAmbient ? 'is-ambient' : ''}`;

        let itemsHtml = "";
        sessionRanking.forEach((item, i) => {
            itemsHtml += `
                <div class="ranking-item">
                    <div class="rank-pos">${i + 1}º</div>
                    <div class="rank-singer">${item.singer}</div>
                    <div class="rank-score">${item.score}</div>
                </div>
            `;
        });

        board.innerHTML = `
            <h2 class="ranking-title">🏆 Melhores da Noite</h2>
            <div class="ranking-list">
                ${itemsHtml}
            </div>
        `;

        videoArea.appendChild(board);
    }

    // ─── Mobile Logic (v4.0) ──────────────────────────────────────────────────

    function initMobileTabs() {
        if (window.innerWidth > 900) return;
        // Garante que o catálogo seja a aba inicial
        switchMobileTab('catalog');
    }

    function switchMobileTab(tab) {
        const catalogTab = document.getElementById('tab-catalog');
        const queueTab = document.getElementById('tab-queue');
        const btnCat = document.getElementById('btn-tab-catalog');
        const btnQue = document.getElementById('btn-tab-queue');

        if (!catalogTab || !queueTab) return;

        if (tab === 'catalog') {
            catalogTab.classList.add('active-tab');
            queueTab.classList.remove('active-tab');
            if (btnCat) btnCat.classList.add('active');
            if (btnQue) btnQue.classList.remove('active');
        } else {
            catalogTab.classList.remove('active-tab');
            queueTab.classList.add('active-tab');
            if (btnCat) btnCat.classList.remove('active');
            if (btnQue) btnQue.classList.add('active');
        }
    }

    function toggleMobilePlayer(expand) {
        const playerContainer = document.getElementById('playerContainer');
        if (!playerContainer) return;

        if (expand) {
            playerContainer.classList.add('expanded');
        } else {
            playerContainer.classList.remove('expanded');
        }
    }

    // Exposure
    window.switchMobileTab = switchMobileTab;
    window.toggleMobilePlayer = toggleMobilePlayer;

    window.handlePhoneInput = function (el) {
        let v = el.value.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        let val = '';
        if (v.length > 0) val = '(' + v.substring(0, 2);
        if (v.length > 2) val += ') ' + v.substring(2, 7);
        if (v.length > 7) val += '-' + v.substring(7, 11);
        el.value = val;
    }

    window.moveQueue = typeof moveQueue !== 'undefined' ? moveQueue : null;
    window.removeFromQueue = typeof removeFromQueue !== 'undefined' ? removeFromQueue : null;
    window.playNext = typeof playNext !== 'undefined' ? playNext : null;
    window.skipSong = typeof skipSong !== 'undefined' ? skipSong : null;
    window.finishSong = typeof finishSong !== 'undefined' ? finishSong : null;
    window.showScore = typeof showScore !== 'undefined' ? showScore : null;
    window.spawnEmoji = typeof spawnFloatingEmoji !== 'undefined' ? spawnFloatingEmoji : null;

})();

