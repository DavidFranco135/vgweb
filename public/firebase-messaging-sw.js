// public/firebase-messaging-sw.js
// ─────────────────────────────────────────────────────────────────
// Este arquivo DEVE ficar em /public/firebase-messaging-sw.js
// para ser servido na raiz do site (requisito do Firebase FCM).
//
// Ele é responsável por mostrar notificações push quando o app
// está fechado ou em background.
// ─────────────────────────────────────────────────────────────────

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDhvezaII8Q77ydkl97ggothgjcwCqVMRQ",
  authDomain:        "giganet-1d32c.firebaseapp.com",
  projectId:         "giganet-1d32c",
  storageBucket:     "giganet-1d32c.firebasestorage.app",
  messagingSenderId: "56077285821",
  appId:             "1:56077285821:web:fca406a59c0f5138937ad4",
});

const messaging = firebase.messaging();

// Notificação em background / app fechado
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Notificação em background:', payload);

  const { title, body, icon, badge, data } = payload.notification ?? {};

  self.registration.showNotification(title || 'VgWeb Telecom', {
    body:    body    || '',
    icon:    icon    || '/icon-192.png',
    badge:   badge   || '/favicon-32.png',
    tag:     data?.tipo || 'giganet',
    data:    payload.data || {},
    vibrate: [200, 100, 200],
    actions: [
      { action: 'abrir', title: 'Abrir app' },
      { action: 'fechar', title: 'Fechar' },
    ],
  });
});

// Clique na notificação — abre o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'fechar') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tem uma aba aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Senão abre uma nova
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
