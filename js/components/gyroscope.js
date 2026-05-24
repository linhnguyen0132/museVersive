// js/components/gyroscope.js
// ─── Regard par gyroscope — actif UNIQUEMENT dans les mondes de toiles ────────
//
//  Utilise DeviceMotionEvent.rotationRate (vitesse angulaire du gyroscope).
//  Avantages vs DeviceOrientationEvent :
//    • Ne nécessite PAS de boussole (magnetomètre) → fonctionne sur TOUS les Android
//    • Même permission iOS 13+
//    • Réponse instantanée et directe
//
//  Mapping mode portrait :
//    • Tourner le téléphone droite/gauche → rotation.y (yaw)
//    • Incliner haut/bas                  → rotation.x (pitch)

const DEG         = Math.PI / 180;
const SENS_YAW    = 1.4;   // Ajuste si trop/pas assez sensible en rotation
const SENS_PITCH  = 0.8;   // Légèrement adouci pour le pitch

let _camera    = null;
let _active    = false;
let _supported = false;
let _lastTime  = 0;

// ─── Initialisation ───────────────────────────────────────────────────────────
export function setupGyroscope(camera) {
    _camera = camera;

    if (!window.DeviceMotionEvent) {
        console.info('[Gyro] DeviceMotionEvent non supporté sur cet appareil.');
        return;
    }

    window.addEventListener('devicemotion', _onDeviceMotion, { passive: true });
    _supported = true;
    console.info('[Gyro] Listener devicemotion attaché. En attente d\'activation…');
}

// ─── Demande de permission iOS 13+ ───────────────────────────────────────────
//  ⚠️  Doit être appelé SANS await depuis un handler de clic synchrone.
//      (iOS révoque le "user activation" dès le premier await)
export function requestGyroPermission() {
    // iOS 13+ : DeviceMotionEvent.requestPermission est une fonction
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
        return DeviceMotionEvent.requestPermission()
            .then(result => {
                console.info('[Gyro] Permission iOS (DeviceMotion) :', result);
                return result === 'granted';
            })
            .catch(err => {
                console.warn('[Gyro] Permission refusée :', err);
                return false;
            });
    }
    // Android et autres : aucune permission nécessaire
    return Promise.resolve(true);
}

// ─── Activation (appeler quand on entre dans une toile) ───────────────────────
export function activateGyroscope() {
    if (!_camera || !_supported) {
        console.warn('[Gyro] Activation ignorée — camera:', !!_camera, '/ supporté:', _supported);
        return;
    }
    _lastTime = performance.now();
    _active   = true;
    console.info('[Gyro] ✅ Activé. Bouge le téléphone pour regarder autour.');
}

// ─── Désactivation (appeler quand on sort d'une toile) ────────────────────────
export function deactivateGyroscope() {
    _active = false;
    console.info('[Gyro] Désactivé.');
}

// ─── État ─────────────────────────────────────────────────────────────────────
export function isGyroActive()    { return _active; }
export function isGyroSupported() { return _supported; }

// ─── Handler vitesse angulaire ────────────────────────────────────────────────
function _onDeviceMotion(e) {
    if (!_active || !_camera) return;

    const rate = e.rotationRate;
    // rotationRate peut être null si le capteur n'est pas disponible
    if (!rate || (rate.alpha === null && rate.beta === null)) return;

    // Calcul du delta-temps (secondes) — évite les sauts si le tab était en pause
    const now = performance.now();
    const dt  = _lastTime ? Math.min((now - _lastTime) / 1000, 0.05) : 0.016;
    _lastTime = now;

    // ── rotationRate en degrés/seconde ────────────────────────────────────────
    //
    //  alpha : rotation autour de l'axe Z du téléphone (vertical en portrait)
    //    → téléphone tourne à DROITE  → alpha négatif (sens horaire = main droite)
    //    → camera.rotation.y doit augmenter (THREE.js YXZ : +y = regarder à gauche)
    //    → camera.rotation.y += rate.alpha * dt   (le signe - de alpha est déjà bon)
    //
    //  beta  : rotation autour de l'axe X du téléphone (horizontal en portrait)
    //    → incliner le haut du téléphone vers soi (regarder le haut) → beta positif
    //    → camera.rotation.x doit diminuer (THREE.js YXZ : -x = regarder en haut)
    //    → camera.rotation.x -= rate.beta * dt
    //
    if (rate.alpha !== null) {
        _camera.rotation.y += rate.alpha * dt * DEG * SENS_YAW;
    }
    if (rate.beta !== null) {
        _camera.rotation.x -= rate.beta  * dt * DEG * SENS_PITCH;
    }

    // Clamp vertical (pas de salto arrière)
    _camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, _camera.rotation.x));
}
