import * as THREE from 'three';
import { gsap } from 'gsap';
import { loadArtworkWorld } from './worlds.js';
import { playWorldMusic, stopWorldMusic } from './audio.js';
import { activateGyroscope, deactivateGyroscope, isGyroSupported } from './gyroscope.js';

// ─── État ─────────────────────────────────────────────────────────────────────
let currentTarget       = null;
let interactMenu        = null;
let exitHint            = null;
let fadeOverlay         = null;
let orientOverlay       = null;   // Avertissement portrait → paysage (mobile)
let isTransitioning     = false;
let insidePainting      = false;
let activeWorldGroup    = null;
let savedCameraPosition = null;
let _orientCallback     = null;   // Action à exécuter après rotation / skip

// ─── Tween de rotation caméra (Regarder) ─────────────────────────────────────
// Un seul tween actif à la fois — tout nouveau appel tue le précédent.
let _lookTween        = null;
let isAnimatingCamera = false;

function _killLookTween() {
    if (_lookTween) { _lookTween.kill(); _lookTween = null; }
    isAnimatingCamera = false;
}

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 1024 && navigator.maxTouchPoints > 0);

export function isInTransition() { return isTransitioning; }

// ─── Styles partagés des boutons du menu ─────────────────────────────────────
const _BTN = `display:inline-flex;flex-direction:column;align-items:center;gap:4px;
    padding:12px 22px;border-radius:8px;cursor:pointer;font-family:'Georgia',serif;
    font-size:14px;color:#ffffff;transition:background 0.2s,border-color 0.2s;
    pointer-events:auto;min-width:115px;`;
const BTN_LOOK  = _BTN + `border:1px solid rgba(180,180,180,0.35);background:rgba(255,255,255,0.05);`;
const BTN_ENTER = _BTN + `border:1px solid rgba(212,175,55,0.7);background:rgba(212,175,55,0.12);`;

// ─── Initialisation ───────────────────────────────────────────────────────────
export function setupInteractions(scene, camera, raycaster, paintings) {

    // Injection CSS unique (animations + hover des boutons)
    if (!document.getElementById('_muse-styles')) {
        const s = document.createElement('style');
        s.id = '_muse-styles';
        s.textContent = `
            @keyframes phone-tilt {
                0%,100% { transform: rotate(0deg) scale(1); }
                40%,60%  { transform: rotate(90deg) scale(1.08); }
            }
            #orient-phone { animation: phone-tilt 2.4s ease-in-out infinite; display:inline-block; }
            .menu-look-btn:hover  { background:rgba(255,255,255,0.12) !important; }
            .menu-enter-btn:hover { background:rgba(212,175,55,0.25) !important; border-color:#d4af37 !important; }
        `;
        document.head.appendChild(s);
    }

    // ── Menu d'interaction (deux boutons) ─────────────────────────────────────
    interactMenu = document.createElement('div');
    interactMenu.id = 'interact-menu';
    interactMenu.style.cssText = `
        display:none; position:absolute; bottom:14%; left:50%;
        transform:translateX(-50%) translateY(20px);
        background:rgba(10,10,10,0.88); border:1px solid #d4af37; border-radius:10px;
        padding:22px 32px 18px; text-align:center; font-family:'Georgia',serif;
        color:white; z-index:100; pointer-events:auto; cursor:default;
        backdrop-filter:blur(6px); min-width:300px;
        box-shadow:0 0 24px rgba(212,175,55,0.2);
        opacity:0; transition:opacity 0.3s ease, transform 0.3s ease;
    `;
    document.body.appendChild(interactMenu);

    // Délégation : un seul listener, routing par classe CSS
    interactMenu.addEventListener('click', (e) => {
        if (isTransitioning || insidePainting || !currentTarget) return;

        if (e.target.closest('.menu-look-btn')) {
            // Ignore le double-clic rapide si l'animation est déjà en cours
            if (isAnimatingCamera) return;
            if (navigator.vibrate) try { navigator.vibrate(20); } catch (_) {}
            lookAtPainting(camera, currentTarget, null);
            return;
        }
        if (e.target.closest('.menu-enter-btn')) {
            // "Entrer" interrompt proprement un "Regarder" en cours avant de démarrer
            _killLookTween();
            if (navigator.vibrate) try { navigator.vibrate([30, 50, 30]); } catch (_) {}
            handleEnterPainting(scene, camera, currentTarget);
        }
    });

    // ── Indicateur de sortie ──────────────────────────────────────────────────
    exitHint = document.createElement('div');
    exitHint.id = 'exit-hint';
    exitHint.style.cssText = `
        display:none; position:absolute; top:5%; left:50%;
        transform:translateX(-50%) translateY(-10px);
        background:rgba(10,10,10,0.80); border:1px solid rgba(212,175,55,0.5);
        border-radius:8px; padding:10px 24px; font-family:'Georgia',serif;
        font-size:14px; color:#ffffff; z-index:100; pointer-events:auto;
        cursor:pointer; backdrop-filter:blur(4px); opacity:0;
        transition:opacity 0.4s ease, transform 0.4s ease, background 0.2s;
    `;
    exitHint.innerHTML = isMobile
        ? `👆 <span style="color:#d4af37;font-weight:bold;">Toucher ici</span> pour sortir`
        : `Appuyez sur <span style="background:rgba(212,175,55,0.15);border:1px solid #d4af37;
           padding:1px 8px;border-radius:4px;color:#d4af37;font-family:monospace;
           font-weight:bold;">Retour</span> pour sortir`;
    document.body.appendChild(exitHint);

    exitHint.addEventListener('click', () => {
        if (insidePainting && !isTransitioning) {
            if (navigator.vibrate) try { navigator.vibrate(20); } catch (_) {}
            exitPainting(scene, camera);
        }
    });

    // ── Fondu au noir ─────────────────────────────────────────────────────────
    fadeOverlay = document.createElement('div');
    fadeOverlay.style.cssText = `
        position:absolute; top:0; left:0; width:100vw; height:100vh;
        background:black; opacity:0; pointer-events:none; z-index:1000;
    `;
    document.body.appendChild(fadeOverlay);

    // ── Overlay portrait → paysage (mobile uniquement) ────────────────────────
    if (isMobile) {
        orientOverlay = document.createElement('div');
        orientOverlay.id = 'orient-overlay';
        orientOverlay.style.cssText = `
            display:none; position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(5,5,5,0.96); z-index:2000; flex-direction:column;
            align-items:center; justify-content:center; font-family:'Georgia',serif;
            color:white; text-align:center; padding:30px; box-sizing:border-box;
        `;
        orientOverlay.innerHTML = `
            <div id="orient-phone" style="font-size:72px;margin-bottom:24px;">📱</div>
            <div style="font-size:20px;color:#d4af37;font-weight:bold;margin-bottom:12px;">
                Tournez votre téléphone
            </div>
            <div style="font-size:14px;color:#cccccc;line-height:1.7;margin-bottom:32px;">
                Pour une expérience immersive optimale,<br>
                utilisez le mode <strong style="color:#d4af37;">paysage (horizontal)</strong>.<br>
                <span style="font-size:12px;color:#888;margin-top:6px;display:block;">
                    Le gyroscope et le panorama sont optimisés en paysage.
                </span>
            </div>
            <button id="orient-skip-btn" style="
                padding:12px 28px; border-radius:8px; cursor:pointer;
                background:rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.4);
                color:#cccccc; font-family:'Georgia',serif; font-size:13px;
                pointer-events:auto;
            ">Continuer en portrait</button>
        `;
        document.body.appendChild(orientOverlay);

        // Bouton skip → procéder sans rotation
        orientOverlay.querySelector('#orient-skip-btn').addEventListener('click', () => {
            const cb = _orientCallback;
            _hideOrientOverlay();
            if (cb) cb();
        });

        // Rotation vers le paysage → procéder automatiquement
        window.addEventListener('resize', () => {
            if (orientOverlay.style.display === 'flex' && window.innerWidth > window.innerHeight) {
                const cb = _orientCallback;
                _hideOrientOverlay();
                if (cb) cb();
            }
        });
    }

    // ── Clavier (PC) ──────────────────────────────────────────────────────────
    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyF' && currentTarget && !isTransitioning && !insidePainting) {
            if (!isAnimatingCamera) lookAtPainting(camera, currentTarget, null);
        }
        if (event.code === 'KeyE' && currentTarget && !isTransitioning && !insidePainting) {
            _killLookTween();   // interrompt "Regarder" si actif
            handleEnterPainting(scene, camera, currentTarget);
        }
        if (event.code === 'Backspace' && insidePainting && !isTransitioning) {
            exitPainting(scene, camera);
        }
    });
}

// ─── Overlay orientation ──────────────────────────────────────────────────────
function _showOrientOverlay(onProceed) {
    if (!orientOverlay) { onProceed(); return; }
    _orientCallback = onProceed;
    orientOverlay.style.display = 'flex';
}

function _hideOrientOverlay() {
    if (!orientOverlay) return;
    _orientCallback = null;
    orientOverlay.style.display = 'none';
}

// ─── Point d'entrée : vérifie l'orientation avant de lancer le vol ───────────
function handleEnterPainting(scene, camera, painting) {
    const isPortrait = isMobile && (window.innerHeight > window.innerWidth);
    if (isPortrait) {
        _showOrientOverlay(() => flyToPainting(scene, camera, painting));
    } else {
        flyToPainting(scene, camera, painting);
    }
}

// ─── Construction du menu ─────────────────────────────────────────────────────
function _buildMenu(paintingName) {
    const hint = isMobile
        ? ''   // Sur mobile les boutons parlent d'eux-mêmes
        : `<span style="font-size:11px;color:#777;margin-top:3px;">Touche F</span>`;
    const hint2 = isMobile
        ? ''
        : `<span style="font-size:11px;color:#777;margin-top:3px;">Touche E</span>`;

    interactMenu.innerHTML = `
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;
                    color:#d4af37;margin-bottom:8px;opacity:0.8;">Œuvre d'art</div>
        <div style="font-size:${isMobile ? 17 : 20}px;color:#fff;margin-bottom:16px;
                    font-style:italic;">${paintingName}</div>
        <div style="width:40px;height:1px;background:#d4af37;margin:0 auto 18px;opacity:0.5;"></div>
        <div style="display:flex;gap:12px;justify-content:center;">

            <button class="menu-look-btn" style="${BTN_LOOK}">
                <span style="font-size:22px;">👁</span>
                <span>Regarder</span>
                ${hint}
            </button>

            <button class="menu-enter-btn" style="${BTN_ENTER}">
                <span style="font-size:22px;">→</span>
                <span style="color:#d4af37;font-weight:bold;">Entrer</span>
                ${hint2}
            </button>

        </div>
    `;
}

// ─── updateInteractions ───────────────────────────────────────────────────────
export function updateInteractions(camera, raycaster, paintings) {
    if (isTransitioning || insidePainting) return;

    let nearestPainting = null;

    // Méthode 1 : raycaster depuis le centre de l'écran (visée précise)
    const centerScreen = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(centerScreen, camera);
    const intersects = raycaster.intersectObjects(paintings, true);
    if (intersects.length > 0 && intersects[0].distance < 6) {
        nearestPainting = intersects[0].object.parent;
    }

    // Méthode 2 : proximité horizontale
    //  → détecte le tableau devant soi même si on regarde le sol ou légèrement de côté
    if (!nearestPainting) {
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
                if (camFwd.dot(toPH) > 0.3) {   // dans le demi-espace avant (±72°)
                    minDist = dist;
                    nearestPainting = p;
                }
            }
        }
    }

    if (nearestPainting) {
        if (currentTarget !== nearestPainting) {
            currentTarget = nearestPainting;
            _buildMenu(nearestPainting.name);
            showMenu();
        }
        return;
    }

    if (currentTarget) {
        currentTarget = null;
        hideMenu();
    }
}

// ─── showMenu / hideMenu ──────────────────────────────────────────────────────
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
    if (isMobile) {
        const gyroLine = isGyroSupported()
            ? `<div style="font-size:11px;color:rgba(212,175,55,0.55);letter-spacing:1.5px;
                           margin-bottom:8px;text-transform:uppercase;">
                   📱 Inclinez pour regarder
               </div>`
            : '';
        exitHint.innerHTML = gyroLine +
            `👆 <span style="color:#d4af37;font-weight:bold;">Toucher ici</span> pour sortir`;
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

// ─── Helpers : angle court + regard vers le tableau ───────────────────────────
function _shortAngle(from, to) {
    const d = ((to - from) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    return from + d;
}

function lookAtPainting(camera, painting, onDone) {

    // ── 1. Tuer tout tween de rotation en cours ───────────────────────────────
    // Sans ça : cliquer "Regarder" puis "Entrer" en moins de 0,55 s
    // lance deux gsap.to() simultanés sur camera.rotation → conflit.
    if (_lookTween) { _lookTween.kill(); _lookTween = null; }
    gsap.killTweensOf(camera.rotation);
    isAnimatingCamera = true;

    // ── 2. Position monde absolue de la toile ─────────────────────────────────
    // getWorldPosition() force la mise à jour de matrixWorld.
    // .position seul donnerait la position locale → (0,0,0) si parent ≠ scene
    // → la caméra regarderait le sol au centre du musée.
    const target = new THREE.Vector3();
    painting.getWorldPosition(target);

    // ── 3. Calcul atan2 direct (camera YXZ) ──────────────────────────────────
    // On NE peut PAS utiliser Object3D.lookAt() comme proxy :
    //   Object3D → aligne le +Z local vers la cible
    //   Camera   → aligne le -Z local vers la cible  (convention Three.js)
    // → utiliser un dummy Object3D donne un yaw décalé de 180°.
    // On recalcule manuellement les angles Euler YXZ équivalents à camera.lookAt(target).
    const dx     = target.x - camera.position.x;
    const dy     = target.y - camera.position.y;
    const dz     = target.z - camera.position.z;
    const hDist  = Math.sqrt(dx * dx + dz * dz) || 0.001;

    // Yaw  : atan2(-dx, -dz) = angle pour que -Z local pointe vers (dx,dz)
    const targetYaw   = _shortAngle(camera.rotation.y, Math.atan2(-dx, -dz));
    // Pitch : angle vertical ; on clamp pour ne jamais regarder vers le bas
    const rawPitch    = -Math.atan2(dy, hDist);
    const targetPitch = Math.max(-Math.PI / 2.2, Math.min(0, rawPitch));

    // ── 4. Animation fluide ───────────────────────────────────────────────────
    _lookTween = gsap.to(camera.rotation, {
        y: targetYaw,
        x: targetPitch,
        duration: 0.55,
        ease: 'power2.out',
        onComplete: () => {
            _lookTween        = null;
            isAnimatingCamera = false;
            if (onDone) onDone();
        },
    });
}

// ─── flyToPainting ────────────────────────────────────────────────────────────
function flyToPainting(scene, camera, targetPainting) {
    isTransitioning     = true;
    savedCameraPosition = camera.position.clone();
    hideMenu();

    // 1. Centrage du regard sur l'œuvre (tue tout tween "Regarder" en cours)
    lookAtPainting(camera, targetPainting, () => {

        // 2. Vol vers le tableau
        const offset = new THREE.Vector3(0, 0, 1.5);
        offset.applyQuaternion(targetPainting.quaternion);
        const targetPos = new THREE.Vector3();
        targetPainting.getWorldPosition(targetPos);
        targetPos.add(offset);

        gsap.to(camera.position, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
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
                            },
                        });
                    },
                });
            },
        });

    }); // fin lookAtPainting
}

// ─── walkIntoWorld ────────────────────────────────────────────────────────────
function walkIntoWorld(camera, onDone) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    gsap.to(camera.position, {
        x: camera.position.x + dir.x * 5,
        y: camera.position.y + dir.y * 5,
        z: camera.position.z + dir.z * 5,
        duration: 3.0,
        ease: 'power1.out',
        onComplete: onDone,
    });

    gsap.to(camera.position, {
        y: camera.position.y - 0.06,
        duration: 0.55,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 5,
    });
}

// ─── disposeGroup — libère la mémoire GPU ─────────────────────────────────────
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

// ─── exitPainting ─────────────────────────────────────────────────────────────
function exitPainting(scene, camera) {
    isTransitioning = true;
    hideExitHint();
    deactivateGyroscope();

    gsap.to(fadeOverlay, {
        opacity: 1,
        duration: 1.0,
        ease: 'power2.inOut',
        onComplete: () => {
            stopWorldMusic();
            if (activeWorldGroup) {
                scene.remove(activeWorldGroup);
                disposeGroup(activeWorldGroup);
                activeWorldGroup = null;
            }

            const returnPos = savedCameraPosition || new THREE.Vector3(0, 1.7, 5);
            camera.position.set(returnPos.x, returnPos.y, returnPos.z);
            insidePainting = false;

            gsap.to(fadeOverlay, {
                opacity: 0,
                duration: 1.5,
                delay: 0.4,
                onComplete: () => { isTransitioning = false; }
            });
        }
    });
}
