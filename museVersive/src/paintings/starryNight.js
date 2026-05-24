import * as THREE from 'three'

export function createStarryNight(scene, loader) {

    const objects = {}

    // ======================
    // SKY DOME
    // ======================

    const panoTexture =
        loader.load(
            '/assets/panoramas/starry_night-pano.jpg'
        )

    panoTexture.colorSpace =
        THREE.SRGBColorSpace

    const geometry =
        new THREE.SphereGeometry(
            500,
            60,
            40,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2
        )

    const material =
        new THREE.MeshBasicMaterial({
            map: panoTexture,
            side: THREE.BackSide
        })

    const dome =
        new THREE.Mesh(
            geometry,
            material
        )

    scene.add(dome)

    objects.dome = dome

    // ======================
    // FLOOR
    // ======================

    const floorGeometry =
        new THREE.CircleGeometry(
            30,
            64
        )

    const floorMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x1a2a44
        })

    const floor =
        new THREE.Mesh(
            floorGeometry,
            floorMaterial
        )

    floor.rotation.x =
        -Math.PI / 2

    floor.position.y =
        -5

    scene.add(floor)

    objects.floor = floor

    // ======================
    // TREE FOREGROUND
    // ======================

//    const treeTexture =
//        loader.load(
//            '/assets/painting/starryNight/layers/starry_night-tree.png'
//        )

//    treeTexture.colorSpace =
//        THREE.SRGBColorSpace
        
//    const treeMaterial =
//        new THREE.MeshBasicMaterial({
//            map: treeTexture,
//            transparent: true,
//            depthWrite: false
//        })

//    const treeGeometry =
//        new THREE.PlaneGeometry(
//            8,
//            7.7
//        )

//    treeGeometry.translate(
//        0.4,
//        4.5,
//        0
//    )
    
//    const tree =
//        new THREE.Mesh(
//            treeGeometry,
//            treeMaterial
//        )

//    tree.position.set(
//        0,
//        -4.5,
//        -1
//    )

//    tree.renderOrder = 2

//    scene.add(tree)

//    objects.tree = tree

    return objects
}