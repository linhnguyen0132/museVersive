// js/components/gyroscope.js
// ─── Regard par gyroscope (actif UNIQUEMENT dans les mondes de toiles) ────────
//
//  Utilise l'API DeviceOrientationEvent du navigateur.
//  Sur iOS 13+, une permission explicite est requise (lancée depuis un geste user).
//  Sur Android, aucune permission n'est nécessaire.
//
//  Mapping mode portrait :
//   • Tourner le téléphone à droite/gauche  → yaw caméra   (rotation.y)
//   • Incliner haut/bas                     → pitch caméra  (rotation.x)

const DEG              = Math.PI / 180;
const GYRO_SENSITIVITY = 1.1;   // Multiplicateur global (1.0 = neutre)
const PITCH_FACTOR     = 0.75;  // L'inclinaison haut/bas est légèrement adoucie

let _camera      = null;
let _active      = false;
let _supported   = false;

// Baseline téléphone (prise au 1er événement après activation)
let _baseAlpha   = null;
let _baseBeta    = null;

// Baseline caméra (prise au moment de l'activation)
let _baseCameraY = 0;
let _baseCameraX = 0;

// ─── Initialisation ───────────────────────────────────────────────────────────
export function setupGyroscope(camera) {
    _camera = camera;

    if (!window.DeviceOrientationEvent) {
        console.info('[Gyro] DeviceOrientationEvent non supporté sur cet appareil.');
        return;
    }

    _supported = true;
    window.addEventListener('deviceorientation', _onDeviceOrientation, { passive: true });
    console.info('[Gyro] Prêt.');
}

// ─── Demande de permission iOS 13+ ────────────────────────────────────────────
//  Doit être appelé depuis un gestionnaire de clic (exigence iOS).
export async function requestGyroPermission() {
    if (!_supported) return false;

    // iOS 13+ : DeviceOrientationEvent.requestPermission est une fonction
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const result = await DeviceOrientationEvent.requestPermission();
            const granted = result === 'granted';
            console.info(`[Gyro] Permission iOS : ${result}`);
            return granted;
        } catch (err) {
            console.warn('[Gyro] Permission refusée ou erreur :', err);
            return false;
        }
    }

    // Android & autres navigateurs : pas de permission nécessaire
    return true;
}

// ─── Activation (appeler quand on entre dans une toile) ───────────────────────
export function activateGyroscope() {
    if (!_camera || !_supported) return;

    // Mémorise la rotation de la caméra au moment de l'activation
    // (après loadArtworkWorld qui remet la caméra à zéro)
    _baseCameraY = _camera.rotation.y;
    _baseCameraX = _camera.rotation.x;

    // La baseline téléphone sera capturée au 1er événement capteur
    _baseAlpha = null;
    _baseBeta  = null;

    _active = true;
    console.info('[Gyro] Activé.');
}

// ─── Désactivation (appeler quand on sort d'une toile) ────────────────────────
export function deactivateGyroscope() {
    _active = false;
    console.info('[Gyro] Désactivé.');
}

// ─── État courant ─────────────────────────────────────────────────────────────
export function isGyroActive()    { return _active; }
export function isGyroSupported() { return _supported; }

// ─── Handler capteur ──────────────────────────────────────────────────────────
function _onDeviceOrientation(e) {
    if (!_active || !_camera) return;
    if (e.alpha === null || e.beta === null) return;  // Capteur non disponible

    // 1er événement après activation : enregistre la position initiale du téléphone
    if (_baseAlpha === null) {
        _baseAlpha = e.alpha;
        _baseBeta  = e.beta;
        return;   // Pas de mouvement cette frame
    }

    // ─── Delta depuis la position initiale (mode absolu, sans drift) ─────────
    let dAlpha = e.alpha - _baseAlpha;
    let dBeta  = e.beta  - _baseBeta;

    // Correction du passage 0° ↔ 360° pour alpha (ex: 358° → 2° = +4°, pas -356°)
    if (dAlpha >  180) dAlpha -= 360;
    if (dAlpha < -180) dAlpha += 360;

    // ─── Application à la caméra (mode portrait) ─────────────────────────────
    //
    //  dAlpha positif = téléphone tourné vers la DROITE (aiguilles d'une montre)
    //    → camera.rotation.y doit DIMINUER pour regarder à droite (convention YXZ)
    //
    //  dBeta positif = téléphone incliné vers l'AVANT (haut du téléphone s'éloigne)
    //    → camera.rotation.x doit AUGMENTER pour regarder en haut
    //    (en YXZ, -X = regard vers le haut)
    //
    _camera.rotation.y = _baseCameraY - dAlpha * DEG * GYRO_SENSITIVITY;
    _camera.rotation.x = _baseCameraX + dBeta  * DEG * GYRO_SENSITIVITY * PITCH_FACTOR;

    // Limite verticale (évite le salto complet)
    _camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, _camera.rotation.x));
}
