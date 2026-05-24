export function animateScream(objects, time) {
    // FIGURE
    const figure = objects.figure

    // respiration
    figure.scale.y =
        1 + Math.sin(time * 3) * 0.02

    // vibration anxieuse
    figure.position.x =
        Math.sin(time * 20) * 0.02

    // légère rotation
    figure.rotation.z =
        Math.sin(time * 2) * 0.01

    // SKY 1
    const sky1 = objects.sky1
    const baseY = -0.13
    // légère vibration
    sky1.position.x =
        Math.sin(time * 0.3) * 0.01

    sky1.position.y =
    baseY +
    Math.sin(time * 0.8) * 0.03
        
    sky1.rotation.z =
    Math.sin(time * 0.2) * 0.003


    //sky1.scale.x =
    //1 + Math.sin(time * 0.5) * 0.01

    objects.sky1Material.uniforms.uTime.value =
    time
}