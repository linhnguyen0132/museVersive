import * as THREE from 'three';
// 1. CORRECTION : Ajout de l'import du GLTFLoader pour les plantes
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

// Fonction pour charger un objet statique (déplacée ici pour la propreté)
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

export function createMuseum(scene, mixers, movingNPCs) {
    // --- A. LA STRUCTURE ---
    const roomGeometry = new THREE.BoxGeometry(20, 8, 20); 
    
    const textureLoader = new THREE.TextureLoader();
    
    // 1. Texture du sol (Parquet)
    const floorTexture = textureLoader.load('assets/textures/parquet1.jpg'); 
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(5, 5); 
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: floorTexture, 
        roughness: 0.6, 
        side: THREE.BackSide 
    }); 
    
    // 2. Couleur des murs
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: '#C4E2F5', 
        roughness: 0.9, 
        side: THREE.BackSide 
    }); 
    
    // 3. Texture du plafond
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

    // --- B. LES LAMPES AU PLAFOND ---
    createCeilingLamp(scene, -5, -5); 
    createCeilingLamp(scene, 5, -5); 
    createCeilingLamp(scene, -5, 5); 
    createCeilingLamp(scene, 5, 5); 

    // --- C. LES TABLEAUX D'EXPOSITION ---
    // 2. CORRECTION : Ajout des titres pour les plaques et Y monté à 4.5
    createPainting(scene, 'assets/textures/art1.jpg', 'Œuvre Numéro 1', 0, 4.5, -9.9, 0, 4, 3); 
    createPainting(scene, 'assets/textures/art2.jpg', 'Ma Peinture', -9.9, 4.5, 0, Math.PI / 2, 4, 3);
    createPainting(scene, 'assets/textures/art3.jpg', 'Art Abstrait', 9.9, 4.5, 0, -Math.PI / 2, 4, 3);
    createPainting(scene, 'assets/textures/art4.jpg', 'Paysage', 0, 4.5, 9.9, Math.PI, 4, 3);

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
    const plantScale = 1.2; // Ajuste ceci selon la taille de ton modèle de plante

    loadStaticDecoration(scene, plantPath, -8.8, -8.8, plantScale);
    loadStaticDecoration(scene, plantPath, 8.8, -8.8, plantScale);
    loadStaticDecoration(scene, plantPath, -8.8, 8.8, plantScale);
    loadStaticDecoration(scene, plantPath, 8.8, 8.8, plantScale);
}