import * as THREE from 'three';
import { gsap } from 'gsap';
import { loadArtworkWorld } from './worlds.js';
import { playWorldMusic, stopWorldMusic } from './audio.js';

let currentTarget = null;
let interactMenu = null;
let exitHint = null;
let fadeOverlay = null;
let isTransitioning = false;
let insidePainting = false;
let activeWorldGroup = null;
let savedCameraPosition = null;

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
        pointer-events: none;
        backdrop-filter: blur(6px);
        min-width: 300px;
        box-shadow: 0 0 24px rgba(212, 175, 55, 0.2);
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    interactMenu.innerHTML = `
        <div style="
            font-size: 11px;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #d4af37;
            margin-bottom: 8px;
            opacity: 0.8;
        ">Œuvre d'art</div>
        <div id="menu-title" style="
            font-size: 20px;
            color: #ffffff;
            margin-bottom: 18px;
            font-style: italic;
        "></div>
        <div style="
            width: 40px;
            height: 1px;
            background: #d4af37;
            margin: 0 auto 18px;
            opacity: 0.5;
        "></div>
        <div style="font-size: 13px; color: #cccccc;">
            Appuyez sur
            <span style="
                background: rgba(212,175,55,0.15);
                border: 1px solid #d4af37;
                padding: 2px 10px;
                border-radius: 4px;
                color: #d4af37;
                font-family: monospace;
                font-size: 14px;
                font-weight: bold;
            ">E</span>
            pour entrer dans la toile
        </div>
    `;
    document.body.appendChild(interactMenu);

    // --- Indicateur de sortie (affiché dans la toile) ---
    exitHint = document.createElement('div');
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
        font-size: 13px;
        color: #cccccc;
        z-index: 100;
        pointer-events: none;
        backdrop-filter: blur(4px);
        opacity: 0;
        transition: opacity 0.4s ease, transform 0.4s ease;
    `;
    exitHint.innerHTML = `
        Appuyez sur
        <span style="
            background: rgba(212,175,55,0.15);
            border: 1px solid #d4af37;
            padding: 1px 8px;
            border-radius: 4px;
            color: #d4af37;
            font-family: monospace;
            font-weight: bold;
        ">Retour arrière</span>
        pour sortir de la toile
    `;
    document.body.appendChild(exitHint);

    // --- Fondu au noir ---
    fadeOverlay = document.createElement('div');
    fadeOverlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
        background: black; opacity: 0; pointer-events: none; z-index: 1000;
    `;
    document.body.appendChild(fadeOverlay);

    // --- Touches ---
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

    const centerScreen = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(centerScreen, camera);
    const intersects = raycaster.intersectObjects(paintings, true);

    if (intersects.length > 0 && intersects[0].distance < 6) {
        const painting = intersects[0].object.parent;

        if (currentTarget !== painting) {
            currentTarget = painting;
            const titleEl = document.getElementById('menu-title');
            if (titleEl) titleEl.textContent = painting.name;
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

function flyToPainting(scene, camera, targetPainting) {
    isTransitioning = true;
    savedCameraPosition = camera.position.clone();
    hideMenu();

    const offset = new THREE.Vector3(0, 0, 1.5);
    offset.applyQuaternion(targetPainting.quaternion);
    const targetPosition = targetPainting.position.clone().add(offset);

    gsap.to(camera.position, {
        x: targetPosition.x,
        y: targetPainting.position.y,
        z: targetPosition.z,
        duration: 1.5,
        ease: "power2.inOut",
        onComplete: () => {
            gsap.to(fadeOverlay, {
                opacity: 1,
                duration: 1.2,
                ease: "power2.inOut",
                onComplete: () => {
                    activeWorldGroup = loadArtworkWorld(scene, camera, targetPainting.name);
                    playWorldMusic(targetPainting.name);
                    insidePainting = true;

                    gsap.to(fadeOverlay, {
                        opacity: 0,
                        duration: 2.0,
                        delay: 0.5,
                        onComplete: () => {
                            isTransitioning = false;
                            showExitHint();
                            walkIntoWorld(camera);
                        }
                    });
                }
            });
        }
    });
}

function walkIntoWorld(camera) {
    // Avance doucement dans la direction du regard (-Z après reset quaternion)
    // Le joueur sent qu'il "entre" dans la toile
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    gsap.to(camera.position, {
        x: camera.position.x + dir.x * 5,
        y: camera.position.y + dir.y * 5,
        z: camera.position.z + dir.z * 5,
        duration: 3.0,
        ease: "power1.out",
    });

    // Légère oscillation verticale → simulation de pas
    gsap.to(camera.position, {
        y: camera.position.y - 0.06,
        duration: 0.55,
        ease: "sine.inOut",
        yoyo: true,
        repeat: 5,
    });
}

function exitPainting(scene, camera) {
    isTransitioning = true;
    hideExitHint();
    

    gsap.to(fadeOverlay, {
        opacity: 1,
        duration: 1.0,
        ease: "power2.inOut",
        onComplete: () => {
            stopWorldMusic();
            if (activeWorldGroup) {
                scene.remove(activeWorldGroup);
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
