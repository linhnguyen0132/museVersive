import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createCeilingLamp } from './lighting.js';
import { createPainting } from './artworks.js';
import { loadAnimatedNPC, loadPatrollingNPC } from './npc.js';

function createBench(scene, x, z, rotationY) {
    const benchGroup = new THREE.Group();

    const seatGeo = new THREE.BoxGeometry(2, 0.1, 0.6);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.y = 0.40; 
    seat.castShadow = true;
    seat.receiveShadow = true;
    benchGroup.add(seat);

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
        console.error('Erreur chargement décoration :', error);
    });
}

function createWallMoldings(scene, x, z, rotationY) {
    const wallGroup = new THREE.Group();
    const moldingMat = new THREE.MeshStandardMaterial({ color: '#C4E2F5', roughness: 0.5 });
    const depth = 0.05; 
    const thick = 0.08; 

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

    drawRect(0, 4.5, 5.5, 4.5);
    drawRect(-6, 4.5, 4, 4.5);
    drawRect(6, 4.5, 4, 4.5);
    drawRect(0, 1.2, 5.5, 1.5);
    drawRect(-6, 1.2, 4, 1.5);
    drawRect(6, 1.2, 4, 1.5);

    const plinthe = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, depth * 1.5), moldingMat);
    plinthe.position.set(0, 0.15, 0);
    wallGroup.add(plinthe);

    const cimaise = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, depth * 1.8), moldingMat);
    cimaise.position.set(0, 2.2, 0);
    wallGroup.add(cimaise);

    wallGroup.position.set(x, 0, z);
    wallGroup.rotation.y = rotationY;
    scene.add(wallGroup);
}

export function createMuseum(scene, mixers, movingNPCs) {
    const roomGeometry = new THREE.BoxGeometry(20, 8, 20); 
    const textureLoader = new THREE.TextureLoader();
    
    const floorTexture = textureLoader.load('assets/textures/parquet1.jpg'); 
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(5, 5); 
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: floorTexture, roughness: 0.6, side: THREE.BackSide 
    }); 
    
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: '#C4E2F5', roughness: 0.9, side: THREE.BackSide 
    }); 
    
    const ceilingTexture = textureLoader.load('assets/textures/ceiling_white.jpg'); 
    ceilingTexture.wrapS = THREE.RepeatWrapping;
    ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(8, 8); 
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, map: ceilingTexture, roughness: 0.8, side: THREE.BackSide 
    }); 

    const materials = [wallMaterial, wallMaterial, ceilingMaterial, floorMaterial, wallMaterial, wallMaterial]; 
    const room = new THREE.Mesh(roomGeometry, materials); 
    room.position.y = 4; 
    scene.add(room);

    createWallMoldings(scene, 0, -9.95, 0);            
    createWallMoldings(scene, -9.95, 0, Math.PI / 2);  
    createWallMoldings(scene, 9.95, 0, -Math.PI / 2);  
    createWallMoldings(scene, 0, 9.95, Math.PI);       

    createCeilingLamp(scene, -5, -5); 
    createCeilingLamp(scene, 5, -5); 
    createCeilingLamp(scene, -5, 5); 
    createCeilingLamp(scene, 5, 5);
    createCeilingLamp(scene, 0, 0);

    // CRÉATION DES TABLEAUX ET ENREGISTREMENT DANS LA LISTE
    const paintings = []; 
<<<<<<< HEAD
    paintings.push(createPainting(scene, 'assets/textures/starry_night.jpg', 'La Nuit étoilée', 0, 4.5, -9.9, 0, 4, 3));
    paintings.push(createPainting(scene, 'assets/textures/winter.png', 'Chasseurs dans la neige', -9.9, 4.5, 0, Math.PI / 2, 4, 3));
    paintings.push(createPainting(scene, 'assets/textures/scream.jpg', 'Le Cri', 9.9, 4.5, 0, -Math.PI / 2, 4, 3));
    paintings.push(createPainting(scene, 'assets/textures/city.png', 'Le Café de nuit', 0, 4.5, 9.9, Math.PI, 4, 3));
=======
    paintings.push(createPainting(scene, 'assets/textures/starry_night.jpg', 'Starry Night', 0, 4.5, -9.9, 0, 4, 3)); 
    paintings.push(createPainting(scene, 'assets/textures/winter.png', 'March in the Birch Woods', -9.9, 4.5, 0, Math.PI / 2, 4, 3));
    paintings.push(createPainting(scene, 'assets/textures/scream.jpg', 'The Scream', 9.9, 4.5, 0, -Math.PI / 2, 4, 3));
    paintings.push(createPainting(scene, 'assets/textures/city.png', 'City Hall at Thorn', 0, 4.5, 9.9, Math.PI, 4, 3));
>>>>>>> 92d5c9528fc91d4168d7ed9bd9eb9643514c4c1c

    // PNJ
    loadAnimatedNPC(scene, mixers, 'models/Standing idle (2).glb', 0, 0, -7, 0, -9.9, 1.5);
    loadAnimatedNPC(scene, mixers, 'models/Thinking.glb', -7, 0, 0, -9.9, 0, 1.1);
    loadAnimatedNPC(scene, mixers, 'models/Pointing.glb', 7, 0, 0, 9.9, 0, 0.6);
    
    const waypoints = [
        new THREE.Vector3(0, 0, -5), new THREE.Vector3(5, 0, 0),  
        new THREE.Vector3(0, 0, 5), new THREE.Vector3(-5, 0, 0)  
    ];
    loadPatrollingNPC(scene, mixers, movingNPCs, 'models/Walking.glb', 'models/Standing idle (3).glb', waypoints, 1.3);

    // DÉCORATIONS
    createBench(scene, 0, 0, 0);
    loadAnimatedNPC(scene, mixers, 'models/Sitting.glb', 0, 0.09, -0.3, 0, -9.9, 1.0);

    const plantPath = 'models/plant2.glb';
    const plantScale = 1.2; 
    loadStaticDecoration(scene, plantPath, -8.8, -8.8, plantScale);
    loadStaticDecoration(scene, plantPath, 8.8, -8.8, plantScale);
    loadStaticDecoration(scene, plantPath, -8.8, 8.8, plantScale);
    loadStaticDecoration(scene, plantPath, 8.8, 8.8, plantScale);

    return paintings;
}