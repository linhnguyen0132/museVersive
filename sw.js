// ─────────────────────────────────────────────────────────────────────────────
// MuseVersive — Service Worker  (PWA hors-ligne complète)
//
// Stratégies de cache :
//   Ressources locales  → Cache-first  (chargement instantané + hors-ligne)
//   CDN (Three.js, GSAP, nipplejs, Google Fonts)
//                       → Network-first → mise en cache à la volée
//
// Caches séparés :
//   muse-static-vN  : HTML, CSS, JS, textures, icônes, couches animées
//   muse-media-vN   : panoramas (.jpg), audio (.wav), modèles 3D (.glb)
//   muse-cdn-vN     : Three.js, GSAP, nipplejs (mis en cache au runtime)
//
// Pour forcer un rechargement du cache : incrémenter VERSION ci-dessous.
// ─────────────────────────────────────────────────────────────────────────────

const VERSION      = 'v5';
const CACHE_STATIC = `muse-static-${VERSION}`;
const CACHE_MEDIA  = `muse-media-${VERSION}`;
const CACHE_CDN    = `muse-cdn-${VERSION}`;
const ALL_CACHES   = [CACHE_STATIC, CACHE_MEDIA, CACHE_CDN];

// Domaines CDN interceptés au runtime
const CDN_HOSTS = [
    'unpkg.com',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
];

// ── Ressources statiques ── installation bloquante (toutes obligatoires) ──────
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/style.css',

    // Scripts applicatifs
    '/js/main.js',
    '/js/components/museum.js',
    '/js/components/interaction.js',
    '/js/components/worlds.js',
    '/js/components/gyroscope.js',
    '/js/components/artworks.js',
    '/js/components/audio.js',
    '/js/components/lighting.js',
    '/js/components/npc.js',
    '/js/components/piano.js',

    // Icônes PWA (home screen)
    '/assets/icons/192.png',
    '/assets/icons/512.png',

    // Textures du musée
    '/assets/textures/parquet1.jpg',
    '/assets/textures/ceiling_white.jpg',
    '/assets/textures/snowflake.jpg',

    // Surfaces des tableaux
    '/assets/textures/starry_night.jpg',
    '/assets/textures/winter.png',
    '/assets/textures/scream.jpg',
    '/assets/textures/city.png',

    // Couches animées (Scream + Starry Night)
    '/assets/painting/theScream/layers/the-scream-figure.png',
    '/assets/painting/theScream/layers/the-scream-sky1.png',
    '/assets/painting/starryNight/layers/starry_night-tree.png',
];

// ── Ressources media ── téléchargées en arrière-plan (non bloquantes) ─────────
// Un échec sur un fichier n'annule pas l'installation.
const MEDIA_ASSETS = [
    // Panoramas immersifs
    '/assets/panoramas/starry_night_pano.jpg',
    '/assets/panoramas/the_scream_pano.jpg',
    '/assets/panoramas/winter_scene_pano.jpg',
    '/assets/panoramas/thorn_town_hall_pano.jpg',

    // Audio ambiant (fade-in/out dans les toiles)
    '/assets/audio/mergedStarry.wav',
    '/assets/audio/mergedScream.wav',
    '/assets/audio/mergedWinter.wav',
    '/assets/audio/mergedCity.wav',

    // Modèles 3D (NPCs + décoration)
    '/models/Standing idle (2).glb',
    '/models/Standing idle (3).glb',
    '/models/Thinking.glb',
    '/models/Pointing.glb',
    '/models/Walking.glb',
    '/models/Sitting.glb',
    '/models/plant2.glb',
    '/models/grand_piano.glb',
    '/models/statue.glb',
];

// ═════════════════════════════════════════════════════════════════════════════
// INSTALL — pré-cache toutes les ressources essentielles
// ═════════════════════════════════════════════════════════════════════════════
self.addEventListener('install', event => {
    // Active immédiatement sans attendre la fermeture des onglets existants
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then(cache => {
                console.info('[SW] Installation — mise en cache des ressources statiques…');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => caches.open(CACHE_MEDIA))
            .then(cache => {
                console.info('[SW] Installation — mise en cache des médias (arrière-plan)…');
                // Promise.allSettled : un fichier manquant ne fait pas échouer le reste
                return Promise.allSettled(
                    MEDIA_ASSETS.map(url =>
                        cache.add(url).catch(err =>
                            console.warn(`[SW] Media ignoré (introuvable ou réseau) : ${url}`, err)
                        )
                    )
                );
            })
            .then(() => console.info('[SW] Installation terminée ✅'))
    );
});

// ═════════════════════════════════════════════════════════════════════════════
// ACTIVATE — supprime les anciens caches, prend le contrôle immédiatement
// ═════════════════════════════════════════════════════════════════════════════
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(k => !ALL_CACHES.includes(k))
                    .map(k => {
                        console.info(`[SW] Suppression ancien cache : ${k}`);
                        return caches.delete(k);
                    })
            ))
            // Prend le contrôle de TOUS les onglets ouverts sans rechargement
            .then(() => self.clients.claim())
            .then(() => console.info('[SW] Activation — contrôle des clients ✅'))
    );
});

// ═════════════════════════════════════════════════════════════════════════════
// FETCH — routing par stratégie selon l'origine de la requête
// ═════════════════════════════════════════════════════════════════════════════
self.addEventListener('fetch', event => {
    const { request } = event;

    // On ne gère que les GET
    if (request.method !== 'GET') return;

    let url;
    try { url = new URL(request.url); } catch { return; }

    // Ignore les extensions navigateur et les data-URIs
    if (!url.protocol.startsWith('http')) return;

    // ── CDN externe → Network-first, cache en fallback ───────────────────────
    if (CDN_HOSTS.some(h => url.hostname.includes(h))) {
        event.respondWith(networkFirstCDN(request));
        return;
    }

    // ── Ressource locale → Cache-first, réseau si absent ────────────────────
    event.respondWith(cacheFirst(request));
});

// ─── Stratégie Cache-first (ressources locales) ───────────────────────────────
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Absent du cache → réseau + mise en cache pour la prochaine fois
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cacheName = _mediaCache(request.url) ? CACHE_MEDIA : CACHE_STATIC;
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        console.warn('[SW] Inaccessible hors-ligne :', request.url);
        return new Response(
            JSON.stringify({ error: 'offline' }),
            { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// ─── Stratégie Network-first (CDN) ───────────────────────────────────────────
async function networkFirstCDN(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_CDN);
            cache.put(request, response.clone());   // met en cache pour usage hors-ligne
        }
        return response;
    } catch {
        // Réseau indisponible → on sert depuis le cache CDN
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('', {
            status: 503,
            statusText: 'CDN indisponible hors-ligne — rechargez en ligne une première fois',
        });
    }
}

// ─── Détermine si l'URL appartient au cache media ────────────────────────────
function _mediaCache(url) {
    return url.includes('/assets/audio/')
        || url.includes('/assets/panoramas/')
        || url.includes('/models/');
}
