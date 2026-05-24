// js/components/artworks.js
import * as THREE from 'three';

// Fonction pour dessiner du texte sur une plaque et la transformer en texture
function createPlaqueTexture(title) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    // Fond de la plaque (couleur laiton/or)
    context.fillStyle = '#d4af37';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Bordure
    context.strokeStyle = '#8a6327';
    context.lineWidth = 10;
    context.strokeRect(0, 0, canvas.width, canvas.height);

    // Texte (Nom de l'œuvre)
    context.font = 'bold 36px Arial';
    context.fillStyle = '#111111';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(title, canvas.width / 2, canvas.height / 2);

    return new THREE.CanvasTexture(canvas);
}

export function createPainting(scene, imagePath, title, x, y, z, rotationY, width, height) {
    const paintingGroup = new THREE.Group();
    
    // On initialise le chargeur de textures une seule fois en haut
    const textureLoader = new THREE.TextureLoader();

    // 1. Le Cadre (NOUVEAU : Avec ta texture)
    const frameThickness = 0.3;
    const frameGeo = new THREE.BoxGeometry(width + frameThickness, height + frameThickness, 0.1);
    
    // Chargement de l'image de ton motif de cadre
    const frameTexture = textureLoader.load(
        'assets/textures/cadre.jpg', 
        undefined, undefined,
        (err) => console.error("⚠️ Texture du cadre introuvable : assets/textures/cadre.jpg")
    );
    
    // On répète un peu la texture pour qu'elle ne soit pas floue ou trop étirée
    frameTexture.wrapS = THREE.RepeatWrapping;
    frameTexture.wrapT = THREE.RepeatWrapping;
    frameTexture.repeat.set(2, 2); 

    const frameMat = new THREE.MeshStandardMaterial({ 
        map: frameTexture, 
        color: 0xffffff, // Blanc pour ne pas altérer les couleurs de ton image
        metalness: 0.2,  // Mets 0.7 ici si ton image est métallique (or/argent)
        roughness: 0.6 
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.z = -0.05; 
    frame.castShadow = true;
    paintingGroup.add(frame);

    // 2. La Toile (avec ton image d'art)
    const canvasGeo = new THREE.BoxGeometry(width, height, 0.05);
    const canvasTexture = textureLoader.load(
        imagePath,
        undefined, undefined,
        (err) => console.error("⚠️ Image d'art introuvable :", imagePath) 
    );
    canvasTexture.colorSpace = THREE.SRGBColorSpace; 
    
    const canvasMat = new THREE.MeshStandardMaterial({ 
        map: canvasTexture, 
        roughness: 0.8 
    });
    const canvas = new THREE.Mesh(canvasGeo, canvasMat);
    paintingGroup.add(canvas);

    // 3. La Plaque avec le nom
    const plaqueGeo = new THREE.BoxGeometry(width * 0.6, 0.4, 0.05);
    const plaqueTex = createPlaqueTexture(title);
    const plaqueMat = new THREE.MeshStandardMaterial({ 
        map: plaqueTex,
        metalness: 0.5,
        roughness: 0.4
    });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.y = -(height / 2) - 0.4;
    paintingGroup.add(plaque);

    // Positionnement complet du groupe sur le mur
    paintingGroup.position.set(x, y, z);
    paintingGroup.rotation.y = rotationY;

    scene.add(paintingGroup);
}