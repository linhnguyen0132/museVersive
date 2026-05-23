import * as THREE from 'three'

// Shaders pour les sky
import vertexShader
from '../shaders/skyVertex.glsl'

import fragmentShader
from '../shaders/skyFragment.glsl'

export function createScream(scene, loader) {
    const objects = {}

    // BACKGROUND
    const bgTexture =
        loader.load('/assets/painting/theScream/layers/the-scream-bg-test.png')
        
    bgTexture.colorSpace =
        THREE.SRGBColorSpace
    const bgMaterial =
        new THREE.MeshBasicMaterial({
            map: bgTexture
        })
    const bg =
        new THREE.Mesh(
            new THREE.PlaneGeometry(8, 9),
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
            new THREE.PlaneGeometry(6,6),
            figureMaterial
        )

    figure.position.z = 2

    scene.add(figure)

    objects.figure = figure

    // SKY 1
    const sky1 = loader.load('/assets/painting/theScream/layers/the-scream-sky1.png')

    

    const sky1Material =
    new THREE.ShaderMaterial({

        uniforms: {

            uTime: { value: 0 },

            uTexture: {
                value: sky1
            }
        },

        vertexShader,
        fragmentShader,

        transparent: true
    })

    const sky1Mesh =
        new THREE.Mesh(
            new THREE.PlaneGeometry(4,5),
            sky1Material
        )
    sky1Mesh.position.y = -0.13
    sky1Mesh.position.z = 2
    scene.add(sky1Mesh)
    
    objects.sky1 = sky1Mesh
    objects.sky1Material = sky1Material
    return objects
}