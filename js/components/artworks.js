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

// NOUVELLE VERSION : Avec le paramètre "title" inclus !
export function createPainting(scene, imagePath, title, x, y, z, rotationY, width, height) {
    const paintingGroup = new THREE.Group();

    // 1. Le Cadre (doré et légèrement plus grand que la toile)
    const frameThickness = 0.3;
    const frameGeo = new THREE.BoxGeometry(width + frameThickness, height + frameThickness, 0.1);
    const frameMat = new THREE.MeshStandardMaterial({ 
        color: 0xd4af37, // Or antique
        metalness: 0.6, 
        roughness: 0.4 
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.z = -0.05; // On recule le cadre pour laisser la toile dépasser
    frame.castShadow = true;
    paintingGroup.add(frame);

    // 2. La Toile (avec ton image)
    const canvasGeo = new THREE.BoxGeometry(width, height, 0.05);
    const textureLoader = new THREE.TextureLoader();
    
    // Chargement de l'image
    const texture = textureLoader.load(
        imagePath,
        undefined, 
        undefined,
        (err) => console.error("⚠️ Image introuvable :", imagePath) 
    );
    texture.colorSpace = THREE.SRGBColorSpace; // Garde les vraies couleurs de l'image
    
    const canvasMat = new THREE.MeshStandardMaterial({ 
        map: texture, 
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
    
    // On positionne la plaque juste en dessous du cadre
    plaque.position.y = -(height / 2) - 0.4;
    paintingGroup.add(plaque);

    // Positionnement complet du groupe sur le mur
    paintingGroup.position.set(x, y, z);
    paintingGroup.rotation.y = rotationY;

    scene.add(paintingGroup);
}