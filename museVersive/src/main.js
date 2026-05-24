import * as THREE from 'three'

import { createScream }
from './paintings/theScream.js'

import { animateScream }
from './animations/animations_scream.js'

import { OrbitControls }
from 'three/examples/jsm/controls/OrbitControls.js'

const scene = new THREE.Scene()

const camera =
    new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    )

camera.position.z = 5

const renderer =
    new THREE.WebGLRenderer()

renderer.setSize(
    window.innerWidth,
    window.innerHeight
)
renderer.outputColorSpace =
    THREE.SRGBColorSpace
document.body.appendChild(renderer.domElement)

const loader =
    new THREE.TextureLoader()

const screamObjects =
    createScream(scene, loader)

const clock =
    new THREE.Clock()
const light =
    new THREE.DirectionalLight(
        0xffffff,
        2
    )

light.position.set(2, 2, 5)

scene.add(light)

const ambient =
    new THREE.AmbientLight(
        0xffffff,
        0.5
    )

scene.add(ambient)
function animate() {

    requestAnimationFrame(animate)
    
    const t =
        clock.getElapsedTime()
    animateScream(screamObjects, t)

    renderer.render(scene, camera)
}

animate()

