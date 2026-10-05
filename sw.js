self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Recebe a mensagem do mobile.html e dispara o pop-up nativo
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data.payload;

    // Força o Service Worker a mostrar a notificação nativa do sistema
    self.registration.showNotification(title, {
      body: body || 'Aviso do Karaokê!',
      // sw.js está na RAIZ (Web_Version/), então o caminho é relativo à raiz, sem '../'
      icon: './Assets/icon-192.png',
      badge: './Assets/icon-192.png',
      vibrate: [300, 100, 300, 100, 500], // Padrão de vibração
      tag: 'karaoke-alert-' + Date.now(), // Tag única força o celular a tratar como nova notificação
      requireInteraction: true // Mantém a notificação visível até o usuário interagir
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});