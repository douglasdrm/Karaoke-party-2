(() => {
    'use strict';

    const firebaseConfig = {
        apiKey: 'AIzaSyCnZ8hoE3NGNx2t490Yw12AxlCqVjSguig',
        authDomain: 'karaoke-party-online.firebaseapp.com',
        databaseURL: 'https://karaoke-party-online-default-rtdb.firebaseio.com',
        projectId: 'karaoke-party-online',
        storageBucket: 'karaoke-party-online.firebasestorage.app',
        messagingSenderId: '1059879567957',
        appId: '1:1059879567957:web:d4cb88563b39fe08934adc'
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.database();

    const elements = {
        loading: document.getElementById('mobileDjLoading'),
        auth: document.getElementById('mobileDjAuth'),
        connect: document.getElementById('mobileDjConnect'),
        dashboard: document.getElementById('mobileDjDashboard'),
        logout: document.getElementById('mobileDjLogout'),
        authError: document.getElementById('mobileDjAuthError'),
        roomError: document.getElementById('mobileDjRoomError'),
        roomInput: document.getElementById('mobileDjRoomCode'),
        identity: document.getElementById('mobileDjIdentity'),
        partyName: document.getElementById('mobileDjPartyName'),
        roomLabel: document.getElementById('mobileDjRoomLabel'),
        audienceCount: document.getElementById('mobileDjAudienceCount'),
        connection: document.getElementById('mobileDjConnection'),
        playbackDot: document.getElementById('mobileDjPlaybackDot'),
        playbackLabel: document.getElementById('mobileDjPlaybackLabel'),
        nowTitle: document.getElementById('mobileNowTitle'),
        nowMeta: document.getElementById('mobileNowMeta'),
        playIcon: document.getElementById('mobileDjPlayIcon'),
        playLabel: document.getElementById('mobileDjPlayLabel'),
        volume: document.getElementById('mobileDjVolume'),
        volumeValue: document.getElementById('mobileDjVolumeValue'),
        queue: document.getElementById('mobileDjQueue'),
        queueCount: document.getElementById('mobileDjQueueCount'),
        singerLink: document.getElementById('mobileDjSingerLink'),
        feedback: document.getElementById('mobileDjFeedback')
    };

    let currentUser = null;
    let currentRoom = '';
    let currentNowPlaying = null;
    let feedbackTimer = null;
    let authStateVersion = 0;
    const roomListeners = [];

    function showOnly(target) {
        [elements.loading, elements.auth, elements.connect, elements.dashboard].forEach((section) => {
            const isVisible = section === target;
            section.hidden = !isVisible;
            section.setAttribute('aria-hidden', String(!isVisible));

            // Alguns navegadores móveis permitem que uma regra `display` da página
            // prevaleça durante a troca de estado. O estilo inline garante que uma
            // tela antiga (principalmente o login) não continue sobre a atual.
            if (isVisible) section.style.removeProperty('display');
            else section.style.setProperty('display', 'none', 'important');
        });
    }

    function showError(element, message = '') {
        element.textContent = message;
        element.hidden = !message;
    }

    function roomCode(value) {
        return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    }

    function setFeedback(message, isError = false) {
        clearTimeout(feedbackTimer);
        elements.feedback.textContent = message;
        elements.feedback.classList.toggle('is-error', isError);
        elements.feedback.classList.add('is-visible');
        feedbackTimer = setTimeout(() => elements.feedback.classList.remove('is-visible'), 2600);
    }

    function detachRoom() {
        roomListeners.splice(0).forEach(({ reference, event, handler }) => reference.off(event, handler));
        currentRoom = '';
        currentNowPlaying = null;
    }

    function listen(reference, event, handler) {
        reference.on(event, handler);
        roomListeners.push({ reference, event, handler });
    }

    function parseQueue(value) {
        if (!value) return [];
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return Array.isArray(parsed) ? parsed : Object.values(parsed || {});
        } catch (error) {
            console.warn('Fila inválida recebida da Cabine PC.', error);
            return [];
        }
    }

    function renderQueue(items) {
        elements.queue.replaceChildren();
        elements.queueCount.textContent = `${items.length} ${items.length === 1 ? 'música' : 'músicas'}`;
        if (!items.length) {
            const empty = document.createElement('li');
            empty.className = 'empty-mobile-queue';
            empty.textContent = 'A fila está vazia.';
            elements.queue.append(empty);
            return;
        }

        items.forEach((item, index) => {
            const row = document.createElement('li');
            if (index === 0) row.classList.add('is-current');
            const position = document.createElement('span');
            position.className = 'mobile-queue-position';
            position.textContent = index === 0 ? 'NO PALCO' : String(index + 1).padStart(2, '0');
            const copy = document.createElement('div');
            const singer = document.createElement('strong');
            singer.textContent = item.singer || 'Cantor';
            const song = document.createElement('span');
            song.textContent = [item.title, item.artist].filter(Boolean).join(' · ') || 'Música';
            copy.append(singer, song);
            row.append(position, copy);
            elements.queue.append(row);
        });
    }

    function renderNowPlaying(value) {
        currentNowPlaying = value || null;
        const playing = value?.playing === true;
        const hasSong = Boolean(value?.title);
        elements.playbackDot.classList.toggle('is-playing', playing);
        elements.playbackLabel.textContent = playing ? 'TOCANDO AGORA' : (hasSong ? 'PAUSADO' : 'AGUARDANDO');
        elements.nowTitle.textContent = hasSong ? value.title : 'Nenhuma música no palco';
        elements.nowMeta.textContent = hasSong
            ? [value.artist, value.singer].filter(Boolean).join(' · ')
            : 'A fila aparecerá aqui quando a festa começar.';
        elements.playIcon.textContent = playing ? 'Ⅱ' : '▶';
        elements.playLabel.textContent = playing ? 'Pausar' : (hasSong ? 'Continuar' : 'Iniciar');
    }

    async function sendCommand(action, payload = {}) {
        if (!currentRoom || !currentUser) return;
        try {
            await db.ref(`salas/${currentRoom}/host_commands`).push().set({
                action,
                payload,
                senderUid: currentUser.uid,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            setFeedback('Comando enviado para a Cabine PC.');
        } catch (error) {
            console.error('Falha ao enviar comando:', error);
            setFeedback('Não foi possível controlar a Cabine PC.', true);
        }
    }

    function bindRoom(code) {
        detachRoom();
        currentRoom = code;
        try { localStorage.setItem('lastDjRemoteRoom', code); } catch {}
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('room', code);
        history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}`);

        elements.roomLabel.textContent = `Sala ${code}`;
        elements.singerLink.href = `mobile.html?room=${encodeURIComponent(code)}&from=dj`;

        const base = db.ref(`salas/${code}`);
        listen(base.child('info'), 'value', (snapshot) => {
            const info = snapshot.val();
            if (!info) {
                elements.connection.textContent = 'CABINE PC DESCONECTADA';
                elements.connection.classList.add('is-offline');
                setFeedback('A sala foi encerrada ou perdeu a conexão.', true);
                return;
            }
            elements.connection.textContent = 'CONECTADO À CABINE PC';
            elements.connection.classList.remove('is-offline');
            elements.partyName.textContent = info.name || 'Minha festa';
        });
        listen(base.child('queue_v13'), 'value', (snapshot) => renderQueue(parseQueue(snapshot.val())));
        listen(base.child('now_playing'), 'value', (snapshot) => renderNowPlaying(snapshot.val()));
        listen(base.child('host_state'), 'value', (snapshot) => {
            const state = snapshot.val() || {};
            const volume = Number(state.volume);
            if (Number.isFinite(volume) && document.activeElement !== elements.volume) {
                elements.volume.value = String(Math.max(0, Math.min(1, volume)));
                elements.volumeValue.textContent = `${Math.round(Number(elements.volume.value) * 100)}%`;
            }
        });
        listen(base.child('active_users'), 'value', (snapshot) => {
            const count = snapshot.numChildren();
            elements.audienceCount.textContent = `${count} ${count === 1 ? 'pessoa' : 'pessoas'}`;
        });
        showOnly(elements.dashboard);
    }

    async function connectRoom(code) {
        const normalized = roomCode(code);
        showError(elements.roomError);
        if (normalized.length !== 5) {
            showError(elements.roomError, 'Digite o código completo de cinco caracteres.');
            return false;
        }

        const snapshot = await db.ref(`salas/${normalized}/info`).once('value');
        const info = snapshot.val();
        if (!info) {
            showError(elements.roomError, 'Sala não encontrada. Confirme o código exibido na Cabine PC.');
            return false;
        }
        if (info.hostId !== currentUser?.uid) {
            showError(elements.roomError, 'Esta sala pertence a outro DJ. Entre com a conta usada para abrir a festa.');
            return false;
        }
        bindRoom(normalized);
        return true;
    }

    document.getElementById('mobileDjGoogle').addEventListener('click', async (event) => {
        showError(elements.authError);
        const button = event.currentTarget;
        button.disabled = true;
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const credential = await auth.signInWithPopup(provider);
            if (credential.user) showOnly(elements.connect);
        } catch (error) {
            console.warn('Login Google da Cabine móvel recusado:', error.code);
            if (error.code === 'auth/popup-blocked') {
                showError(elements.authError, 'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente (auth/popup-blocked).');
            } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                const errorCode = error.code ? ` (${error.code})` : '';
                showError(elements.authError, `Não foi possível entrar com Google${errorCode}.`);
            }
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById('mobileDjEmailForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        showError(elements.authError);
        const button = event.currentTarget.querySelector('[type="submit"]');
        button.disabled = true;
        try {
            const credential = await auth.signInWithEmailAndPassword(
                document.getElementById('mobileDjEmail').value.trim(),
                document.getElementById('mobileDjPassword').value
            );
            // Não espera a leitura da sala para retirar o formulário de login.
            if (credential.user) showOnly(elements.connect);
        } catch (error) {
            console.warn('Login da Cabine móvel recusado:', error.code);
            showError(elements.authError, 'E-mail ou senha inválidos.');
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById('mobileDjRoomForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            await connectRoom(elements.roomInput.value);
        } catch (error) {
            console.error('Erro ao conectar à sala:', error);
            showError(elements.roomError, 'Não foi possível consultar essa sala agora.');
        }
    });

    elements.roomInput.addEventListener('input', () => {
        elements.roomInput.value = roomCode(elements.roomInput.value);
    });

    document.getElementById('mobileDjChangeRoom').addEventListener('click', () => {
        const previous = currentRoom;
        detachRoom();
        elements.roomInput.value = previous;
        showOnly(elements.connect);
        elements.roomInput.focus();
    });

    elements.logout.addEventListener('click', async () => {
        detachRoom();
        await auth.signOut();
    });

    document.querySelectorAll('[data-host-command]').forEach((button) => {
        button.addEventListener('click', () => sendCommand(button.dataset.hostCommand));
    });

    let volumeTimer = null;
    elements.volume.addEventListener('input', () => {
        const value = Number(elements.volume.value);
        elements.volumeValue.textContent = `${Math.round(value * 100)}%`;
        clearTimeout(volumeTimer);
        volumeTimer = setTimeout(() => sendCommand('volume', { value }), 120);
    });

    auth.onAuthStateChanged(async (user) => {
        const stateVersion = ++authStateVersion;
        currentUser = user;
        elements.logout.hidden = !user;
        if (!user) {
            detachRoom();
            showOnly(elements.auth);
            return;
        }

        elements.identity.textContent = `Conectado como ${user.displayName || user.email || 'DJ'}`;
        // A autenticação já terminou. Mostra a próxima etapa imediatamente e
        // restaura uma sala anterior em segundo plano.
        showOnly(elements.connect);
        const params = new URLSearchParams(window.location.search);
        let savedRoom = params.get('room');
        if (!savedRoom) {
            try { savedRoom = localStorage.getItem('lastDjRemoteRoom'); } catch {}
        }
        if (savedRoom) {
            elements.roomInput.value = roomCode(savedRoom);
            try {
                if (await connectRoom(savedRoom) && stateVersion === authStateVersion && currentUser) return;
            } catch (error) {
                console.warn('Sala anterior indisponível:', error);
            }
        }
        if (stateVersion === authStateVersion && currentUser) showOnly(elements.connect);
    });

    window.addEventListener('pagehide', detachRoom);
})();
