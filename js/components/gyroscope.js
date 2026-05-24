// js/components/gyroscope.js
// ─── Regard par gyroscope — actif UNIQUEMENT dans les mondes de toiles ────────
//
//  Utilise DeviceMotionEvent.rotationRate (vitesse angulaire du gyroscope).
//  Avantages vs DeviceOrientationEvent :
//    • Ne nécessite PAS de boussole (magnetomètre) → fonctionne sur TOUS les Android
//    • Même permission iOS 13+
//    • Réponse instantanée et directe
//
//  Axes corrects (W3C DeviceMotionEvent, portrait mode) :
//    • rate.gamma : rotation autour de l'axe Y (vertical) → yaw  (droite/gauche)
//    • rate.beta  : rotation autour de l'axe X (horizontal) → pitch (haut/bas)
//    • rate.alpha : rotation autour de l'axe Z (profondeur) → NE PAS utiliser pour le regard
//
//  ⚠️  alpha = spin du téléphone face vers le haut/bas (comme une toupie)
//      → valeur quasi-nulle quand on tourne normalement → c'était le BUG original.

const DEG        = Math.PI / 180;
const SENS_YAW   = 1.4;    // Sensibilité yaw  (gauche/droite)
const SENS_PITCH = 0.8;    // Sensibilité pitch (haut/bas) — légèrement adouci
const DEAD_ZONE  = 0.15;   // degrés/sec — filtre le bruit du capteur au repos

let _camera    = null;
let _active    = false;
let _supported = false;
let _granted   = false;   // true si permission accordée (iOS) ou automatique (Android)
let _lastTime  = 0;

// ─── Initialisation ───────────────────────────────────────────────────────────
export function setupGyroscope(camera) {
    _camera = camera;

    if (!window.DeviceMotionEvent) {
        console.info('[Gyro] DeviceMotionEvent non supporté sur cet appareil.');
        return;
    }

    _supported = true;

    // Android / navigateurs sans requestPermission → permission accordée d'emblée
    if (typeof DeviceMotionEvent.requestPermission !== 'function') {
        _granted = true;
        console.info('[Gyro] Android / non-iOS → permission automatique accordée.');
    }

    window.addEventListener('devicemotion', _onDeviceMotion, { passive: true });
    console.info('[Gyro] Listener devicemotion attaché. En attente d\'activation…');
}

// ─── Demande de permission iOS 13+ ───────────────────────────────────────────
//  ⚠️  Doit être appelé SANS await depuis un handler de clic synchrone.
//      (iOS révoque le "user activation" dès le premier await)
//  → Utiliser .then() côté appelant, jamais await.
export function requestGyroPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {

        // iOS 13+ — demande la permission dans le contexte du clic utilisateur
        return DeviceMotionEvent.requestPermission()
            .then(result => {
                const ok = (result === 'granted');
                _granted = ok;
                if (ok) {
                    console.info('[Gyro] ✅ Permission iOS accordée.');
                } else {
                    console.warn('[Gyro] ❌ Permission iOS refusée — le gyroscope sera inactif.');
                }
                return ok;
            })
            .catch(err => {
                console.warn('[Gyro] Erreur lors de la demande de permission :', err);
                _granted = false;
                return false;
            });
    }

    // Android et autres navigateurs : aucune permission nécessaire
    _granted = true;
    return Promise.resolve(true);
}

// ─── Activation (appeler quand on entre dans une toile) ───────────────────────
export function activateGyroscope() {
    if (!_camera || !_supported) {
        console.warn('[Gyro] Activation ignorée — camera:', !!_camera, '/ supporté:', _supported);
        return;
    }
    if (!_granted) {
        console.warn('[Gyro] Activation ignorée — permission non encore accordée.',
                     'Sur iOS : le bouton "Entrer dans le musée" doit être pressé en premier.');
        return;
    }
    _lastTime = performance.now();
    _active   = true;
    console.info('[Gyro] ✅ Gyroscope actif — bougez le téléphone pour regarder autour.');
}

// ─── Désactivation (appeler quand on sort d'une toile) ────────────────────────
export function deactivateGyroscope() {
    _active = false;
    console.info('[Gyro] Désactivé.');
}

// ─── État ─────────────────────────────────────────────────────────────────────
export function isGyroActive()    { return _active; }
export function isGyroSupported() { return _supported && _granted; }

// ─── Handler vitesse angulaire ────────────────────────────────────────────────
function _onDeviceMotion(e) {
    if (!_active || !_camera) return;

    const rate = e.rotationRate;
    if (!rate) return;

    // Certains capteurs retournent null sur tous les axes quand indisponibles
    if (rate.gamma === null && rate.beta === null) return;

    // Delta-temps en secondes — capé à 50 ms pour éviter les sauts après mise en veille
    const now = performance.now();
    const dt  = _lastTime ? Math.min((now - _lastTime) / 1000, 0.05) : 0.016;
    _lastTime = now;

    // ── Yaw — rotation gauche/droite ─────────────────────────────────────────
    //
    //  rate.gamma = vitesse de rotation autour de l'axe Y du téléphone (axe vertical
    //  en portrait, W3C spec adapté à l'orientation écran).
    //
    //  Téléphone tourné à DROITE → gamma < 0 (sens horaire vu du dessus)
    //  En THREE.js (YXZ) : rotation.y diminue = regarder à droite
    //  → camera.rotation.y += gamma * dt   (ajouter une valeur négative = diminue ✓)
    //
    if (rate.gamma !== null) {
        const yaw = rate.gamma;
        if (Math.abs(yaw) > DEAD_ZONE) {
            _camera.rotation.y += yaw * dt * DEG * SENS_YAW;
        }
    }

    // ── Pitch — inclinaison haut/bas ──────────────────────────────────────────
    //
    //  rate.beta = vitesse de rotation autour de l'axe X du téléphone (horizontal).
    //  Incliner le haut du téléphone vers soi (lever les yeux) → beta > 0
    //  En THREE.js (YXZ) : rotation.x diminue = regarder vers le haut
    //  → camera.rotation.x -= beta * dt
    //
    if (rate.beta !== null) {
        const pitch = rate.beta;
        if (Math.abs(pitch) > DEAD_ZONE) {
            _camera.rotation.x -= pitch * dt * DEG * SENS_PITCH;
        }
    }

    // Clamp vertical (évite le salto arrière)
    _camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, _camera.rotation.x));
}
