import * as THREE from 'three'

import { createStarryNight }
from './paintings/starryNight.js'

import { animateStarryNight }
from './animations/animations_starryNight.js'

import { OrbitControls }
from 'three/examples/jsm/controls/OrbitControls.js'

// ======================
// SCENE
// ======================

const scene = new THREE.Scene()

// ======================
// CAMERA
// ======================

const camera =
    new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    )

camera.position.set(0, 0, 0.1)

// ======================
// RENDERER
// ======================

const renderer =
    new THREE.WebGLRenderer({
        antialias: true
    })

renderer.setSize(
    window.innerWidth,
    window.innerHeight
)

renderer.outputColorSpace =
    THREE.SRGBColorSpace

document.body.appendChild(
    renderer.domElement
)

// ======================
// CONTROLS
// ======================

const controls =
    new OrbitControls(
        camera,
        renderer.domElement
    )

controls.enableZoom = true
controls.enablePan = false

controls.enableDamping = true
controls.dampingFactor = 0.05

controls.rotateSpeed = -0.3

// direction regardée
controls.target.set(0, 0, -1)

// limites zoom
controls.minDistance = 0.1
controls.maxDistance = 5

// ======================
// TEXTURE LOADER
// ======================

const loader =
    new THREE.TextureLoader()

// ======================
// STARry NIGHT
// ======================

const starryNightObjects =
    createStarryNight(
        scene,
        loader
    )

// ======================
// LIGHTS
// ======================

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

// ======================
// CLOCK
// ======================

const clock =
    new THREE.Clock()

// ======================
// RESIZE
// ======================

window.addEventListener(
    'resize',
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight

        camera.updateProjectionMatrix()

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        )
    }
)

// ======================
// OPTIONAL WASD MOVEMENT
// ======================

window.addEventListener(
    'keydown',
    (e) => {

        const speed = 0.5

        if(e.key === 'w') {
            camera.position.z -= speed
        }

        if(e.key === 's') {
            camera.position.z += speed
        }

        if(e.key === 'a') {
            camera.position.x -= speed
        }

        if(e.key === 'd') {
            camera.position.x += speed
        }
    }
)

// ======================
// ANIMATION LOOP
// ======================

function animate() {

    requestAnimationFrame(animate)

    const t =
        clock.getElapsedTime()

    animateStarryNight(
        starryNightObjects,
        t
    )

    controls.update()

    renderer.render(
        scene,
        camera
    )
}

animate()