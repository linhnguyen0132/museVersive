// js/components/worlds.js
import * as THREE from 'three';

export function loadArtworkWorld(scene, camera, artworkName) {
    // 1. TÉLÉPORTATION : On envoie le joueur 1000 mètres au-dessus du musée !
    const worldHeight = 1000;
    camera.position.set(0, worldHeight + 1.7, 0);

    // 2. Création du groupe qui contiendra ce nouveau monde
    const worldGroup = new THREE.Group();
    worldGroup.position.y = worldHeight;

    // Chargeur de textures pour nos Skyboxes
    const textureLoader = new THREE.TextureLoader();

    // 3. AMBIANCES SELON LE TABLEAU
    if (artworkName === 'Starry Night') {
        
        // --- LE SKYDOME (Ciel panoramique) ---
        // On crée une sphère énorme (rayon de 500)
        const skyGeo = new THREE.SphereGeometry(500, 60, 40); 
        // Tu devras mettre une image panoramique (360°) de ciel étoilé ici :
        const skyTex = textureLoader.load('assets/textures/starry_sky.jpg'); 
        
        const skyMat = new THREE.MeshBasicMaterial({ 
            map: skyTex, 
            side: THREE.BackSide // TRÈS IMPORTANT : On applique la texture à l'INTÉRIEUR de la sphère
        });
        const skyDome = new THREE.Mesh(skyGeo, skyMat);
        worldGroup.add(skyDome);
        // ------------------------------------

        // Un sol bleu nuit un peu magique
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(1000, 1000), // Sol beaucoup plus grand pour rejoindre l'horizon
            new THREE.MeshStandardMaterial({ color: 0x0a0a2a, roughness: 0.8 })
        );
        floor.rotation.x = -Math.PI / 2;
        worldGroup.add(floor);

        // Quelques particules brillantes pour la magie (optionnel)
        const starsGeo = new THREE.BufferGeometry();
        const starsPos = new Float32Array(1000 * 3);
        for(let i=0; i<3000; i++) {
            starsPos[i] = (Math.random() - 0.5) * 200; 
        }
        starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
        const starsMat = new THREE.PointsMaterial({ color: 0xffddaa, size: 0.5 });
        worldGroup.add(new THREE.Points(starsGeo, starsMat));

    } else if (artworkName === 'Le Cri') {
        scene.background = new THREE.Color(0x8B0000); // Remplaçable par un SkyDome rougeoyant plus tard
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ color: 0x220500, roughness: 0.9 })
        );
        floor.rotation.x = -Math.PI / 2;
        worldGroup.add(floor);

    } else {
        scene.background = new THREE.Color(0xcccccc); 
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true })
        );
        floor.rotation.x = -Math.PI / 2;
        worldGroup.add(floor);
    }

    // 4. Lumière globale du monde
    const light = new THREE.AmbientLight(0xffffff, 0.6);
    worldGroup.add(light);

    scene.add(worldGroup);
}