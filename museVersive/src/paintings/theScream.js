import * as THREE from 'three'

export function createScream(scene, loader) {
    const objects = {}

    // BACKGROUND
    const bgTexture =
        loader.load('/assets/painting/theScream/the-scream.jpg')
        
    bgTexture.colorSpace =
        THREE.SRGBColorSpace
    const bgMaterial =
        new THREE.MeshBasicMaterial({
            map: bgTexture
        })
    const bg =
        new THREE.Mesh(
            new THREE.PlaneGeometry(8, 12),
            bgMaterial
        )
    bg.position.z = -1
    scene.add(bg)
    objects.bg = bg
    
    // FIGURE
    const figureTexture =
        loader.load('/assets/painting/theScream/layers/the-scream-person.png')

    figureTexture.colorSpace =
        THREE.SRGBColorSpace
        
    const figureMaterial =
        new THREE.MeshBasicMaterial({
            map: figureTexture,
            transparent: true
        })

    const figure =
        new THREE.Mesh(
            new THREE.PlaneGeometry(8, 8),
            figureMaterial
        )

    figure.position.z = 2

    scene.add(figure)

    objects.figure = figure

    // SKY 1
    const sky1 = loader.load('/assets/painting/theScream/layers/the-scream-sky1.png')

    sky1.colorSpace =
        THREE.SRGBColorSpace
    const sky1Material =
        new THREE.MeshBasicMaterial({
            map: sky1,
            transparent: true,
            side: THREE.DoubleSide
        })
    const sky1Mesh =
        new THREE.Mesh(
            new THREE.PlaneGeometry(8, 12),
            sky1Material
        )
    sky1Mesh.position.z = 2
    scene.add(sky1Mesh)
    objects.sky1 = sky1Mesh

    return objects
}