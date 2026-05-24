import * as THREE from 'three';
import { gsap } from 'gsap';
import { loadArtworkWorld } from './worlds.js';
import { playWorldMusic, stopWorldMusic } from './audio.js';
import { activateGyroscope, deactivateGyroscope, isGyroActive, isGyroSupported } from './gyroscope.js';

let currentTarget = null;
let interactMenu = null;
let exitHint = null;
let fadeOverlay = null;
let isTransitioning = false;
let insidePainting = false;
let activeWorldGroup = null;
let savedCameraPosition = null;

// Détection mobile locale pour adapter les textes
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 1024 && navigator.maxTouchPoints > 0);

// Exposé pour que main.js puisse bloquer la physique pendant les transitions
export function isInTransition() { return isTransitioning; }

export function setupInteractions(scene, camera, raycaster, paintings) {
    // --- Menu d'interaction (proximité tableau) ---
    interactMenu = document.createElement('div');
    interactMenu.id = 'interact-menu';
    interactMenu.style.cssText = `
        display: none;
        position: absolute;
        bottom: 14%;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(10, 10, 10, 0.88);
        border: 1px solid #d4af37;
        border-radius: 10px;
        padding: 22px 36px 18px;
        text-align: center;
        font-family: 'Georgia', serif;
        color: white;
        z-index: 100;
        pointer-events: auto; /* CRUCIAL : Permet de cliquer dessus ! */
        cursor: pointer;      /* Curseur main */
        backdrop-filter: blur(6px);
        min-width: 300px;
        box-shadow: 0 0 24px rgba(212, 175, 55, 0.2);
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease, background 0.2s;
    `;
    document.body.appendChild(interactMenu);

    // Événement Clic/Toucher pour Entrer
    interactMenu.addEventListener('click', () => {
        if (currentTarget && !isTransitioning && !insidePainting) {
            if (navigator.vibrate) try { navigator.vibrate([30, 50, 30]); } catch(e){}
            flyToPainting(scene, camera, currentTarget);
        }
    });

    // --- Indicateur de sortie (affiché dans la toile) ---
    exitHint = document.createElement('div');
    exitHint.id = 'exit-hint';
    exitHint.style.cssText = `
        display: none;
        position: absolute;
        top: 5%;
        left: 50%;
        transform: translateX(-50%) translateY(-10px);
        background: rgba(10, 10, 10, 0.80);
        border: 1px solid rgba(212, 175, 55, 0.5);
        border-radius: 8px;
        padding: 10px 24px;
        font-family: 'Georgia', serif;
        font-size: 14px;
        color: #ffffff;
        z-index: 100;
        pointer-events: auto; /* CRUCIAL : Permet de cliquer dessus ! */
        cursor: pointer;      /* Curseur main */
        backdrop-filter: blur(4px);
        opacity: 0;
        transition: opacity 0.4s ease, transform 0.4s ease, background 0.2s;
    `;
    
    // Texte dynamique pour la sortie
    exitHint.innerHTML = isMobile 
        ? `👆 <span style="color: #d4af37; font-weight: bold;">Toucher ici</span> pour sortir`
        : `Appuyez sur <span style="background: rgba(212,175,55,0.15); border: 1px solid #d4af37; padding: 1px 8px; border-radius: 4px; color: #d4af37; font-family: monospace; font-weight: bold;">Retour</span> pour sortir`;
    
    document.body.appendChild(exitHint);

    // Événement Clic/Toucher pour Sortir
    exitHint.addEventListener('click', () => {
        if (insidePainting && !isTransitioning) {
            if (navigator.vibrate) try { navigator.vibrate(20); } catch(e){}
            exitPainting(scene, camera);
        }
    });

    // --- Fondu au noir ---
    fadeOverlay = document.createElement('div');
    fadeOverlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
        background: black; opacity: 0; pointer-events: none; z-index: 1000;
    `;
    document.body.appendChild(fadeOverlay);

    // --- Touches Clavier (Restent actives pour les joueurs PC) ---
    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyE' && currentTarget && !isTransitioning && !insidePainting) {
            flyToPainting(scene, camera, currentTarget);
        }
        if (event.code === 'Backspace' && insidePainting && !isTransitioning) {
            exitPainting(scene, camera);
        }
    });
}

export function updateInteractions(camera, raycaster, paintings) {
    if (isTransitioning || insidePainting) return;

    let nearestPainting = null;

    // ── Méthode 1 : raycaster depuis le centre de l'écran (visée précise) ────
    const centerScreen = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(centerScreen, camera);
    const intersects = raycaster.intersectObjects(paintings, true);
    if (intersects.length > 0 && intersects[0].distance < 6) {
        nearestPainting = intersects[0].object.parent;
    }

    // ── Méthode 2 : proximité horizontale ─────────────────────────────────────
    //    Détecte le tableau le plus proche devant soi même si on regarde le sol
    //    ou légèrement de côté (utile sur mobile avec gyroscope ou joystick).
    if (!nearestPainting) {
        // Direction horizontale de la caméra (pitch ignoré → indépendant du regard vertical)
        const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        camFwd.y = 0;
        if (camFwd.lengthSq() > 0.001) camFwd.normalize();

        let minDist = 5.0;
        for (const p of paintings) {
            const toP = new THREE.Vector3().subVectors(p.position, camera.position);
            const dist = toP.length();
            if (dist < minDist) {
                const toPH = new THREE.Vector3(toP.x, 0, toP.z);
                if (toPH.lengthSq() > 0.001) toPH.normalize();
                // Tableau dans le demi-espace avant (>~70° d'angle latéral accepté)
                if (camFwd.dot(toPH) > 0.3) {
                    minDist = dist;
                    nearestPainting = p;
                }
            }
        }
    }

    if (nearestPainting) {
        if (currentTarget !== nearestPainting) {
            currentTarget = nearestPainting;

            const instructionHTML = isMobile
                ? `<div style="font-size: 15px; color: #d4af37; font-weight: bold; margin-top: 10px; animation: pulse 1.5s infinite;">👆 Toucher pour entrer</div>`
                : `<div style="font-size: 13px; color: #cccccc;">Appuyez sur <span style="background: rgba(212,175,55,0.15); border: 1px solid #d4af37; padding: 2px 10px; border-radius: 4px; color: #d4af37; font-family: monospace; font-size: 14px; font-weight: bold;">E</span> ou cliquez pour entrer</div>`;

            interactMenu.innerHTML = `
                <div style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #d4af37; margin-bottom: 8px; opacity: 0.8;">Œuvre d'art</div>
                <div style="font-size: 20px; color: #ffffff; margin-bottom: 18px; font-style: italic;">${nearestPainting.name}</div>
                <div style="width: 40px; height: 1px; background: #d4af37; margin: 0 auto 12px; opacity: 0.5;"></div>
                ${instructionHTML}
            `;
            showMenu();
        }
        return;
    }

    if (currentTarget) {
        currentTarget = null;
        hideMenu();
    }
}

function showMenu() {
    interactMenu.style.display = 'block';
    requestAnimationFrame(() => {
        interactMenu.style.opacity = '1';
        interactMenu.style.transform = 'translateX(-50%) translateY(0px)';
    });
}

function hideMenu() {
    interactMenu.style.opacity = '0';
    interactMenu.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => {
        if (!currentTarget) interactMenu.style.display = 'none';
    }, 300);
}

function showExitHint() {
    // Met à jour le texte selon le mode actif (gyro ou tactile)
    if (isMobile) {
        const gyroLine = isGyroSupported()
            ? `<div style="font-size:11px; color:rgba(212,175,55,0.55); letter-spacing:1.5px; margin-bottom:8px; text-transform:uppercase;">
                   📱 Inclinez pour regarder
               </div>`
            : '';
        exitHint.innerHTML = gyroLine +
            `👆 <span style="color:#d4af37; font-weight:bold;">Toucher ici</span> pour sortir`;
    }

    exitHint.style.display = 'block';
    requestAnimationFrame(() => {
        exitHint.style.opacity = '1';
        exitHint.style.transform = 'translateX(-50%) translateY(0px)';
    });
}

function hideExitHint() {
    exitHint.style.opacity = '0';
    exitHint.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => { exitHint.style.display = 'none'; }, 400);
}

// ─── Helpers : angle le plus court + rotation douce vers un tableau ──────────

// Retourne l'angle `to` ré-exprimé depuis `from` par le chemin le plus court
// (évite à GSAP de tourner dans le mauvais sens sur 360°)
function _shortAngle(from, to) {
    const d = ((to - from) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    return from + d;
}

// Rotation GSAP douce de la caméra vers le centre du tableau, puis appelle onDone
function lookAtPainting(camera, painting, onDone) {
    const dir = new THREE.Vector3()
        .subVectors(painting.position, camera.position)
        .normalize();

    // Yaw cible (rotation.y) — chemin le plus court depuis la position actuelle
    const targetYaw = _shortAngle(
        camera.rotation.y,
        Math.atan2(-dir.x, -dir.z)   // atan2(-x,-z) → caméra THREE en YXZ, axe -Z forward
    );
    // Pitch cible (rotation.x) — négatif = regarder en haut en YXZ
    const hDist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    const targetPitch = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, -Math.atan2(dir.y, hDist))
    );

    gsap.to(camera.rotation, {
        y: targetYaw,
        x: targetPitch,
        duration: 0.55,
        ease: 'power2.out',
        onComplete: onDone,
    });
}

function flyToPainting(scene, camera, targetPainting) {
    isTransitioning = true;
    savedCameraPosition = camera.position.clone();
    hideMenu();

    // ── 1. Centrage du regard sur l'œuvre (0,55 s) ───────────────────────────
    lookAtPainting(camera, targetPainting, () => {

        // ── 2. Vol vers le tableau ────────────────────────────────────────────
        const offset = new THREE.Vector3(0, 0, 1.5);
        offset.applyQuaternion(targetPainting.quaternion);
        const targetPosition = targetPainting.position.clone().add(offset);

        gsap.to(camera.position, {
            x: targetPosition.x,
            y: targetPainting.position.y,
            z: targetPosition.z,
            duration: 1.5,
            ease: 'power2.inOut',
            onComplete: () => {
                gsap.to(fadeOverlay, {
                    opacity: 1,
                    duration: 1.2,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        activeWorldGroup = loadArtworkWorld(scene, camera, targetPainting.name);
                        playWorldMusic(targetPainting.name);
                        insidePainting = true;

                        gsap.to(fadeOverlay, {
                            opacity: 0,
                            duration: 2.0,
                            delay: 0.5,
                            onComplete: () => {
                                activateGyroscope();
                                showExitHint();
                                walkIntoWorld(camera, () => { isTransitioning = false; });
                            }
                        });
                    }
                });
            }
        });

    }); // fin lookAtPainting
}

function walkIntoWorld(camera, onDone) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    // Avancée principale — appelle onDone quand terminée → libère la physique
    gsap.to(camera.position, {
        x: camera.position.x + dir.x * 5,
        y: camera.position.y + dir.y * 5,
        z: camera.position.z + dir.z * 5,
        duration: 3.0,
        ease: "power1.out",
        onComplete: onDone,
    });

    // Légère oscillation (simulation de pas) — indépendante
    gsap.to(camera.position, {
        y: camera.position.y - 0.06,
        duration: 0.55,
        ease: "sine.inOut",
        yoyo: true,
        repeat: 5,
    });
}

// Libère proprement la mémoire GPU d'un groupe Three.js
// CRUCIAL sur mobile : le GPU a ~1-4 Go de VRAM, les fuites crashent l'app
function disposeGroup(group) {
    group.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
            if (!mat) continue;
            mat.map?.dispose();
            mat.lightMap?.dispose();
            mat.bumpMap?.dispose();
            mat.normalMap?.dispose();
            mat.envMap?.dispose();
            mat.dispose();
        }
    });
}

function exitPainting(scene, camera) {
    isTransitioning = true;
    hideExitHint();
    deactivateGyroscope();   // Retour au touch-drag dans le musée

    gsap.to(fadeOverlay, {
        opacity: 1,
        duration: 1.0,
        ease: "power2.inOut",
        onComplete: () => {
            stopWorldMusic();
            if (activeWorldGroup) {
                scene.remove(activeWorldGroup);
                disposeGroup(activeWorldGroup);   // ← libère géométrie + textures du GPU
                activeWorldGroup = null;
            }

            const returnPos = savedCameraPosition || new THREE.Vector3(0, 1.7, 5);
            camera.position.set(returnPos.x, returnPos.y, returnPos.z);
            insidePainting = false;

            gsap.to(fadeOverlay, {
                opacity: 0,
                duration: 1.5,
                delay: 0.4,
                onComplete: () => {
                    isTransitioning = false;
                }
            });
        }
    });
}