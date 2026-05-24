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
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const mixers = [];
const movingNPCs = []; 

const raycaster = new THREE.Raycaster();
let paintings = []; 

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 5);

    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.15); 
    scene.add(ambientLight);

    setupControls();

    // INITIALISATION UNIQUE
    paintings = createMuseum(scene, mixers, movingNPCs);
    setupInteractions(scene, camera, raycaster, paintings);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);

    // CRÉATION DU VISEUR CENTRAL
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
    controls = new PointerLockControls(camera, document.body);
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', () => controls.lock());
    controls.addEventListener('lock', () => { instructions.style.display = 'none'; blocker.style.display = 'none'; });
    controls.addEventListener('unlock', () => { blocker.style.display = 'flex'; instructions.style.display = 'block'; });
    scene.add(controls.getObject());

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

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (controls.isLocked === true) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); 

        const speed = 40.0;
        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        const padding = 9.2;
        if (camera.position.x < -padding) camera.position.x = -padding;
        if (camera.position.x > padding) camera.position.x = padding;
        if (camera.position.z < -padding) camera.position.z = -padding;
        if (camera.position.z > padding) camera.position.z = padding;
    }
    
    mixers.forEach(mixer => mixer.update(delta));
    movingNPCs.forEach(npc => npc.update(delta));
    updateWorldAnimations(delta);

    // MISE À JOUR DE LA DÉTECTION (Raycaster)
    updateInteractions(camera, raycaster, paintings);
        scene.traverse((obj) => {

        if (obj.userData.isScreamFigure) {

            const t = time * 0.001;

            // respiration
            const breathe =
                1 + Math.sin(t * 3) * 0.02;

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
         // SKY LAYER ANIMÉ (pour The Scream)
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
    });

   
    prevTime = time;
    renderer.render(scene, camera);
}