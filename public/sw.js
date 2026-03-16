// Service Worker minimalista para permitir instalação como PWA
const CACHE_NAME = 'limpflix-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Apenas passa as requisições, sem cache complexo por enquanto
  event.respondWith(fetch(event.request));
});
