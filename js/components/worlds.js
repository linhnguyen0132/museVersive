// js/components/worlds.js
import * as THREE from 'three';

// ── Correspondance tableau → panorama ────────────────────────────────────────
const PANORAMAS = {
    'Starry Night':            'assets/panoramas/starry_night_pano.jpg',
    'The Scream':              'assets/panoramas/the_scream_pano.jpg',
    'March in the Birch Woods':'assets/panoramas/winter_scene_pano.jpg',
    'City Hall at Thorn':      'assets/panoramas/thorn_town_hall_pano.jpg',
};

// Détection mobile — réduit les segments de la sphère pour alléger le GPU
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 1024 && navigator.maxTouchPoints > 0);

// PC : 60×40 (haute qualité). Mobile : 32×24 (léger, indiscernable sur petit écran)
const SPHERE_W = IS_MOBILE ? 32 : 60;
const SPHERE_H = IS_MOBILE ? 24 : 40;

const textureLoader = new THREE.TextureLoader();

// Réservé pour des animations futures
export function updateWorldAnimations(_delta) {}

export function loadArtworkWorld(scene, camera, artworkName) {
    const H = 1000;
    camera.position.set(0, H + 1.7, 0);
    camera.quaternion.set(0, 0, 0, 1); // regard vers -Z à l'entrée

    const wg = new THREE.Group();
    wg.position.y = H;

    // ── Dôme panoramique ──────────────────────────────────────────────────────
    const panoPath = PANORAMAS[artworkName];
    if (panoPath) {
        // Matériau créé AVANT le chargement pour pouvoir l'assigner immédiatement
        const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0x111111 });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(500, SPHERE_W, SPHERE_H), mat);
        wg.add(dome);

        // Chargement asynchrone : la sphère existe déjà (couleur neutre),
        // la texture s'applique dès qu'elle est prête → pas de freeze sur mobile
        textureLoader.load(
            panoPath,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                mat.map   = texture;
                mat.color.set(0xffffff); // enlève la teinte neutre
                mat.needsUpdate = true;
            },
            undefined,
            (err) => console.error('Erreur chargement panorama :', panoPath, err)
        );
    } else {
        console.warn('Aucun panorama configuré pour :', artworkName);
    }

    // ── Sol invisible (navigation joystick/WASD) ──────────────────────────────
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    floor.rotation.x = -Math.PI / 2;
    wg.add(floor);

    // ── Lumière ambiante ──────────────────────────────────────────────────────
    wg.add(new THREE.AmbientLight(0xffffff, 1.0));

    scene.add(wg);
    return wg;
}
