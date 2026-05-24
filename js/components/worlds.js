// js/components/worlds.js
import * as THREE from 'three';

// ── Correspondance tableau → panorama (JPG, compatibles GitHub) ───────
// Les fichiers .hdr sont ignorés par git (trop lourds).
// Si tu veux utiliser les HDR localement, remplace l'extension par .hdr
// et décommente l'import RGBELoader ci-dessous.
// import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const PANORAMAS = {
    'Starry Night': 'assets/panoramas/starry_night_pano.jpg',
    'Le Cri':       'assets/panoramas/the_scream_pano.jpg',
    'Hiver':        'assets/panoramas/winter_scene_pano.jpg',
    'Ville':        'assets/panoramas/thorn_town_hall_pano.jpg',
};

const textureLoader = new THREE.TextureLoader();

// Réservé pour des animations futures (vagues, etc.)
export function updateWorldAnimations(_delta) {}

export function loadArtworkWorld(scene, camera, artworkName) {
    const H = 1000;
    camera.position.set(0, H + 1.7, 0);
    camera.quaternion.set(0, 0, 0, 1); // regard vers -Z à l'entrée

    const wg = new THREE.Group();
    wg.position.y = H;

    // ── Dôme panoramique ──────────────────────────────────────────────
    const panoPath = PANORAMAS[artworkName];
    if (panoPath) {
        const texture = textureLoader.load(
            panoPath,
            undefined,
            undefined,
            (err) => console.error('Erreur chargement panorama :', panoPath, err)
        );
        texture.colorSpace = THREE.SRGBColorSpace;
        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(500, 60, 40),
            new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide })
        );
        wg.add(dome);
    } else {
        console.warn('Aucun panorama configuré pour :', artworkName);
    }

    // ── Sol invisible (permet la navigation WASD) ─────────────────────
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    floor.rotation.x = -Math.PI / 2;
    wg.add(floor);

    // ── Lumière ambiante ──────────────────────────────────────────────
    wg.add(new THREE.AmbientLight(0xffffff, 1.0));

    scene.add(wg);
    return wg;
}
