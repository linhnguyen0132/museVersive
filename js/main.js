import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createMuseum } from './components/museum.js';
import { setupInteractions, updateInteractions } from './components/interaction.js';
import { updateWorldAnimations } from './components/worlds.js';
import { playWorldMusic, stopWorldMusic } from './components/audio.js';
// --- VARIABLES GLOBALES ---
let camera, scene, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();

// Détection stricte (Téléphone/Tablette vs PC)
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 1024 && navigator.maxTouchPoints > 0);

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const mixers = [];
const movingNPCs = []; 

const raycaster = new THREE.Raycaster();
let paintings = []; 

// Variables pour le mobile
let isMobileTouch = false;
let touchStartX = 0;
let touchStartY = 0;
const lookSpeed = 0.005; // Sensibilité pour tourner la tête au doigt

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 5);

    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.15); 
    scene.add(ambientLight);

    // On crée l'objet controls pour tout le monde (gère la physique XZ)
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    // L'AIGUILLAGE AUTOMATIQUE
    if (isMobile) {
        setupMobileTouch();
    } else {
        setupControls(); // Seulement si on est sur PC
    }

    // INITIALISATION UNIQUE
    paintings = createMuseum(scene, mixers, movingNPCs);
    setupInteractions(scene, camera, raycaster, paintings);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);

    // CRÉATION DU VISEUR CENTRAL (Pour savoir où on regarde)
    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
        position: absolute; 
        top: 50%; 
        left: 50%; 
        width: 6px; 
        height: 6px; 
        background: rgba(255, 255, 255, 0.8); 
        border-radius: 50%; 
        transform: translate(-50%, -50%); 
        z-index: 100; 
        pointer-events: none;
    `;
    document.body.appendChild(crosshair);
}

function setupControls() {
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    // Sur PC, cliquer sur l'écran verrouille la souris
    instructions.addEventListener('click', () => {
        if (!isMobile) controls.lock();
    });
    
    controls.addEventListener('lock', () => { 
        instructions.style.display = 'none'; 
        blocker.style.display = 'none'; 
    });
    
    controls.addEventListener('unlock', () => { 
        blocker.style.display = 'flex'; 
        instructions.style.display = 'block'; 
    });

    const onKeyDown = (event) => {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': case 'KeyZ': moveForward = true; break;
            case 'ArrowLeft': case 'KeyA': case 'KeyQ': moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': moveBackward = true; break;
            case 'ArrowRight': case 'KeyD': moveRight = true; break;
        }
    };
    const onKeyUp = (event) => {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': case 'KeyZ': moveForward = false; break;
            case 'ArrowLeft': case 'KeyA': case 'KeyQ': moveLeft = false; break;
            case 'ArrowDown': case 'KeyS': moveBackward = false; break;
            case 'ArrowRight': case 'KeyD': moveRight = false; break;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

function setupMobileTouch() {
    isMobileTouch = true;

    // 1. Affiche la zone du joystick
    const joystickZone = document.getElementById('joystick-zone');
    if(joystickZone) joystickZone.style.display = 'block';
    
    // 2. Remplace les instructions PC par des instructions mobiles
    const instructions = document.getElementById('instructions');
    if(instructions) {
        instructions.innerHTML = `
            <div class="museum-logo">
                <span class="logo-deco">✦</span>
                <span class="logo-title">MuseVersive</span>
                <span class="logo-deco">✦</span>
            </div>
            <p class="museum-subtitle">Touchez l'écran pour commencer</p>
            <div class="separator"><span class="sep-line"></span></div>
            <p class="enter-hint">Utilisez le joystick (gauche) pour marcher.<br/>Glissez sur l'écran (droite) pour regarder.</p>
            <button id="enter-btn-mobile" style="margin-top:20px; padding:15px; border-radius:8px; border:none; background:white; color:black; font-weight:bold; font-size:16px;">
                ▶ Entrer
            </button>
        `;
        
        // Masquer l'écran d'accueil au clic
        document.getElementById('enter-btn-mobile').addEventListener('click', () => {
            document.getElementById('blocker').style.display = 'none';
        });
    }

    // 3. Initialisation du Joystick (Nipple.js) pour avancer/reculer
    if (typeof nipplejs !== 'undefined') {
        const joystick = nipplejs.create({
            zone: document.getElementById('joystick-zone'),
            mode: 'static',
            position: { left: '80px', bottom: '80px' }, // Un peu plus haut pour le pouce
            color: 'white'
        });

        joystick.on('move', (evt, data) => {
            const angle = data.angle.degree;
            moveForward = moveBackward = moveLeft = moveRight = false;

            if (angle > 45 && angle < 135) moveForward = true;
            else if (angle >= 135 && angle <= 225) moveLeft = true;
            else if (angle > 225 && angle < 315) moveBackward = true;
            else moveRight = true;
        });

        joystick.on('end', () => {
            moveForward = moveBackward = moveLeft = moveRight = false;
        });
    } else {
        console.warn("Nipple.js n'est pas chargé dans le HTML.");
    }

    // 4. Gestion de la Caméra Tactile (Regarder autour de soi)
    document.addEventListener('touchstart', (e) => {
        if (e.target.closest('#joystick-zone') || e.target.closest('#blocker')) return;
        touchStartX = e.touches[0].pageX;
        touchStartY = e.touches[0].pageY;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#joystick-zone') || e.target.closest('#blocker')) return;
        e.preventDefault(); // Empêche le scrolling de la page
        
        const touchX = e.touches[0].pageX;
        const touchY = e.touches[0].pageY;
        
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;
        
        camera.rotation.order = 'YXZ'; 
        camera.rotation.y -= deltaX * lookSpeed;
        camera.rotation.x -= deltaY * lookSpeed;
        // Limite pour ne pas faire un salto avec la tête
        camera.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, camera.rotation.x));

        touchStartX = touchX;
        touchStartY = touchY;
    }, { passive: false });
}

// Fonction utilitaire (Safe) pour les vibrations haptiques
export function triggerHaptic(pattern) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {}
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // Mouvement autorisé SI (PC & Souris verrouillée) OU SI (Mobile)
    if ((!isMobile && controls.isLocked === true) || isMobileTouch) {
        
        // Physique des déplacements (Friction)
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); 

        const speed = 40.0;
        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        // Application du mouvement à la caméra
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // Limites des murs du musée
        const padding = 9.2;
        let hitWall = false;
        
        if (camera.position.x < -padding) { camera.position.x = -padding; hitWall = true; }
        if (camera.position.x > padding) { camera.position.x = padding; hitWall = true; }
        if (camera.position.z < -padding) { camera.position.z = -padding; hitWall = true; }
        if (camera.position.z > padding) { camera.position.z = padding; hitWall = true; }
        
        // Si on se cogne, on vibre un petit coup sec !
        if (hitWall && isMobileTouch && (Math.abs(velocity.x) > 1 || Math.abs(velocity.z) > 1)) {
            triggerHaptic(30); 
        }
    }
    
    // Mise à jour des animations 3D
    mixers.forEach(mixer => mixer.update(delta));
    movingNPCs.forEach(npc => npc.update(delta));
    updateWorldAnimations(delta);

    // MISE À JOUR DE LA DÉTECTION (Raycaster)
    updateInteractions(camera, raycaster, paintings);

    prevTime = time;
    renderer.render(scene, camera);
}