import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createCeilingLamp } from './lighting.js';
import { createPainting } from './artworks.js';
import { loadAnimatedNPC, loadPatrollingNPC } from './npc.js';

function createBench(scene, x, z, rotationY) {
    const benchGroup = new THREE.Group();

    // 1. Le siège
    const seatGeo = new THREE.BoxGeometry(2, 0.1, 0.6);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.y = 0.40; 
    seat.castShadow = true;
    seat.receiveShadow = true;
    benchGroup.add(seat);

    // 2. Les pieds en métal
    const legGeo = new THREE.BoxGeometry(0.05, 0.4, 0.4);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
    
    const legLeft = new THREE.Mesh(legGeo, metalMat);
    legLeft.position.set(-0.8, 0.2, 0); 
    legLeft.castShadow = true;
    benchGroup.add(legLeft);

    const legRight = new THREE.Mesh(legGeo, metalMat);
    legRight.position.set(0.8, 0.2, 0); 
    legRight.castShadow = true;
    benchGroup.add(legRight);

    benchGroup.position.set(x, 0, z);
    benchGroup.rotation.y = rotationY;
    scene.add(benchGroup);
}

function loadStaticDecoration(scene, modelPath, x, z, scale = 1.0) {
    const loader = new GLTFLoader(); 
    loader.load(modelPath, (gltf) => {
        const model = gltf.scene;
        model.scale.set(scale, scale, scale);
        model.position.set(x, 0, z);

        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        scene.add(model);
    }, undefined, (error) => {
        console.error('Erreur lors du chargement de la décoration :', error);
    });
}

// --- NOUVELLE FONCTION : Les Moulures Classiques ---
function createWallMoldings(scene, x, z, rotationY) {
    const wallGroup = new THREE.Group();
    
    // Blanc éclatant et légèrement brillant pour accrocher la lumière
    const moldingMat = new THREE.MeshStandardMaterial({ color: '#C4E2F5', roughness: 0.5 });
    
    const depth = 0.05; // Épaisseur : les moulures ressortent de 5cm du mur
    const thick = 0.08; // Largeur : les baguettes font 8cm de large

    // Petite fonction interne pour dessiner rapidement un cadre rectangulaire
    function drawRect(cx, cy, w, h) {
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, thick, depth), moldingMat);
        top.position.set(cx, cy + h/2, 0); top.castShadow = true; wallGroup.add(top);
        
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, thick, depth), moldingMat);
        bottom.position.set(cx, cy - h/2, 0); bottom.castShadow = true; wallGroup.add(bottom);
        
        const left = new THREE.Mesh(new THREE.BoxGeometry(thick, h, depth), moldingMat);
        left.position.set(cx - w/2, cy, 0); left.castShadow = true; wallGroup.add(left);
        
        const right = new THREE.Mesh(new THREE.BoxGeometry(thick, h, depth), moldingMat);
        right.position.set(cx + w/2, cy, 0); right.castShadow = true; wallGroup.add(right);
    }

    // 1. Cadre Central (Entoure tes tableaux)
    // Le tableau est à Y=4.5 et fait 4x3. On fait un cadre de 5.5 x 4.5.
    drawRect(0, 4.5, 5.5, 4.5);

    // 2. Cadres Latéraux (Gauche et Droite)
    drawRect(-6, 4.5, 4, 4.5);
    drawRect(6, 4.5, 4, 4.5);

    // 3. Soubassements (Les petits cadres en bas près du sol)
    drawRect(0, 1.2, 5.5, 1.5);
    drawRect(-6, 1.2, 4, 1.5);
    drawRect(6, 1.2, 4, 1.5);

    // 4. Plinthe (La grande barre au ras du sol)
    const plinthe = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, depth * 1.5), moldingMat);
    plinthe.position.set(0, 0.15, 0);
    wallGroup.add(plinthe);

    // 5. Cimaise (La ligne horizontale qui sépare le haut du bas)
    const cimaise = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, depth * 1.8), moldingMat);
    cimaise.position.set(0, 2.2, 0);
    wallGroup.add(cimaise);

    // Positionnement final contre le mur
    wallGroup.position.set(x, 0, z);
    wallGroup.rotation.y = rotationY;
    scene.add(wallGroup);
}

export function createMuseum(scene, mixers, movingNPCs) {
    // --- A. LA STRUCTURE ---
    const roomGeometry = new THREE.BoxGeometry(20, 8, 20); 
    
    const textureLoader = new THREE.TextureLoader();
    
    const floorTexture = textureLoader.load('assets/textures/parquet1.jpg'); 
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(5, 5); 
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: floorTexture, 
        roughness: 0.6, 
        side: THREE.BackSide 
    }); 
    
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: '#C4E2F5', 
        roughness: 0.9, 
        side: THREE.BackSide 
    }); 
    
    const ceilingTexture = textureLoader.load('assets/textures/ceiling_white.jpg'); 
    ceilingTexture.wrapS = THREE.RepeatWrapping;
    ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(8, 8); 
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        map: ceilingTexture,
        roughness: 0.8,
        side: THREE.BackSide 
    }); 

    const materials = [wallMaterial, wallMaterial, ceilingMaterial, floorMaterial, wallMaterial, wallMaterial]; 
    const room = new THREE.Mesh(roomGeometry, materials); 
    room.position.y = 4; 
    scene.add(room);

    // --- APPLICATION DES MOULURES SUR LES 4 MURS ---
    // On les place à 9.95 du centre pour qu'elles soient parfaitement plaquées contre les murs
    createWallMoldings(scene, 0, -9.95, 0);            // Mur du Fond
    createWallMoldings(scene, -9.95, 0, Math.PI / 2);  // Mur de Gauche
    createWallMoldings(scene, 9.95, 0, -Math.PI / 2);  // Mur de Droite
    createWallMoldings(scene, 0, 9.95, Math.PI);       // Mur de Devant

    // --- B. LES LAMPES AU PLAFOND ---
    createCeilingLamp(scene, -5, -5); 
    createCeilingLamp(scene, 5, -5); 
    createCeilingLamp(scene, -5, 5); 
    createCeilingLamp(scene, 5, 5); 

    // --- C. LES TABLEAUX D'EXPOSITION ---
    createPainting(scene, 'assets/textures/starry_night.jpg', 'Starry Night', 0, 4.5, -9.9, 0, 4, 3); 
    createPainting(scene, 'assets/textures/winter.png', 'Hiver', -9.9, 4.5, 0, Math.PI / 2, 4, 3);
    createPainting(scene, 'assets/textures/scream.jpg', 'Le Cri', 9.9, 4.5, 0, -Math.PI / 2, 4, 3);
    createPainting(scene, 'assets/textures/city.png', 'Ville', 0, 4.5, 9.9, Math.PI, 4, 3);

    // --- D. LES VISITEURS (PNJ) ---
    loadAnimatedNPC(scene, mixers, 'models/Standing idle (2).glb', 0, 0, -7, 0, -9.9, 1.5);
    loadAnimatedNPC(scene, mixers, 'models/Thinking.glb', -7, 0, 0, -9.9, 0, 1.1);
    loadAnimatedNPC(scene, mixers, 'models/Pointing.glb', 7, 0, 0, 9.9, 0, 0.6);
    
    const waypoints = [
        new THREE.Vector3(0, 0, -5), 
        new THREE.Vector3(5, 0, 0),  
        new THREE.Vector3(0, 0, 5),  
        new THREE.Vector3(-5, 0, 0)  
    ];
    loadPatrollingNPC(scene, mixers, movingNPCs, 'models/Walking.glb', 'models/Standing idle (3).glb', waypoints, 1.3);

    // --- LE BANC CENTRAL ET SON VISITEUR ---
    createBench(scene, 0, 0, 0);
    loadAnimatedNPC(scene, mixers, 'models/Sitting.glb', 0, 0.09, -0.3, 0, -9.9, 1.0);

    // --- E. LES PLANTES D'ORNEMENT (DANS LES 4 COINS) ---
    const plantPath = 'models/plant.glb';
    const plantScale = 1.2; 

    loadStaticDecoration(scene, plantPath, -8.8, -8.8, plantScale);
    loadStaticDecoration(scene, plantPath, 8.8, -8.8, plantScale);
    loadStaticDecoration(scene, plantPath, -8.8, 8.8, plantScale);
    loadStaticDecoration(scene, plantPath, 8.8, 8.8, plantScale);
}