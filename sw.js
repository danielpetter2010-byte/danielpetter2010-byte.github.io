/* Tempo da Lavoura — service worker
   Ao publicar uma versão nova do site, aumente o número abaixo (v1 → v2…) para limpar o cache antigo. */
const VERSION = "lavoura-v3";
const SHELL = ["./", "index.html", "manifest.webmanifest", "politica-privacidade.html", "icons/icon-192.png", "icons/icon-512.png"];
const LIVE = ["api.open-meteo.com", "geocoding-api.open-meteo.com", "api.rainviewer.com", "photon.komoot.io", "nominatim.openstreetmap.org", "tile.openstreetmap.org", "tilecache.rainviewer.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Dados ao vivo: sempre da internet (o próprio app guarda a última previsão para uso offline)
  if (LIVE.some(h => url.hostname === h || url.hostname.endsWith("." + h))) return;

  // Página: tenta a internet primeiro, para receber atualizações; sem internet, usa a cópia salva
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match("index.html")))
    );
    return;
  }

  // Bibliotecas, fontes e ícones: usa o cache e atualiza em segundo plano
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
