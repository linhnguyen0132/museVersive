import * as THREE from 'three';
import { gsap } from 'gsap';

let currentTarget = null; 
let interactPrompt = null; 
let fadeOverlay = null; // NOUVEAU : La variable pour notre écran noir

export function setupInteractions(scene, camera, raycaster, paintings) {
    // 1. L'interface texte (déjà là)
    interactPrompt = document.createElement('div');
    interactPrompt.innerHTML = "Appuyez sur <b>[E]</b> pour interagir";
    interactPrompt.style.cssText = `
        display: none; 
        position: absolute; 
        top: 50%; 
        left: 50%; 
        transform: translate(-50%, 30px);
        color: white; 
        background: rgba(0, 0, 0, 0.7); 
        border: 1px solid #d4af37; 
        padding: 8px 16px; 
        border-radius: 4px; 
        font-family: Arial, sans-serif; 
        pointer-events: none; 
        z-index: 100;
    `;
    document.body.appendChild(interactPrompt);

    // 2. NOUVEAU : L'écran de transition noir
    fadeOverlay = document.createElement('div');
    fadeOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: black;
        opacity: 0; /* Invisible au début */
        pointer-events: none; /* Ne bloque pas la souris */
        z-index: 1000; /* Au-dessus de TOUT le reste */
    `;
    document.body.appendChild(fadeOverlay);

    // 3. L'écouteur de la touche E
    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyE' && currentTarget) {
            flyToPainting(camera, currentTarget);
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

function flyToPainting(camera, targetPainting) {
    interactPrompt.style.display = 'none';
    currentTarget = null; 

    const offset = new THREE.Vector3(0, 0, 1.5);
    offset.applyQuaternion(targetPainting.quaternion); 
    const targetPosition = targetPainting.position.clone().add(offset);

    // Animation 1 : La caméra avance vers le tableau
    gsap.to(camera.position, {
        x: targetPosition.x,
        y: targetPainting.position.y,
        z: targetPosition.z,
        duration: 1.5,
        ease: "power2.inOut",
        onComplete: () => {
            // NOUVEAU - Animation 2 : Le fondu au noir démarre quand on est arrivé
            gsap.to(fadeOverlay, {
                opacity: 1, // L'écran devient 100% noir
                duration: 1.2, // Ça prend 1.2 secondes
                ease: "power2.inOut",
                onComplete: () => {
                    console.log("Écran noir ! Prêt à charger le monde de l'œuvre.");
                    // C'est exactement ici que nous coderons la suppression du musée 
                    // et le chargement du nouveau niveau.
                }
            });
        }
    });
}