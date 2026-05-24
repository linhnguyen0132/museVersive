import * as THREE from 'three';
import { gsap } from 'gsap';
// ---> 1. NOUVEL IMPORT ICI :
import { loadArtworkWorld } from './worlds.js';

let currentTarget = null; 
let interactPrompt = null; 
let fadeOverlay = null; 

export function setupInteractions(scene, camera, raycaster, paintings) {
    // ... (Garde ton code pour interactPrompt et fadeOverlay tel quel ici) ...
    // Je te remets juste les écouteurs d'événements à modifier en bas de setupInteractions :

    interactPrompt = document.createElement('div');
    interactPrompt.innerHTML = "Appuyez sur <b>[E]</b> pour interagir";
    interactPrompt.style.cssText = `
        display: none; position: absolute; top: 50%; left: 50%; 
        transform: translate(-50%, 30px); color: white; background: rgba(0, 0, 0, 0.7); 
        border: 1px solid #d4af37; padding: 8px 16px; border-radius: 4px; 
        font-family: Arial, sans-serif; pointer-events: none; z-index: 100;
    `;
    document.body.appendChild(interactPrompt);

    fadeOverlay = document.createElement('div');
    fadeOverlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
        background: black; opacity: 0; pointer-events: none; z-index: 1000;
    `;
    document.body.appendChild(fadeOverlay);

    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyE' && currentTarget) {
            // ---> 2. ON PASSE LA SCENE ICI :
            flyToPainting(scene, camera, currentTarget);
        }
    });
}

export function updateInteractions(camera, raycaster, paintings) {
    const centerScreen = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(centerScreen, camera);
    const intersects = raycaster.intersectObjects(paintings, true);

    if (intersects.length > 0) {
        const distance = intersects[0].distance; 
        if (distance < 6) {
            currentTarget = intersects[0].object.parent;
            interactPrompt.style.display = 'block';      
            return; 
        }
    }
    currentTarget = null;
    if (interactPrompt) interactPrompt.style.display = 'none'; 
}

// ---> 3. AJOUT DE SCENE EN PARAMÈTRE ET MODIFICATION DE L'ANIMATION :
function flyToPainting(scene, camera, targetPainting) {
    interactPrompt.style.display = 'none';
    currentTarget = null; 

    const offset = new THREE.Vector3(0, 0, 1.5);
    offset.applyQuaternion(targetPainting.quaternion); 
    const targetPosition = targetPainting.position.clone().add(offset);

    // L'envol vers la toile
    gsap.to(camera.position, {
        x: targetPosition.x, y: targetPainting.position.y, z: targetPosition.z,
        duration: 1.5, ease: "power2.inOut",
        onComplete: () => {
            // Le fondu au noir
            gsap.to(fadeOverlay, {
                opacity: 1, duration: 1.2, ease: "power2.inOut",
                onComplete: () => {
                    
                    // --- LA MAGIE OPÈRE DANS LE NOIR ---
                    console.log("Téléportation vers :", targetPainting.name);
                    loadArtworkWorld(scene, camera, targetPainting.name);
                    
                    // On rouvre les yeux dans le nouveau monde
                    gsap.to(fadeOverlay, {
                        opacity: 0, 
                        duration: 2.0, // On fait un fondu d'ouverture un peu plus lent
                        delay: 0.5 // On reste dans le noir complet pendant 0.5 sec pour le suspense
                    });
                }
            });
        }
    });
}