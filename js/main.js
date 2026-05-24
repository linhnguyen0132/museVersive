import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createMuseum } from './components/museum.js';
import { setupInteractions, updateInteractions, isInTransition } from './components/interaction.js';
import { updateWorldAnimations } from './components/worlds.js';
import { setupGyroscope, requestGyroPermission, isGyroActive } from './components/gyroscope.js';

// ─── Variables globales ───────────────────────────────────────────────────────
let camera, scene, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let joystickX = 0, joystickY = 0;   // Valeurs analogiques du joystick (-1 → +1)
let prevTime = performance.now();

// Détection stricte (Téléphone/Tablette vs PC)
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 1024 && navigator.maxTouchPoints > 0);

const velocity  = new THREE.Vector3();
const direction = new THREE.Vector3();
const mixers    = [];
const movingNPCs = [];
const raycaster  = new THREE.Raycaster();
let   paintings  = [];
// Objets avec animations custom — rempli UNE SEULE FOIS après createMuseum()
// Evite un scene.traverse() coûteux à chaque frame
let animatedObjects = [];

// Variables regard tactile
let isMobileTouch = false;
let touchStartX = 0, touchStartY = 0;
let lookTouchId = null;         // identifiant du doigt qui contrôle la caméra
const LOOK_SPEED = 0.005;

// ─── Démarrage ────────────────────────────────────────────────────────────────
init();
animate();

// ─── init ─────────────────────────────────────────────────────────────────────
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 5);
    camera.rotation.order = 'YXZ';   // Défini UNE SEULE FOIS ici

    scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.15));

    // PointerLockControls — instancié UNE SEULE FOIS
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    if (isMobile) {
        setupMobileTouch();
    } else {
        setupControls();
    }

    paintings = createMuseum(scene, mixers, movingNPCs);
    setupInteractions(scene, camera, raycaster, paintings);

    // Cache des objets animés — traverse unique, jamais répété en boucle
    scene.traverse((obj) => {
        if (obj.userData.isScreamFigure || obj.userData.isScreamSky || obj.userData.isStarryTree) {
            animatedObjects.push(obj);
        }
    });

    // Sur mobile : antialias et shadows désactivés (trop coûteux pour le GPU)
    renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isMobile;
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);

    // Viseur central
    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
        position: absolute; top: 50%; left: 50%;
        width: 6px; height: 6px;
        background: rgba(255,255,255,0.8);
        border-radius: 50%;
        transform: translate(-50%,-50%);
        z-index: 100; pointer-events: none;
    `;
    document.body.appendChild(crosshair);
}

// ─── Contrôles PC (clavier + pointer lock) ────────────────────────────────────
function setupControls() {
    const blocker      = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', () => controls.lock());

    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });
    controls.addEventListener('unlock', () => {
        blocker.style.display = 'flex';
        instructions.style.display = 'block';
    });

    const onKeyDown = (e) => {
        switch (e.code) {
            case 'ArrowUp':    case 'KeyW': case 'KeyZ': moveForward  = true; break;
            case 'ArrowLeft':  case 'KeyA': case 'KeyQ': moveLeft     = true; break;
            case 'ArrowDown':  case 'KeyS':              moveBackward = true; break;
            case 'ArrowRight': case 'KeyD':              moveRight    = true; break;
        }
    };
    const onKeyUp = (e) => {
        switch (e.code) {
            case 'ArrowUp':    case 'KeyW': case 'KeyZ': moveForward  = false; break;
            case 'ArrowLeft':  case 'KeyA': case 'KeyQ': moveLeft     = false; break;
            case 'ArrowDown':  case 'KeyS':              moveBackward = false; break;
            case 'ArrowRight': case 'KeyD':              moveRight    = false; break;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
}

// ─── Contrôles Mobile (joystick analogique + regard multi-touch) ──────────────
function setupMobileTouch() {
    isMobileTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!isMobileTouch) return;

    // 1. Affiche la zone du joystick
    const joystickZone = document.getElementById('joystick-zone');
    if (joystickZone) joystickZone.style.display = 'block';

    // 2. Remplace l'écran d'accueil PC par la version mobile (style gold préservé)
    const instructions = document.getElementById('instructions');
    if (instructions) {
        instructions.innerHTML = `
            <div class="museum-logo">
                <span class="logo-deco">✦</span>
                <span class="logo-title">MuseVersive</span>
                <span class="logo-deco">✦</span>
            </div>
            <p class="museum-subtitle">Une expérience artistique immersive</p>
            <div class="separator">
                <span class="sep-line"></span>
                <span class="sep-icon">🎨</span>
                <span class="sep-line"></span>
            </div>
            <div class="controls-grid" style="margin-bottom:18px;">
                <div class="control-row">
                    <div class="key-group"><span class="key wide">🕹️ Joystick</span></div>
                    <span class="control-label">Avancer / Reculer</span>
                </div>
                <div class="control-row">
                    <div class="key-group"><span class="key wide">☝️ Glisser</span></div>
                    <span class="control-label">Regarder autour</span>
                </div>
                <div class="control-row">
                    <div class="key-group"><span class="key key-gold wide">🖼️ Toucher</span></div>
                    <span class="control-label">Entrer dans la toile</span>
                </div>
            </div>
            <div class="separator"><span class="sep-line"></span></div>
            <button id="enter-btn">
                <span class="btn-icon">▶</span>
                Entrer dans le musée
            </button>
        `;

        // Demande la permission gyroscope iOS depuis ce geste user
        document.getElementById('enter-btn').addEventListener('click', async () => {
            await requestGyroPermission();   // Dialogue iOS si nécessaire, no-op sur Android
            document.getElementById('blocker').style.display = 'none';
        });
    }

    // 3. Gyroscope (regard par orientation physique du téléphone dans les toiles)
    setupGyroscope(camera);

    // 4. Joystick nipplejs — ANALOGIQUE (data.vector donne -1 → +1 en continu)
    if (typeof nipplejs !== 'undefined') {
        const joystick = nipplejs.create({
            zone:     joystickZone,
            mode:     'static',
            position: { left: '75px', bottom: '75px' },  // centre de la zone 150×150
            color:    'rgba(255,255,255,0.9)',
            size:     100,
        });

        joystick.on('move', (_evt, data) => {
            joystickX =  data.vector.x;   // -1 (gauche) → +1 (droite)
            joystickY =  data.vector.y;   // -1 (reculer) → +1 (avancer)
        });
        joystick.on('end', () => { joystickX = 0; joystickY = 0; });

    } else {
        console.warn("Nipple.js n'est pas chargé dans le HTML.");
    }

    // 4. Regard tactile — suivi par identifiant pour éviter les conflits multi-touch
    document.addEventListener('touchstart', (e) => {
        // Ignorer les zones UI
        if (e.target.closest('#joystick-zone') || e.target.closest('#blocker') ||
            e.target.closest('#interact-menu')  || e.target.closest('#exit-hint')) return;

        // Enregistre le PREMIER doigt libre pour le regard
        for (const touch of e.changedTouches) {
            if (lookTouchId === null) {
                lookTouchId = touch.identifier;
                touchStartX = touch.pageX;
                touchStartY = touch.pageY;
                break;
            }
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#joystick-zone') || e.target.closest('#blocker') ||
            e.target.closest('#interact-menu')  || e.target.closest('#exit-hint')) return;
        e.preventDefault();   // Empêche le scroll iOS

        // Le gyroscope gère le regard dans les toiles → ne pas interférer
        if (isGyroActive()) return;

        // Cherche NOTRE doigt par identifiant (pas forcément touches[0])
        let lookTouch = null;
        for (const touch of e.touches) {
            if (touch.identifier === lookTouchId) { lookTouch = touch; break; }
        }
        if (!lookTouch) return;

        const dx = lookTouch.pageX - touchStartX;
        const dy = lookTouch.pageY - touchStartY;

        camera.rotation.y -= dx * LOOK_SPEED;
        camera.rotation.x -= dy * LOOK_SPEED;
        camera.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, camera.rotation.x));

        touchStartX = lookTouch.pageX;
        touchStartY = lookTouch.pageY;
    }, { passive: false });

    // Libère l'identifiant quand le doigt se lève
    document.addEventListener('touchend', (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === lookTouchId) { lookTouchId = null; break; }
        }
    }, { passive: true });
}

// ─── Haptique ─────────────────────────────────────────────────────────────────
export function triggerHaptic(pattern) {
    if ('vibrate' in navigator) {
        try { navigator.vibrate(pattern); } catch (_) {}
    }
}

// ─── Resize ───────────────────────────────────────────────────────────────────
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ─── Boucle de rendu ──────────────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    const time  = performance.now();
    const delta = Math.min((time - prevTime) / 1000, 0.05); // Cap à 50ms pour éviter les sauts

    const canMove = (!isMobile && controls.isLocked) || isMobile;

    // Physique — BLOQUÉE pendant les transitions GSAP (entrée/sortie toile)
    if (canMove && !isInTransition()) {

        // Friction
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        if (isMobile) {
            // ── Mobile : joystick analogique (0.0 → 1.0 proportionnel)
            // Combine joystick + clavier si branché (ex. manette bluetooth)
            const fz = joystickY + (Number(moveForward)  - Number(moveBackward));
            const fx = joystickX + (Number(moveRight)    - Number(moveLeft));
            velocity.z -= fz * 40.0 * delta;
            velocity.x -= fx * 40.0 * delta;

        } else {
            // ── PC : booleans clavier + normalisation pour la diagonale
            direction.z = Number(moveForward)  - Number(moveBackward);
            direction.x = Number(moveRight)    - Number(moveLeft);
            direction.normalize();
            if (moveForward  || moveBackward) velocity.z -= direction.z * 40.0 * delta;
            if (moveLeft     || moveRight)    velocity.x -= direction.x * 40.0 * delta;
        }

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // Limites des murs du musée (et de la zone dans la toile)
        const padding = 9.2;
        let hitWall = false;
        if (camera.position.x < -padding) { camera.position.x = -padding; hitWall = true; }
        if (camera.position.x >  padding) { camera.position.x =  padding; hitWall = true; }
        if (camera.position.z < -padding) { camera.position.z = -padding; hitWall = true; }
        if (camera.position.z >  padding) { camera.position.z =  padding; hitWall = true; }

        if (hitWall && isMobileTouch) triggerHaptic(30);
    }

    mixers.forEach(m => m.update(delta));
    movingNPCs.forEach(npc => npc.update(delta));
    updateWorldAnimations(delta);
    updateInteractions(camera, raycaster, paintings);

    // Animations custom — itère UNIQUEMENT le cache (pas de scene.traverse par frame)
    const t = time * 0.001;
    for (const obj of animatedObjects) {
        if (obj.userData.isScreamFigure) {
            const breathe = 1 + Math.sin(t * 3) * 0.02;
            obj.scale.set(breathe, breathe, 1);
            obj.position.x = Math.sin(t * 20) * 0.01;
            obj.position.y = obj.userData.baseY + Math.sin(t * 2) * 0.02;
            obj.rotation.z = Math.sin(t * 2) * 0.01;
        }
        if (obj.userData.isScreamSky) {
            obj.position.x = Math.sin(t * 0.3) * 0.01;
            obj.position.y = obj.userData.baseY + Math.sin(t * 0.8) * 0.03;
            obj.rotation.z = Math.sin(t * 0.2) * 0.003;
            obj.scale.x    = 1 + Math.sin(t * 0.5) * 0.01;
        }
        if (obj.userData.isStarryTree) {
            const breathe = 1 + Math.sin(t * 0.8) * 0.01;
            obj.rotation.z = Math.sin(t * 1.5) * 0.025;
            obj.rotation.y = Math.cos(t * 8.0) * 0.005;
            obj.scale.set(breathe, breathe, breathe);
            obj.position.x = obj.userData.baseX + Math.sin(t * 0.5) * 0.01;
            obj.position.y = obj.userData.baseY + Math.cos(t * 0.7) * 0.01;
        }
    }

<<<<<<< HEAD
                obj.scale.set(
                    breathe,
                    breathe,
                    1
                );

                // vibration
                obj.position.x =
                    Math.sin(t * 20) * 0.01;

                // flottement
                obj.position.y =
                    obj.userData.baseY +
                    Math.sin(t * 2) * 0.02;

                // rotation
                obj.rotation.z =
                    Math.sin(t * 2) * 0.01;
            }
            // SKY 
            if (obj.userData.isScreamSky) {

                    const t = time * 0.001;

                    const baseY =
                        obj.userData.baseY;

                    // vibration lente
                    obj.position.x =
                        Math.sin(t * 0.3) * 0.01;

                    // flottement
                    obj.position.y =
                        baseY +
                        Math.sin(t * 0.8) * 0.03;

                    // rotation subtile
                    obj.rotation.z =
                        Math.sin(t * 0.2) * 0.003;

                    // respiration horizontale
                    obj.scale.x =
                        1 + Math.sin(t * 0.5) * 0.01;
                }

            // Starry Night - Tree
            if (obj.userData.isStarryTree) {

                    // oscillation principale
                    obj.rotation.z =
                        Math.sin(t * 1.5) * 0.025;

                    // micro vibration
                    obj.rotation.y =
                        Math.cos(t * 8.0) * 0.005;

                    // respiration lente
                    const breathe =
                        1 + Math.sin(t * 0.8) * 0.01;

                    obj.scale.set(
                        breathe,
                        breathe,
                        breathe
                    );

                    // léger flottement
                    obj.position.x =
                        obj.userData.baseX +
                        Math.sin(t * 0.5) * 0.01;

                    obj.position.y =
                        obj.userData.baseY +
                        Math.cos(t * 0.7) * 0.01;
                }
                    // ======================
        // SNOW PARTICLES
        // ======================

        if (obj.userData.isSnowGroup) {

            obj.children.forEach((flake) => {

                flake.position.y -=
                    flake.userData.speed;

                flake.position.x +=
                    Math.sin(
                        t +
                        flake.position.y
                    ) * 0.001;

                // reset
                if (flake.position.y < -2) {

                    flake.position.y = 2;
                }
            });
        }
    });

   
=======
>>>>>>> 2f81ad50031e17a292b9117821dacd7a80448c23
    prevTime = time;
    renderer.render(scene, camera);
}
