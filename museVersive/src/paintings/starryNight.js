import * as THREE from 'three'

export function createStarryNight(scene, loader) {
    const objects = {}

    // BACKGROUND (Tout au fond)
    const bgTexture = loader.load('/assets/painting/starryNight/layers/starry_night-bg.png')
    bgTexture.colorSpace = THREE.SRGBColorSpace
    
    const bgMaterial = new THREE.MeshBasicMaterial({ 
        map: bgTexture 
    })
    
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(8, 9), bgMaterial)
    bg.position.z = -2 
    bg.renderOrder = 0 // Dessiné en 1er
    scene.add(bg)
    objects.bg = bg
    
    // Wave 
    const spiral1Texture = loader.load('/assets/painting/starryNight/layers/starry_night-wave1.png')
    spiral1Texture.colorSpace = THREE.SRGBColorSpace
    
    const spiral1Material = new THREE.MeshBasicMaterial({
        map: spiral1Texture,
        transparent: true,
        depthWrite: false
    })
    const spiral1Geometry = new THREE.PlaneGeometry(8, 7.7)

    const spiral1 = new THREE.Mesh(spiral1Geometry, spiral1Material)
    spiral1.position.x = -0.2
    spiral1.position.y = 0
    spiral1.position.z = -1.5 
    spiral1.scale.set(1.15, 1.15, 1)
    spiral1.renderOrder = 1   
    scene.add(spiral1)
    objects.spiral1 = spiral1

    // TREE (Au premier plan)
    const treeTexture = loader.load('/assets/painting/starryNight/layers/starry_night-tree.png')
    treeTexture.colorSpace = THREE.SRGBColorSpace
        
    const treeMaterial = new THREE.MeshBasicMaterial({
        map: treeTexture,
        transparent: true,
        depthWrite: false 
    })

    const treeGeometry = new THREE.PlaneGeometry(8, 7.7)
    treeGeometry.translate(0, 4.5, 0)
    
    const tree = new THREE.Mesh(treeGeometry, treeMaterial)
    tree.position.set(0, -4.5, -1) 
    tree.renderOrder = 2           
    scene.add(tree)
    objects.tree = tree

    return objects
}