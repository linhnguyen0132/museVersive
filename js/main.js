import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createMuseum } from './components/museum.js';

let camera, scene, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const mixers = [];
const movingNPCs = []; // NOUVEAU : Tableau pour les PNJ qui se déplacent
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

    // Importation de notre composant Musée (dans la fonction init)
    createMuseum(scene, mixers, movingNPCs);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);
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
    
    // 1. On sort le delta du "if" pour qu'il tourne même quand le jeu est en pause
    const delta = (time - prevTime) / 1000;

    if (controls.isLocked === true) {
        // (J'ai enlevé la ligne du delta qui était ici)
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
    // 2. AJOUT : On met à jour toutes les animations des PNJ à chaque image
    mixers.forEach(mixer => mixer.update(delta));
    movingNPCs.forEach(npc => npc.update(delta)); // NOUVEAU : On déplace les PNJ

    prevTime = time;
    renderer.render(scene, camera);
}