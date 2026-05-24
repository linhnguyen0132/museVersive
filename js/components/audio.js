// js/components/audio.js

const TRACKS = {
    'La Nuit étoilée':         null, // ex: 'assets/sounds/starry_night.mp3'  (ex. "Vincent" – Don McLean)
    'Le Cri':                  null, // ex: 'assets/sounds/le_cri.mp3'        (ex. Grieg – In the Hall of the Mountain King)
    'Chasseurs dans la neige': null, // ex: 'assets/sounds/hiver.mp3'         (ex. Vivaldi – L'Hiver)
    'Le Café de nuit':         null, // ex: 'assets/sounds/cafe.mp3'          (ex. ambiance jazz / bistrot parisien)
};

const FADE_STEPS    = 40;
const FADE_INTERVAL = 60; // ms

let current = null;
let fadeTimer = null;

export function playWorldMusic(artworkName) {
    stopWorldMusic();
    const path = TRACKS[artworkName];
    if (!path) return;

    current = new Audio(path);
    current.loop = true;
    current.volume = 0;
    current.play().catch(() => {}); // autoplay bloqué → silencieux

    let step = 0;
    fadeTimer = setInterval(() => {
        if (!current) return clearInterval(fadeTimer);
        current.volume = Math.min(1, ++step / FADE_STEPS);
        if (step >= FADE_STEPS) clearInterval(fadeTimer);
    }, FADE_INTERVAL);
}

export function stopWorldMusic() {
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
    if (!current) return;
    const audio = current;
    current = null;
    let v = audio.volume;
    const t = setInterval(() => {
        audio.volume = Math.max(0, v -= 1 / FADE_STEPS);
        if (audio.volume <= 0) { clearInterval(t); audio.pause(); }
    }, FADE_INTERVAL);
}
